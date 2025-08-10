// handlers/message/dispatcher.js
const path = require('path');
const NodeCache = require('node-cache');
const rate = new NodeCache({ stdTTL: 2, checkperiod: 2 }); // simple cooldown

function jidToNum(j){ return String(j||'').split('@')[0].replace(/[^0-9]/g,''); }

async function hasRole(level, { sock, jid, sender, CONFIG }){
  // Level: 1 alluser, 2 group admin, 3 moderator, 4 owner
  if (level <= 1) return true;
  const num = '+' + jidToNum(sender || '');
  // owners
  const owners = Array.isArray(CONFIG.owner) ? CONFIG.owner : [CONFIG.owner].filter(Boolean);
  if (level >= 4 && owners.includes(num)) return true;
  if (level >= 4) return false;
  // moderators
  if (level >= 3){
    const modStore = require('../../utils/modStore');
    const mods = await modStore.list(CONFIG.moderators);
    if (mods.includes(num)) return true;
    if (level >= 3) return false;
  }
  // group admin
  if (level >= 2){
    if (!jid.endsWith('@g.us')) return false;
    const meta = await sock.groupMetadata(jid);
    const isAdmin = (meta.participants||[]).some(p => p.id === sender && p.admin);
    return Boolean(isAdmin);
  }
  return true;
}

module.exports = async function dispatch({ sock, m, jid, text, CONFIG, commands, volatileCommands, logger, helpers }){
  // Approval guard
  const approval = require('../../utils/approvalStore');
  if (jid.endsWith('@g.us')){
    const ok = await approval.isApproved(jid);
    if (!ok){
      // allow only owner control cmds like pnd (handled by prefix true and role 4 on that command)
      // otherwise ignore silently
      // console.log('Pending group message ignored:', jid);
    }
  }

  // Effective prefix
  const pfStore = require('../../utils/prefixStore');
  let effectivePrefix = CONFIG.prefix || '/';
  if (jid.endsWith('@g.us')){
    try {
      const pfx = await pfStore.getPrefixFor(jid);
      if (pfx && pfx.prefix) effectivePrefix = pfx.prefix;
    } catch {}
  }

  // Parse command (with or without prefix depending on command flag)
  let name = null, args = [];
  const usedPrefix = text.startsWith(effectivePrefix);
  if (usedPrefix){
    const parts = text.slice(effectivePrefix.length).trim().split(/\s+/);
    name = (parts[0]||'').toLowerCase(); args = parts.slice(1);
  } else {
    const parts = text.trim().split(/\s+/);
    name = (parts[0]||'').toLowerCase(); args = parts.slice(1);
  }
  // Resolve
  let cmd = volatileCommands.get(name) || commands.get(name);
  if (!cmd){
    // try aliases
    for (const c of [...volatileCommands.values(), ...commands.values()]){
      if (Array.isArray(c.aliases) && c.aliases.map(a=>String(a).toLowerCase()).includes(name)){ cmd = c; break; }
    }
  }
  if (!cmd) return;

  // Prefix policy: default true
  const needsPrefix = (cmd.prefix !== false);
  if (needsPrefix && !usedPrefix) return;

  // Rate limit (user+cmd)
  const rateKey = `${name}:${jid}:${m.key.participant || m.key.remoteJid}`;
  if (rate.get(rateKey)) return;
  rate.set(rateKey, 1);

  // Role check
  let requiredRole = 1;
  if (typeof cmd.role === 'number') requiredRole = cmd.role;
  else if (typeof cmd.role === 'string'){ const map = {alluser:1, admin:2, mod:3, owner:4}; requiredRole = map[cmd.role] || 1; }

  // Dynamic override from store
  try {
    const roleStore = require('../../utils/roleStore');
    const over = await roleStore.get(cmd.name);
    if (typeof over === 'number') requiredRole = over;
  } catch {}

  const sender = m.key.participant || m.key.remoteJid;
  const ok = await hasRole(requiredRole, { sock, jid, sender, CONFIG });
  if (!ok){
    const roleName = {1:'alluser',2:'admin',3:'moderator',4:'owner'}[requiredRole] || requiredRole;
    return sock.sendMessage(jid, { text: `❌ Minimum role required: ${requiredRole} (${roleName})` }, { quoted: m });
  }

  // Execute
  try {
    await cmd.run({ sock, m, jid, args, text, CONFIG, logger, commands, helpers });
  } catch (e){
    logger?.error?.(e);
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
}
