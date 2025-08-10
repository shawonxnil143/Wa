module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'quote', run: async ({ sock, jid, args
}) => {
  const text = args.join(' ') || 'Stay awesome!';
  await sock.sendMessage(jid, { text });
}};