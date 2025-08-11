
module.exports = {
  usage: '',
  role: 1,
  name: "search",
  aliases: ["find"],
  prefix: true,
  desc: "Search commands by keyword",
  run: async ({ m, args, commands
}) => {
    const q = (args.join(' ')||'').toLowerCase();
    if (!q) return m.reply('Usage: /search <keyword>');
    const list = Array.from(commands.values());
    const hits = list.filter(c => (c.name||'').includes(q) || (c.desc||'').toLowerCase().includes(q) || (Array.isArray(c.aliases)&&c.aliases.join(' ').toLowerCase().includes(q)));
    if (!hits.length) return m.reply('No commands matched.');
    const lines = hits.map(c => `• ${c.name} — ${c.desc||''}`);
    return m.reply(['Matched commands:', ...lines].join('\n'));
  }
};
