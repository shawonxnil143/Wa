module.exports = { name: 'demote', run: async ({ sock, m, jid, args }) => {
  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid,{text:'Group only.'},{quoted:m});
  const target = args[0] || m.key.participant;
  await sock.groupParticipantsUpdate(jid, [target], 'demote');
}};