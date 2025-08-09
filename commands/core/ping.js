module.exports = {
  name: 'ping',
  run: async ({ sock, jid }) => {
    const t = Date.now();
    const sent = await sock.sendMessage(jid, { text: 'Pinging...' });
    await sock.sendMessage(jid, { text: `Pong ${Date.now()-t}ms` }, { quoted: sent });
  }
};