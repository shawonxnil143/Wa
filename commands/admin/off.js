// commands/admin/off.js
module.exports = {
  prefix: true,
  role: 1,
  name: "off",
  aliases: ["shutdown", "stop"],
  role: "owner",
  desc: "🚫 Turn off the bot (owner only)",
  usage: "/off",
  run: async ({ m
}) => {
    try {
      await m.reply("🛑 Bot is shutting down...");
      process.exit(0);
    } catch (e) {
      console.error(e);
      await m.reply("❌ Failed to shut down bot.");
    }
  }
};
