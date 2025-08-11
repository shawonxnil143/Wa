// commands/admin/approve.js
// This command allows the bot owner to approve groups for bot usage.
// When a group is approved, the bot will respond to commands inside it.

module.exports = {
  usage: '[index|jid ...]',
  name: 'approve',
  aliases: [],
  role: 'admin',
  prefix: true,
  desc: 'Approve the current group or one or more groups by index or JID.',
  /**
   * Approve a group. If executed in a group chat without arguments, the
   * current group is approved. Alternatively, pass one or more indexes (from
   * the pending list) or full group JIDs to approve multiple groups at once.
   */
  run: async ({ m, args, jid, sock }) => {
    const store = require('../../utils/approvalStore');
    const reply = (msg) => m.reply(msg);
    // If arguments are provided, treat them as indexes into the pending list
    // or as group JIDs. This enables approving multiple groups at once from
    // the pending list (as shown by the `pnd` command).
    if (args.length > 0) {
      const pending = await store.listPending();
      const targets = [];
      for (const a of args) {
        const trimmed = String(a).trim();
        // Numeric index (1‑based) into pending list
        if (/^\d+$/.test(trimmed)) {
          const idx = parseInt(trimmed, 10) - 1;
          if (pending[idx] && pending[idx].jid) {
            targets.push(pending[idx].jid);
          }
        } else if (trimmed.endsWith('@g.us')) {
          // Direct JID
          targets.push(trimmed);
        }
      }
      if (!targets.length) {
        return reply('No valid group indexes or JIDs provided. Use numbers from the pending list or specify full group JIDs.');
      }
      const approved = await store.approve(targets);
      return reply(`✅ Approved: ${approved.join(', ')}`);
    }
    // If run without args inside a group, approve that group
    if (jid.endsWith('@g.us')) {
      await store.approve([jid]);
      return reply(`✅ Approved: ${jid}`);
    }
    // Otherwise show usage
    return reply('Usage: approve <number|jid> [...]. Run this command in a group without arguments to approve that group.');
  }
};
