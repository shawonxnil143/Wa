module.exports = { name: 'mute', run: async ({ sock, jid }) => {
  await sock.groupSettingUpdate(jid, 'announcement');
  await sock.sendMessage(jid, { text: 'Group muted (admins only).' });
}};