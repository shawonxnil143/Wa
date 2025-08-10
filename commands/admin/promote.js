module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'promote', run: async ({ sock, m, jid, args
}) => {
  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid,{text:'Group only.'},{quoted:m});
  const target = args[0] || m.key.participant;
  await sock.groupParticipantsUpdate(jid, [target], 'promote');
}};