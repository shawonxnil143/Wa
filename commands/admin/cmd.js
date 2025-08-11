// commands/admin/cmd.js
const path = require('path');

module.exports = {
  name: "cmd",
  aliases: [],
  desc: "Manage volatile (runtime) commands",
  usage: "/cmd <install|remove|list> ...",
  prefix: true,
  role: 1,

  run: async ({ sock, m, args, CONFIG, logger, helpers }) => {
    try {
      const sub = (args.shift() || '').toLowerCase();

      // Help message if no subcommand
      if (!sub) {
        return m.reply(
`📜 *Command Manager*
Usage:
${CONFIG.prefix}cmd install <name.js> <code> — inline
${CONFIG.prefix}cmd install <name.js> \`\`\`js
<code>
\`\`\` — multiline
${CONFIG.prefix}cmd remove <name>
${CONFIG.prefix}cmd list`
        );
      }

      // LIST
      if (sub === 'list') {
        const names = Array.from(helpers.volatile.keys());
        return m.reply(names.length ? 
          '📂 *Volatile Commands:* ' + names.join(', ') : 
          'ℹ️ No volatile commands installed.');
      }

      // REMOVE
      if (sub === 'remove') {
        const name = (args.shift() || '').replace(/\.js$/i, '').toLowerCase();
        if (!name) return m.reply('❌ Give a command name. e.g. test');
        const ok = helpers.unregisterCommandByName(name);
        return m.reply(ok ? `🗑 Removed command: ${name}` : `⚠️ Not found: ${name}`);
      }

      // INSTALL
      if (sub === 'install') {
        let name = (args.shift() || '').toLowerCase();
        if (!name) return m.reply('❌ Give file name, e.g. test.js');
        name = name.replace(/\.js$/i, '');

        // Extract code
        let code = args.join(' ') || '';
        const fenced = /```[a-zA-Z0-9]*\n?([\s\S]*?)```/.exec(
          m.message?.extendedTextMessage?.text || ''
        );
        if (fenced && fenced[1]) code = fenced[1];

        if (!code.trim()) {
          return m.reply('⚠️ Missing code. Provide inline code or fenced ```js blocks.');
        }

        try {
          const mod = helpers.registerCommandFromCode(name, code);
          if (!mod || typeof mod.run !== 'function') {
            return m.reply(`❌ Failed to install: Your code did not export { name, run }`);
          }
          return m.reply(`✅ Installed command: ${mod.name} (volatile)`);
        } catch (e) {
          logger?.error?.(e);
          return m.reply('❌ Failed to install: ' + (e.message || e));
        }
      }

      // Unknown
      return m.reply(`❓ Unknown subcommand: ${sub}`);

    } catch (e) {
      logger?.error?.(e);
      return m.reply('❌ Error: ' + (e.message || e));
    }
  }
};
