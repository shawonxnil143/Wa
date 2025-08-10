
// commands/core/prefix.js
module.exports = {
  usage: '',
  role: 1,
  name: "prefix",
  aliases: ["pf"],
  prefix: false,
  desc: "Show the current command prefix for this chat",
  run: async ({ m, jid, CONFIG, helpers
}) => {
    const store = require('../../utils/prefixStore');
    const grp = jid.endsWith('@g.us') ? (await store.getPrefixFor(jid)) : null;
    const effective = grp?.prefix || CONFIG.prefix || '/';
    await m.reply(`Current prefix here: ${effective}`);
  }
};
