// commands/core/help.js
const os = require('os');

module.exports = {
  name: "help",
  aliases: ["menu"],
  role: 1,
  prefix: true,
  desc: "Show grouped command list",
  usage: "/help",
  run: async ({ sock, m, jid, CONFIG, commands = new Map() }) => {
    const sender = m.key?.participant || m.key?.remoteJid || jid;
    const pushName = (m.pushName && m.pushName.trim()) || "there";

    const all = Array.isArray(commands) ? commands : Array.from(commands.values());

    // bucket by category (tools, group, admin, fun, system)
    const buckets = new Map();
    const titleMap = {
      tools: "Tools",
      group: "Group",
      admin: "Admin",
      fun: "Fun",
      system: "System"
    };
    const roleBadge = (c)=>`[${typeof c.role==='number'?c.role:1}]`;

    for (const c of all) {
      if (!c || typeof c !== 'object') continue;
      const name = c.name || 'unknown';
      const desc = c.desc || '';
      const cat = (c.category || 'tools').toLowerCase();
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.set(cat, (buckets.get(cat) || []).concat([{ name, desc, role: c.role||1 }]));
    }

    const blocks = [];
    for (const key of ["tools","group","admin","fun","system"]) {
      const items = buckets.get(key) || [];
      if (!items.length) continue;
      blocks.push(`*${titleMap[key]}*`);
      for (const it of items) {
        blocks.push(`╭─❍ *${it.name}* ${roleBadge(it)}\n> Description: ${it.desc}\n╰───────────⟡`);
      }
      blocks.push('');
    }

    const t0 = Date.now();
    try { await sock.sendPresenceUpdate('composing', jid); } catch {}
    const pingMs = Math.max(0, Date.now() - t0);
    const osLine = `OS: ${os.type() === 'Linux' ? 'Linux' : os.platform()} ${os.release()}`;
    const header = `Hello there @${pushName}!\n\nHere are the available commands you can explore:\n\n`;
    const footer = `Current system prefix: ${CONFIG?.prefix || '/'}\nPing: ${pingMs}ms\n${osLine}\n\n> Thank you for using IRFAN bot`;

    const text = [header, ...blocks, footer].join('\n');
    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: m });
  }
};
