
// commands/core/help.js
const os = require('os');
module.exports = {
  usage: '',
  role: 1,
  name: "help",
  aliases: ["menu"],
  prefix: true,
  desc: "Show grouped command list",
  run: async ({ sock, m, jid, CONFIG, commands = new Map()
}) => {
    const sender = m.key?.participant || m.key?.remoteJid || jid;
    const pushName = (m.pushName && m.pushName.trim()) || "there";

    const all = Array.isArray(commands) ? commands : Array.from(commands.values());
    const wantedOrder = ["tools", "group", "admin", "fun", "system"];
    const buckets = new Map(wantedOrder.map(k => [k, []]));

    for (const c of all) {
      const cat = (c.category || "system").toLowerCase();
      const name = c.name || "unknown";
      const desc = c.desc || "No description";
      buckets.set(cat, (buckets.get(cat) || []).concat([{ name, desc, role: c.role||1 }]));
    }

    const blocks = [];
    const roleBadge = (c)=>`[${typeof c.role==='number'?c.role:1}]`;
    const titleMap = { tools:"TOOLS", group:"GROUP", admin:"ADMIN", fun:"FUN", system:"SYSTEM" };
    for (const key of wantedOrder) {
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
    const header = `Hello there @${pushName}!\n\nHere are the available commands you can explore:\n`;
    const footer = `Current system prefix: ${CONFIG?.prefix || '/'}\nPing: ${pingMs}ms\n${osLine}\n\n> Thank you for using IRFAN bot`;

    const finalText = [header, blocks.join('\n'), footer].join('\n');
    await sock.sendMessage(jid, { text: finalText, mentions: [sender] }, { quoted: m });
  }
};
