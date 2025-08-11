// handlers/message/dispatcher.js
const NodeCache = require('node-cache');
const rate = new NodeCache({ stdTTL: 2, checkperiod: 2 });

function jidToNum(j){ return String(j||'').split('@')[0].replace(/[^0-9]/g,''); }

async function hasRole(level, { sock, jid, sender, CONFIG }){
  if (level <= 1) return true;
  const num = '+' + jidToNum(sender || '');

  const owners = Array.isArray(CONFIG.owner) ? CONFIG.owner : [CONFIG.owner].filter(Boolean);
  if (level === 4) return owners.includes(num);

  if (level >= 3){
    try {
      const modStore = require('../../utils/modStore');
      const mods = await modStore.list(CONFIG.moderators);
      if (!mods.includes(num)) return false;
    } catch { return false; }
  }

  if (level >= 2){
    if (!jid.endsWith('@g.us')) return false;
    try {
      const meta = await sock.groupMetadata(jid);
      const isAdmin = (meta?.participants||[]).some(p => p.id === sender && p.admin);
      return Boolean(isAdmin);
    } catch { return false; }
  }
  return true;
}

module.exports = async function dispatch({ sock, m, jid, text, CONFIG, commands, volatileCommands, logger, helpers }){
  // Approval guard
  try {
    if (jid.endsWith('@g.us')){
      const approval = require('../../utils/approvalStore');
      const ok = await approval.isApproved(jid);
      if (!ok) return;
    }
  } catch {}

  // Effective prefix
  let effectivePrefix = CONFIG.prefix || '/';
  try {
    if (jid.endsWith('@g.us')){
      const pfStore = require('../../utils/prefixStore');
      const pfx = await pfStore.getPrefixFor(jid);
      if (pfx && pfx.prefix) effectivePrefix = pfx.prefix;
    }
  } catch {}

  // Parse
  let name = null, args = [];
  const usedPrefix = typeof text === 'string' && text.startsWith(effectivePrefix);
  const parts = (usedPrefix ? text.slice(effectivePrefix.length) : text).trim().split(/\s+/);
  name = (parts[0]||'').toLowerCase(); args = parts.slice(1);
  if (!name) return;

  // Normalize registries to safe array of objects
  const allCmds = [
    ...Array.from(volatileCommands?.values?.() || []),
    ...Array.from(commands?.values?.() || [])
  ].filter(c => c && typeof c === 'object' && typeof c.name === 'string');

  // Resolve exact name
  let cmd = allCmds.find(c => String(c.name).toLowerCase() === name);

  // Resolve via aliases (safely)
  if (!cmd){
    for (const c of allCmds){
      const aliasesArr = Array.isArray(c.aliases) ? c.aliases : [];
      for (const a of aliasesArr){
        if (String(a).toLowerCase() === name){ cmd = c; break; }
      }
      if (cmd) break;
    }
  }
  if (!cmd) return;

  // Prefix policy
  const needsPrefix = (cmd.prefix !== false);
  if (needsPrefix && !usedPrefix) return;

  // Rate limit
  const rateKey = `${cmd.name}:${jid}:${m.key.participant || m.key.remoteJid}`;
  if (rate.get(rateKey)) return;
  rate.set(rateKey, 1);

  // Role
  let requiredRole = 1;
  if (typeof cmd.role === 'number') requiredRole = cmd.role;
  else if (typeof cmd.role === 'string'){
    const map = { alluser:1, user:1, admin:2, mod:3, moderator:3, owner:4 };
    requiredRole = map[cmd.role.toLowerCase()] || 1;
  }

  // Dynamic override
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

  try {
    await cmd.run({ sock, m, jid, args, text, CONFIG, logger, commands, helpers });
  } catch (e){
    logger?.error?.(e);
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
}
