// handlers/events/participantsAudit.js
module.exports = function init({ sock, CONFIG, logger }){
  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const { id: gid, participants = [], action, author } = ev || {};
      if (!gid || !participants.length) return;

      // Only speak in approved groups
      try {
        const approval = require('../../utils/approvalStore');
        const ok = await approval.isApproved(gid);
        if (!ok) return;
      } catch {}

      const actor = author ? ('@' + String(author).split('@')[0]) : 'unknown';
      if (action === 'remove'){
        const names = participants.map(p => '@' + String(p).split('@')[0]).join(', ');
        await sock.sendMessage(gid, { text: `ðŸ‘¢ ${actor} removed ${names}`, mentions: [author, ...participants] });
      } else if (action === 'add'){
        const names = participants.map(p => '@' + String(p).split('@')[0]).join(', ');
        await sock.sendMessage(gid, { text: `âž• ${actor} added ${names}`, mentions: [author, ...participants] });
      } else if (action === 'leave'){
        const names = participants.map(p => '@' + String(p).split('@')[0]).join(', ');
        await sock.sendMessage(gid, { text: `ðŸšª ${names} left the group`, mentions: participants });
      }
    } catch (e){
      logger?.warn?.('participantsAudit error: ' + e.message);
    }
  });
}
