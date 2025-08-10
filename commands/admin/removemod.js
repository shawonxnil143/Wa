
module.exports = {
  usage: '',
  aliases: [],
  
  name: "removemod",
  role: 4,
  prefix: true,
  desc: "Remove a moderator number. Usage: /removemod <+6598..>",
  run: async ({ m, args 
}) => {
    const num = args[0];
    if (!num) return m.reply('Usage: /removemod <+countrycodeNumber>');
    const store = require('../../utils/modStore');
    await store.remove(num);
    return m.reply(`✅ Removed moderator: ${num}`);
  }
};
