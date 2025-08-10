// commands/core/help.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: "help",
  aliases: ["menu", "h"],
  description: "Show grouped help by folder or details for a specific command",
  usage: ["help", "help <command>"],

  run: async ({ sock, m, jid, args, CONFIG, commands }) => {
    try {
      const prefix = CONFIG.prefix || "!";
      const want = (args && args[0]) ? String(args[0]).toLowerCase() : "";

      // --- 1) If specific command requested: show details and return
      if (want) {
        // search in memory map by name/alias
        const mod = commands.get(want);
        if (!mod) {
          return sock.sendMessage(jid, { text: `❌ Command not found: ${want}\nTry: ${prefix}help` }, { quoted: m });
        }
        const lines = [];
        lines.push(`🌟 *${CONFIG.botName}* — Command Help`);
        lines.push(`\n*Name:* ${mod.name}`);
        if (Array.isArray(mod.aliases) && mod.aliases.length) {
          lines.push(`*Aliases:* ${mod.aliases.map(a => `${prefix}${a}`).join(", ")}`);
        }
        if (mod.description) lines.push(`*Description:* ${mod.description}`);
        if (mod.categorie || mod.category) lines.push(`*Category:* ${mod.categorie || mod.category}`);
        if (mod.permission !== undefined) lines.push(`*Permission:* ${mod.permission}`);
        if (mod.prefix !== undefined) lines.push(`*Needs Prefix:* ${mod.prefix ? "Yes" : "No"}`);

        // usage/usages
        const usages = Array.isArray(mod.usages) ? mod.usages : (mod.usage ? [mod.usage] : []);
        if (usages.length) {
          lines.push(`\n*Usage:*`);
          for (const u of usages) lines.push(`• ${typeof u === "string" ? u : JSON.stringify(u)}`);
        } else {
          lines.push(`\n*Usage:* ${prefix}${mod.name} …`);
        }

        // sample
        if (mod.example || mod.examples) {
          const exs = Array.isArray(mod.examples) ? mod.examples : [mod.example];
          lines.push(`\n*Examples:*`);
          for (const ex of exs.filter(Boolean)) lines.push(`• ${ex}`);
        }

        return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: m });
      }

      // --- 2) Build grouped menu from filesystem to know folders
      const base = path.join(process.cwd(), "commands");
      const groups = [
        { key: "core",  title: "🧩 Core"   },
        { key: "admin", title: "🛠️ Admin" },
        { key: "tools", title: "🧰 Tools"  },
        { key: "fun",   title: "🎉 Fun"    },
        { key: "custom",title: "🧪 Custom" }
      ];

      // function to read folder & map to details
      const readFolder = (folderKey) => {
        const dir = path.join(base, folderKey);
        if (!fs.existsSync(dir)) return [];
        const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
        const list = [];
        for (const f of files) {
          try {
            const mod = require(path.join(dir, f));
            if (mod && mod.name && typeof mod.run === "function") {
              list.push({
                name: mod.name,
                aliases: Array.isArray(mod.aliases) ? mod.aliases : [],
                description: mod.description || "",
                usage: Array.isArray(mod.usages) ? mod.usages : (mod.usage ? [mod.usage] : []),
              });
            }
          } catch {
            // ignore broken module
          }
        }
        // sort by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
      };

      // header
      const header = [
        `🌟 *${CONFIG.botName} Help Menu*`,
        ``,
        `*Prefix:* ${prefix}`,
        `*Owner:* ${Array.isArray(CONFIG.owner) ? CONFIG.owner.join(", ") : (CONFIG.owner || "")}`,
        `*Language:* ${CONFIG.language || "en"}`,
      ].join("\n");

      // body per group
      const sections = [];
      for (const g of groups) {
        const items = readFolder(g.key);
        if (!items.length) continue;
        const lines = [];
        lines.push(`\n${g.title} (${items.length})`);
        for (const it of items) {
          const aliasPart = it.aliases && it.aliases.length
            ? ` _(${it.aliases.map(a => `${prefix}${a}`).join(", ")})_`
            : "";
          const desc = it.description ? ` — ${it.description}` : "";
          lines.push(`• ${prefix}${it.name}${aliasPart}${desc}`);
          if (it.usage && it.usage.length) {
            // show first usage line only to keep menu compact
            const u = it.usage[0];
            lines.push(`   e.g. ${typeof u === "string" ? u : JSON.stringify(u)}`);
          }
        }
        sections.push(lines.join("\n"));
      }

      // footer tips
      const footer = `\nℹ️ Tips: Send *${prefix}help <command>* for details.`;

      // join all & paginate if long
      const fullText = [header, ...sections, footer].join("\n");
      const chunks = chunkText(fullText, 3500); // safe margin for WA

      for (const part of chunks) {
        // slight delay to avoid rate-limit
        await sock.sendMessage(jid, { text: part }, { quoted: m });
      }
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: m });
    }
  }
};

// Split big text into chunks for WhatsApp limits
function chunkText(str, size) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    out.push(str.slice(i, i + size));
    i += size;
  }
  return out;
}
