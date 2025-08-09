module.exports = { name: 'sticker', run: async ({ sock, m, jid }) => {
  const msg = m.message;
  const img = msg?.imageMessage || msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if(!img) return sock.sendMessage(jid,{text:'Reply to an image.'},{quoted:m});
  const stream = await sock.downloadMediaMessage({ message: { imageMessage: img } });
  await sock.sendMessage(jid, { sticker: stream }, { quoted: m });
}};