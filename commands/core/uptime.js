const humanize = require('humanize-duration');
module.exports = {
  name: 'uptime',
  run: async ({ sock, jid }) => {
    await sock.sendMessage(jid, { text: `Uptime: ${humanize(process.uptime()*1000, {largest:2, round:true})}` });
  }
};