// commands/admin/off.js
module.exports = {
  prefix: true,
  // This command is restricted to the bot owner. Only users with role level 4
  // (owner) will be able to execute it. Removing the duplicate `role`
  // definition prevents accidental overrides.
  role: 'owner',
  name: 'off',
  aliases: ['shutdown', 'stop'],
  desc: '🚫 Turn off the bot (owner only)',
  usage: '/off',
  run: async ({ m }) => {
    try {
      await m.reply('🛑 Bot is shutting down...');
      process.exit(0);
    } catch (e) {
      console.error(e);
      await m.reply('❌ Failed to shut down bot.');
    }
  }
};
