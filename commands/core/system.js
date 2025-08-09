const os = require('os');
module.exports = {
  name: 'system',
  run: async ({ sock, jid }) => {
    const mem = process.memoryUsage();
    const txt = `Node: ${process.version}
Platform: ${os.type()} ${os.release()}
CPU: ${os.cpus()[0].model}
RAM used: ${(mem.rss/1024/1024).toFixed(1)} MB`;
    await sock.sendMessage(jid, { text: txt });
  }
};