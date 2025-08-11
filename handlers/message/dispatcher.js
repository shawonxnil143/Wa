// handlers/message/dispatcher.js (debug-enhanced)
// The dispatcher uses NodeCache to implement a simple rate limiter. If
// node-cache is not installed (e.g. during offline development) fall back
// to a minimal in‑memory implementation. The fallback exposes `get` and
// `set` methods with the same API but no expiry logic.
let NodeCache;
try {
  NodeCache = require('node-cache');
} catch {
  NodeCache = class {
    constructor() { this.map = new Map(); }
    get(key) { return this.map.get(key); }
    set(key, value) { this.map.set(key, value); }
  };
}
const rate = new NodeCache({ stdTTL: 2, checkperiod: 2 });

function jidToNum(j){ return String(j||'').split('@')[0].replace(/[^0-9]/g,''); }
const DBG = !!process.env.DEBUG_BOT;

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
  if (DBG) logger?.info?.({ tag: 'dispatch:enter', jid, text });

  // Approval guard: hard silent for unapproved groups. 
  try {
    if (jid.endsWith('@g.us')) {
      const approval = require('../../utils/approvalStore');
      const ok = await approval.isApproved(jid);
      if (!ok) {
        // Record as pending (no outward messages)
        try {
          const meta = await sock.groupMetadata(jid).catch(() => null);
          await approval.addPending(jid, { name: meta?.subject });
        } catch {}
        // Parse command name (if any)
        const usedPrefix = helpers?.detectPrefix ? helpers.detectPrefix(text, CONFIG?.prefix) : (text?.startsWith(CONFIG?.prefix||'/') ? (CONFIG?.prefix||'/') : '');
        const name = usedPrefix ? String(text.slice(usedPrefix.length).split(/\s+/)[0]||'').toLowerCase() : '';
        // Allow only owner/admin to run approve/pnd in unapproved groups
        const allowList = new Set(['approve','pnd']);
        let privileged = false;
        try {
          // owner check
          const owners = Array.isArray(CONFIG?.owner) ? CONFIG.owner : String(CONFIG?.owner||'').split(',').map(s=>s.trim()).filter(Boolean);
          const senderRaw = (m.key?.participant || m.participant || m.sender || '').split(':')[0];
          const senderNum = senderRaw.replace(/\D/g, '');
          privileged = owners.some(o => o.replace(/\D/g,'') === senderNum);
          // admin check
          if (!privileged) {
            const meta = await sock.groupMetadata(jid).catch(() => null);
            const admins = (meta?.participants||[]).filter(p => p.admin).map(p => (p.id||p.jid||p.user||'')).map(x => String(x).split('@')[0]);
            privileged = admins.includes(senderNum);
          }
        } catch {}
        if (!(privileged && allowList.has(name))) {
          return; // stay silent
        }
      }
    }
  } catch {}
}
        // Notify users that the bot is disabled until approved. Use a simple
        // rate limit so we don't spam the group on every message. NodeCache
        // supports TTL when available. The fallback implementation ignores it
        // but still stores the key so the message is sent only once per session.
        const prefix = CONFIG.prefix || '/';
        const promptKey = `approvalPrompt:${jid}`;
        if (!rate.get(promptKey)) {
          rate.set(promptKey, 1);
          try {
            await sock.sendMessage(jid, {
              text: `❌ This group is not approved for the bot. Please ask the bot owner to type \`${prefix}approve\` in this group to enable it.`,
            });
          } catch {}
        }
        if (DBG) logger?.info?.({ tag: 'dispatch:blocked_pend_approval', jid });
        return;
      }
    }
  } catch (e) {
    if (DBG) logger?.warn?.({ tag: 'dispatch:approval_error', err: e?.message });
  }

  // Effective prefix
  let effectivePrefix = CONFIG.prefix || '/';
  try {
    if (jid.endsWith('@g.us')){
      const pfStore = require('../../utils/prefixStore');
      const pfx = await pfStore.getPrefixFor(jid);
      if (pfx && pfx.prefix) effectivePrefix = pfx.prefix;
    }
  } catch (e){ if (DBG) logger?.warn?.({ tag:'dispatch:prefix_error', err:e?.message }); }

  if (typeof text !== 'string' || !text.trim()) return;
  const usedPrefix = text.startsWith(effectivePrefix);
  const parts = (usedPrefix ? text.slice(effectivePrefix.length) : text).trim().split(/\s+/);
  const name = (parts[0]||'').toLowerCase();
  const args = parts.slice(1);
  if (DBG) logger?.info?.({ tag:'dispatch:parsed', name, usedPrefix, effectivePrefix });

  if (!name) return;

  // Build safe registry
  const allCmds = [
    ...Array.from(volatileCommands?.values?.() || []),
    ...Array.from(commands?.values?.() || [])
  ].filter(c => c && typeof c === 'object' && typeof c.name === 'string');

  if (DBG) logger?.info?.({ tag:'dispatch:registry', count: allCmds.length });

  // Resolve by name
  let cmd = allCmds.find(c => String(c.name).toLowerCase() === name);
  // Resolve by aliases
  if (!cmd){
    for (const c of allCmds){
      const aliasesArr = Array.isArray(c.aliases) ? c.aliases : [];
      for (const a of aliasesArr){
        if (String(a).toLowerCase() === name){ cmd = c; break; }
      }
      if (cmd) break;
    }
  }
  if (!cmd){ if (DBG) logger?.info?.({ tag:'dispatch:no_command', name }); return; }

  // Prefix policy
  const needsPrefix = (cmd.prefix !== false);
  if (needsPrefix && !usedPrefix){ if (DBG) logger?.info?.({ tag:'dispatch:needs_prefix', name }); return; }

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

  if (DBG) logger?.info?.({ tag:'dispatch:exec', cmd: cmd.name, args });

  try {
    const context = { sock, m, jid, args, text, CONFIG, logger, commands, helpers };
    if (typeof cmd.init === 'function'){ try { await cmd.init(context); } catch {} }
    await cmd.run(context);
  } catch (e){
    try { logger?.error?.(e); } catch {}
    await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
      }
