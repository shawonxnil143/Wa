// commands/admin/pnd.js
module.exports = {
  usage: '',
  
  name: 'pnd',
  aliases: [],
  role: 'admin',
  prefix: true,
  desc: 'Show pending groups that need approval. Use the approve command to activate them.',
  run: async ({ m }) => {
    const store = require('../../utils/approvalStore');
    const list = await store.listPending();
    if (!list.length) return m.reply('No pending groups.');
    const lines = ['Pending groups:'];
    list.forEach((g, i) => lines.push(`${i + 1}) ${g.name || g.jid}`));
    lines.push('', 'To approve: run `approve <number>` or `approve <jid>`');
    await m.reply(lines.join('\n'));
  }
};
