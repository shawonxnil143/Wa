
// commands/admin/pnd.js
module.exports = {
  usage: '',
  
  name: "pnd",
  aliases: [],
  role: "owner",
  prefix: true,
  desc: "Show pending groups that need approval. Reply: approve <index(es)>",
  run: async ({ sock, m 
}) => {
    const store = require('../../utils/approvalStore');
    const list = await store.listPending();
    if (!list.length) return m.reply('No pending groups.');
    const lines = ['Pending groups:'];
    list.forEach((g, i) => lines.push(`${i+1}) ${g.name || g.jid}`));
    lines.push('', 'Reply to this message with: approve 1 or 2');
    const sent = await m.reply(lines.join('\n'));
    // Attach a simple listener for this reply in-memory (best-effort)
    // The main guard will also allow approve via explicit admin command if implemented later.
  }
};
