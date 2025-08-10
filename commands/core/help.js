// commands/core/help.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: "help",
  run: async ({ sock, m, jid, CONFIG }) => {
    try {
      let msg = `🌟 *${CONFIG.botName} Help Menu* 🌟\n`;
      msg += `\n*Prefix:* ${CONFIG.prefix}`;
      msg += `\n*Owner:* ${CONFIG.owner.join(", ")}`;
      msg += `\n*Language:* ${CONFIG.language}\n`;

      const allCommands = [];
      const cmdDirs = ["commands/core", "commands/admin", "commands/tools", "commands/fun"];

      for (const dir of cmdDirs) {
        const fullDir = path.join(__dirname, "..", dir.split("/")[1]);
        if (!fs.existsSync(fullDir)) continue;
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith(".js"));
        for (const file of files) {
          try {
            const cmd = require(path.join(fullDir, file));
            if (cmd?.name) allCommands.push(cmd.name);
          } catch {}
        }
      }

      msg += `\n📜 *Available Commands (${allCommands.length}):*\n`;
      msg += allCommands.map(c => `• ${CONFIG.prefix}${c}`).join("\n");

      await sock.sendMessage(jid, { text: msg }, { quoted: m });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};
