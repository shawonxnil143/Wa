module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'mute', run: async ({ sock, jid
}) => {
  await sock.groupSettingUpdate(jid, 'announcement');
  await sock.sendMessage(jid, { text: 'Group muted (admins only).' });
}};