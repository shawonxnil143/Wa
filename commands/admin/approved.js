
module.exports = {
  usage: '',
  aliases: [],
  
  name: "approved",
  role: 4,
  prefix: true,
  desc: "List approved groups",
  run: async ({ m 
}) => {
    const store = require('../../utils/approvalStore');
    const list = await store.listApproved();
    if (!list.length) return m.reply('No approved groups.');
    const lines = list.map((g,i)=> `${i+1}) ${g.name||g.jid}`);
    return m.reply(['Approved groups:', ...lines].join('\n'));
  }
};
