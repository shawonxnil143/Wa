module.exports = { name: 'toimg', run: async ({ sock, m, jid }) => {
  const q = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
  if(!q) return sock.sendMessage(jid,{text:'Reply to a sticker.'},{quoted:m});
  const stream = await sock.downloadMediaMessage({ message: { stickerMessage: q } });
  await sock.sendMessage(jid, { image: stream, caption: 'Here you go!' }, { quoted: m });
}};