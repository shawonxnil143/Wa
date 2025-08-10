// commands/admin/cmd.js
// Runtime command manager (Goat-style) — supports:
// /cmd install command.js ( code )
// /cmd install command.js ```js ... ```
// /cmd remove <name>
// /cmd list
// /cmd reload

const fs = require('fs');
const path = require('path');

const MAX_SIZE = 20 * 1024; // 20 KB
const BLOCKLIST = [
  'child_process','worker_threads','cluster','vm',
  'net','tls','dgram','udp4','udp6','http2'
];

function isOwner(m, CONFIG) {
  const jid = m.key.participant || m.key.remoteJid || '';
  const num = jid.replace(/[^0-9]/g,'');
  return (CONFIG.owner || []).some(o => o.replace(/[^0-9]/g,'') === num);
}

function sanitizeName(input) {
  // allow "name.js" or "name"
  const raw = String(input || '').trim();
  const noExt = raw.toLowerCase().endsWith('.js') ? raw.slice(0, -3) : raw;
  if (!/^[a-z0-9_\-]{2,32}$/i.test(noExt)) {
    throw new Error('Invalid command name. Use 2–32 chars: a-z, 0-9, _, -');
  }
  return noExt.toLowerCase();
}

function extractCode(argsAfterNameJoined) {
  const s = argsAfterNameJoined.trim();

  // ```js ... ```
  const triple = /```(?:js|javascript)?\s*([\s\S]*?)```/i.exec(s);
  if (triple && triple[1]) return triple[1].trim();

  // ( ... ) — take the outermost pair only
  const paren = /^\(([\s\S]*?)\)$/.exec(s);
  if (paren && paren[1]) return paren[1].trim();

  // raw tail as code
  return s;
}

function blockedAPIFound(code) {
  const low = code.toLowerCase();
  return BLOCKLIST.some(k => low.includes(k));
}

function usage(prefix='!') {
  return [
    '*Dynamic Command Manager*',
    `• ${prefix}cmd install command.js ( await m.reply("ok") )`,
    `• ${prefix}cmd install command.js \` \`\`js\nawait m.reply("ok")\n\` \`\``,
    `• ${prefix}cmd remove command`,
    `• ${prefix}cmd list`,
    `• ${prefix}cmd reload`
  ].join('\n');
}

module.exports = {
  name: 'cmd',
  run: async ({ sock, m, jid, args, CONFIG, logger, helpers }) => {
    try {
      if (!isOwner(m, CONFIG)) {
        return m.reply('⛔ Owner only.');
      }
      if (!helpers || (!helpers.registerCommandFromCode && !helpers.registerCommandFromFile)) {
        return m.reply('❌ Internal: helpers not provided from index.js');
      }

      const sub = (args[0] || '').toLowerCase();
      if (!sub || !['install','remove','list','reload'].includes(sub)) {
        return m.reply(usage(CONFIG.prefix));
      }

      const { customDir, volatileCommands } = helpers;
      const registerFromCode = helpers.registerCommandFromCode;
      const registerFromFile = helpers.registerCommandFromFile;
      const unregister = helpers.unregisterCommandByName;
      const reload = helpers.reloadCustomCommands;

      // /cmd list
      if (sub === 'list') {
        const volatile = Array.from((volatileCommands || new Map()).keys());
        const fileCmds = (fs.existsSync(customDir) ? fs.readdirSync(customDir).filter(f=>f.endsWith('.js')).map(f=>f.replace(/\.js$/,'')) : []);
        const lines = [];
        if (fileCmds.length) lines.push(`*File Commands (${fileCmds.length})*`, ...fileCmds.map(n=>'• '+n));
        if (volatile.length) lines.push(`*Volatile Commands (${volatile.length})*`, ...volatile.map(n=>'• '+n));
        if (!lines.length) lines.push('No custom commands.');
        return m.reply(lines.join('\n'));
      }

      // /cmd reload
      if (sub === 'reload') {
        const n = reload ? reload() : 0;
        return m.reply(`🔁 Reloaded ${n} file command(s).`);
      }

      // /cmd remove <name>
      if (sub === 'remove') {
        const nameRaw = args[1];
        if (!nameRaw) return m.reply('❌ Give a command name.\n' + usage(CONFIG.prefix));
        let name;
        try { name = sanitizeName(nameRaw); }
        catch(e){ return m.reply('❌ ' + e.message); }

        // drop volatile + file-registered
        volatileCommands && volatileCommands.delete(name);
        const ok = unregister ? unregister(name) : false;

        // also remove file if exists under customDir
        const fp = path.join(customDir || path.join(__dirname, '..','custom'), name + '.js');
        if (fs.existsSync(fp)) fs.unlinkSync(fp);

        return m.reply(ok ? `🗑️ Removed: ${name}` : `Removed (volatile or not loaded): ${name}`);
      }

      // /cmd install <name(.js)> <code>
      if (sub === 'install') {
        if (!args[1]) return m.reply('❌ Give a command name.\n' + usage(CONFIG.prefix));
        let name;
        try { name = sanitizeName(args[1]); }
        catch(e){ return m.reply('❌ ' + e.message + '\n' + usage(CONFIG.prefix)); }

        const tail = args.slice(2).join(' ');
        if (!tail) return m.reply('❌ Provide code inside (...) or ```js ... ```\n' + usage(CONFIG.prefix));

        const code = extractCode(tail);
        if (!code) return m.reply('❌ Empty code.\n' + usage(CONFIG.prefix));

        if (Buffer.byteLength(code, 'utf8') > MAX_SIZE) {
          return m.reply(`❌ Code too big. Max ${MAX_SIZE/1024}KB.`);
        }
        if (blockedAPIFound(code)) {
          return m.reply('❌ Blocked API found (child_process/net/vm/etc).');
        }

        // Prefer volatile (in-memory) for testing
        if (typeof registerFromCode === 'function') {
          try {
            registerFromCode(name, code, logger);
            return m.reply(`✅ Installed (volatile): ${name}\nℹ️ Will be lost on restart.`);
          } catch (e) {
            return m.reply('❌ Failed to install: ' + (e.message || e));
          }
        }

        // Fallback: write to file (persistent) if registerFromCode missing
        try {
          const dir = customDir || path.join(__dirname, '..', 'custom');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          // Wrap if missing module.exports
          const wrapped = /module\.exports\s*=/.test(code) ? code : `module.exports = {
  name: '${name}',
  run: async ({ sock, m, jid, args }) => {
    try { ${code} }
    catch(e){ await sock.sendMessage(jid,{text:'❌ '+(e.message||e)},{quoted:m}); }
  }
};`;

          const fp = path.join(dir, name + '.js');
          fs.writeFileSync(fp, wrapped, 'utf8');
          registerFromFile && registerFromFile(fp);
          return m.reply(`✅ Installed (file): ${name}`);
        } catch (e) {
          return m.reply('❌ Failed to write file: ' + (e.message || e));
        }
      }

      // fallback
      return m.reply(usage(CONFIG.prefix));

    } catch (err) {
      try { await m.reply('❌ Error: ' + (err?.message || err)); } catch(_) {}
      logger?.error?.(err);
    }
  }
};
