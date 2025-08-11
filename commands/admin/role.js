
module.exports = {
  usage: '',
  aliases: [],
  
  name: "role",
  role: 4,
  prefix: true,
  desc: "Show role for a command. Usage: /role <command>",
  run: async ({ m, args 
}) => {
    const cmd = (args[0]||'').toLowerCase();
    if (!cmd) return m.reply('Usage: /role <command>');
    const store = require('../../utils/roleStore');
    const val = await store.get(cmd);
    return m.reply(val ? `Role for ${cmd}: ${val}` : `No override for ${cmd} (defaults to command's own role or 1).`);
  }
};
