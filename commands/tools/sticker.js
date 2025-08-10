module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'sticker', run: async ({ sock, m, jid
}) => {
  const msg = m.message;
  const img = msg?.imageMessage || msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if(!img) return sock.sendMessage(jid,{text:'Reply to an image.'},{quoted:m});
  const stream = await sock.downloadMediaMessage({ message: { imageMessage: img } });
  await sock.sendMessage(jid, { sticker: stream }, { quoted: m });
}};