
module.exports = {
  usage: '',
  aliases: [],
  
  name: "addmod",
  role: 4,
  prefix: true,
  desc: "Add a moderator number. Usage: /addmod <+6598..>",
  run: async ({ m, args 
}) => {
    const num = args[0];
    if (!num) return m.reply('Usage: /addmod <+countrycodeNumber>');
    const store = require('../../utils/modStore');
    await store.add(num);
    return m.reply(`✅ Added moderator: ${num}`);
  }
};
