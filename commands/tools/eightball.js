const A = ['Yes','No','Maybe','Absolutely','Not now','Ask later','Certainly','I doubt it'];
module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'eightball', run: async ({ sock, jid
}) => {
  await sock.sendMessage(jid, { text: `🎱 ${A[Math.floor(Math.random()*A.length)]}` });
}};