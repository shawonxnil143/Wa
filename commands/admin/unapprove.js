
module.exports = {
  usage: '',
  aliases: [],
  
  name: "unapprove",
  role: 4,
  prefix: true,
  desc: "Unapprove a group. Usage: /unapprove <jid>",
  run: async ({ m, args 
}) => {
    const jid = args[0];
    if (!jid) return m.reply('Usage: /unapprove <groupJid>');
    const store = require('../../utils/approvalStore');
    await store.unapprove(jid);
    return m.reply(`✅ Unapproved: ${jid}`);
  }
};
