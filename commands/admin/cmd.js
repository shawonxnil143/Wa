// Runtime command installer
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'cmd',
  run: async ({ m, args }) => {
    const sub = args.shift();
    if (sub === 'install') {
      const name = args.shift();
      const code = args.join(' ');
      if (!name || !code) return m.reply('Usage: /cmd install <name> <code>');
      const dir = path.join(__dirname, '../custom');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const filePath = path.join(dir, name);
      fs.writeFileSync(filePath, code);
      m.reply(`✅ Command ${name} installed.`);
    } else if (sub === 'remove') {
      const name = args.shift();
      const filePath = path.join(__dirname, '../custom', name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        m.reply(`🗑 Command ${name} removed.`);
      } else {
        m.reply('❌ Command not found.');
      }
    } else {
      m.reply('Usage: /cmd <install/remove> ...');
    }
  }
};
