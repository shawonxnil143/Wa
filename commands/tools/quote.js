module.exports = { name: 'quote', run: async ({ sock, jid, args }) => {
  const text = args.join(' ') || 'Stay awesome!';
  await sock.sendMessage(jid, { text });
}};