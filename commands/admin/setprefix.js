
// commands/admin/setprefix.js
module.exports = {
  usage: '',
  
  name: "setprefix",
  aliases: ["resetprefix"],
  role: "admin",
  prefix: true,
  desc: "Set or reset group-specific prefix. Use: /setprefix !  |  /resetprefix",
  run: async ({ m, jid, args, CONFIG 
}) => {
    if (!jid.endsWith('@g.us')) return m.reply('This command works in groups only.');
    const store = require('../../utils/prefixStore');
    const isReset = m.message?.conversation?.toLowerCase().startsWith((CONFIG.prefix||'/') + 'resetprefix');
    if (isReset) {
      await store.resetPrefix(jid);
      return m.reply(`Group prefix cleared. Using global: ${CONFIG.prefix}`);
    }
    const pfx = (args[0] || '').trim();
    if (!pfx) return m.reply('Provide a new prefix, e.g., /setprefix !');
    await store.setPrefixFor(jid, pfx, { setBy: m.key.participant || jid });
    return m.reply(`Group prefix set to: ${pfx}`);
  }
};
