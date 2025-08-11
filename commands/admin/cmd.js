// commands/admin/cmd.js
const path = require('path');

module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: "cmd",
  run: async ({ sock, m, jid, args, CONFIG, logger, helpers
}) => {
    try {
      const sub = (args.shift() || '').toLowerCase();
      if (!sub) {
        return m.reply(`Usage:
${CONFIG.prefix}cmd install <name.js> <code>  — inline
${CONFIG.prefix}cmd install <name.js> \`\`\`js
<code>
\`\`\`  — multiline
${CONFIG.prefix}cmd remove <name>
${CONFIG.prefix}cmd list`);
      }

      if (sub === 'list') {
        const names = Array.from(helpers.volatile.keys());
        return m.reply(names.length ? 'Volatile: ' + names.join(', ') : 'No volatile commands.');
      }

      if (sub === 'remove') {
        const name = (args.shift() || '').replace(/\.js$/i,'').toLowerCase();
        if (!name) return m.reply('Give a command name. e.g. poli');
        const ok = helpers.unregisterCommandByName(name);
        return m.reply(ok ? `Removed ${name}` : `Not found: ${name}`);
      }

      if (sub === 'install') {
        let name = (args.shift() || '').toLowerCase();
        if (!name) return m.reply('Give file name, e.g. poli.js');
        name = name.replace(/\.js$/i, '');

        // Try to extract code from the rest of message (inline or fenced)
        const raw = (args.join(' ') || '');
        let code = raw;

        // fenced block ``` ``` support
        const match = /```[a-zA-Z0-9]*\n?([\s\S]*?)```/.exec(m.message?.extendedTextMessage?.text || '');
        if (match && match[1]) code = match[1];

        if (!code.trim()) return m.reply('Missing code. Provide inline code or fenced ```js blocks.');

        try {
          const mod = helpers.registerCommandFromCode(name, code);
          return m.reply(`✅ Installed: ${mod.name} (volatile)`);
        } catch (e) {
          return m.reply('❌ Failed to install: ' + (e.message || e));
        }
      }

      return m.reply('Unknown subcommand.');
    } catch (e) {
      logger?.error?.(e);
      return m.reply('❌ ' + (e.message || e));
    }
  }
};
