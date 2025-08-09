module.exports = { name: 'add', run: async ({ sock, m, jid, args }) => {
  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid,{text:'Group only.'},{quoted:m});
  const num = (args[0]||'').replace(/[^0-9]/g,'');
  if(!num) return sock.sendMessage(jid,{text:'Give number.'},{quoted:m});
  await sock.groupParticipantsUpdate(jid, [num+'@s.whatsapp.net'], 'add');
}};