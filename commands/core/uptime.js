const humanize = require('humanize-duration');
module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: 'uptime',
  run: async ({ sock, jid
}) => {
    await sock.sendMessage(jid, { text: `Uptime: ${humanize(process.uptime()*1000, {largest:2, round:true})}` });
  }
};