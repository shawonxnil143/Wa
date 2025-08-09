module.exports = { name: 'unmute', run: async ({ sock, jid }) => {
  await sock.groupSettingUpdate(jid, 'not_announcement');
  await sock.sendMessage(jid, { text: 'Group unmuted.' });
}};