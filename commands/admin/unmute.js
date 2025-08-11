module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'unmute', run: async ({ sock, jid
}) => {
  await sock.groupSettingUpdate(jid, 'not_announcement');
  await sock.sendMessage(jid, { text: 'Group unmuted.' });
}};