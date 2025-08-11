
module.exports = {
  usage: '',
  aliases: [],
  
  name: "setrole",
  role: 4,
  prefix: true,
  desc: "Set command role level (1-4). Usage: /setrole <command> <1|2|3|4>",
  run: async ({ m, args 
}) => {
    const [cmd, lvl] = args;
    const n = Number(lvl);
    if (!cmd || ![1,2,3,4].includes(n)) return m.reply('Usage: /setrole <command> <1|2|3|4>');
    const store = require('../../utils/roleStore');
    await store.set(cmd, n);
    return m.reply(`✅ Role for ${cmd} set to ${n}`);
  }
};
