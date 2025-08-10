module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'ping',
  run: async ({ sock, jid
}) => {
    const t = Date.now();
    const sent = await sock.sendMessage(jid, { text: 'Pinging...' });
    await sock.sendMessage(jid, { text: `Pong ${Date.now()-t}ms` }, { quoted: sent });
  }
};