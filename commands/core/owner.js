module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'owner',
  run: async ({ sock, jid, CONFIG
}) => {
    await sock.sendMessage(jid, { text: `Owner: ${CONFIG.owner.join(', ')}` });
  }
};