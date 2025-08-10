// commands/admin/cmd.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'cmd',
  aliases: ['command', 'plugin'],

  run: async ({ sock, m, jid, args, CONFIG, logger, helpers }) => {
    const sub = (args[0] || '').toLowerCase();

    if (sub !== 'install') {
      return m.reply(
        `Usage:\n` +
        `${CONFIG.prefix}cmd install <file.js> <code>\n\n` +
        `Example:\n` +
        `${CONFIG.prefix}cmd install poli.js\n` +
        `\`\`\`\n// commands/tools/poli.js\nconst axios = require("axios");\nmodule.exports = { name: "poli", aliases:["pimg"], run: async ({sock,m,jid,args}) => { /* ... */ } };\n\`\`\``
      );
    }

    const fileArg = args[1];
    if (!fileArg || !/^[a-z0-9_/\-\.]+$/i.test(fileArg) || !fileArg.endsWith('.js')) {
      return m.reply(`❌ Invalid filename.\nExample: ${CONFIG.prefix}cmd install poli.js <code>`);
    }

    const fullText =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text || '';
    const head = `${CONFIG.prefix}cmd install ${fileArg}`;
    let codePart = fullText.slice(fullText.indexOf(head) + head.length).trim();
    if (!codePart) return m.reply(`❌ No code found. Wrap your code in triple backticks if needed.`);

    const fence = codePart.match(/```([\s\S]*?)```/);
    if (fence) codePart = fence[1].trim();
    codePart = codePart.replace(/^\/\/\s*commands\/[^\n]+\n?/, '');

    try {
      const mod = helpers.registerCommandFromCode(path.basename(fileArg, '.js').toLowerCase(), codePart);
      await m.reply(`🧪 Loaded to memory: ${mod.name}. Saving to disk…`);
    } catch (e) {
      return m.reply(`❌ Compile error: ${e.message}`);
    }

    let rel = fileArg.replace(/\\/g, '/');
    if (!rel.startsWith('commands/')) rel = 'commands/tools/' + rel;

    const abs = path.join(process.cwd(), rel);
    const commandsRoot = path.join(process.cwd(), 'commands');
    if (!abs.startsWith(commandsRoot)) return m.reply(`❌ Path not allowed. Use inside "commands/".`);

    fs.mkdirSync(path.dirname(abs), { recursive: true });
    try { fs.writeFileSync(abs, codePart, 'utf8'); }
    catch (e) { return m.reply(`❌ Write failed: ${e.message}`); }

    try {
      await helpers.registerCommandFromFile(abs);
      await m.reply(`✅ Installed: ${rel}\nUse: ${CONFIG.prefix}${path.basename(fileArg, '.js')}`);
    } catch (e) {
      return m.reply(`⚠️ Saved but load failed: ${e.message}`);
    }
  }
};
