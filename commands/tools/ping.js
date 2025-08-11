// commands/tools/ping.js
module.exports = {
  name: "ping",
  aliases: [],
  role: 1,
  prefix: true,
  desc: "Small health check",
  usage: "/ping",
  category: "tools",
  run: async ({ sock, m, jid }) => {
    const t0 = Date.now();
    await sock.sendMessage(jid, { text: "Pinging..." }, { quoted: m });
    const ms = Date.now() - t0;
    await sock.sendMessage(jid, { text: `Pong! ${ms}ms` }, { quoted: m });
  }
}
