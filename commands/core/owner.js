module.exports = {
  name: 'owner',
  run: async ({ sock, jid, CONFIG }) => {
    await sock.sendMessage(jid, { text: `Owner: ${CONFIG.owner.join(', ')}` });
  }
};