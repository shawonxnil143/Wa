// handlers/commandManager.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// volatile (in-memory) commands — রিস্টার্টে উধাও
const volatileCommands = new Map();

function safeRequire(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

function attachAliases(map, mod) {
  if (!Array.isArray(mod.aliases)) return;
  for (const a of mod.aliases) {
    map.set(String(a).toLowerCase(), mod);
  }
}

function loadCommands(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try {
      const mod = require(path.join(dir, file));
      if (mod?.name && typeof mod.run === 'function') {
        const key = mod.name.toLowerCase();
        map.set(key, mod);
        attachAliases(map, mod);
        console.log(chalk.green(`✔ Command Loaded: ${mod.name}`));
      } else {
        console.log(chalk.yellow(`⚠ Skipped: ${file} (invalid format)`));
      }
    } catch (e) {
      console.log(chalk.red(`❌ Failed to load ${file}: ${e.message}`));
    }
  }
  return map;
}

function registerCommandFromFile(filePath, commands, logger) {
  const mod = safeRequire(filePath);
  if (!mod || typeof mod.run !== 'function' || !mod.name) {
    throw new Error('Invalid command module');
  }
  const key = mod.name.toLowerCase();
  commands.set(key, mod);
  attachAliases(commands, mod);
  logger?.info?.(`🆕 Registered command: ${mod.name}`);
  return mod;
}

function unregisterCommandByName(name, commands) {
  volatileCommands.delete(name.toLowerCase());
  return commands.delete(name.toLowerCase());
}

function reloadCustomCommands(customDir, commands, logger) {
  if (!fs.existsSync(customDir)) return 0;
  let ok = 0;
  for (const f of fs.readdirSync(customDir).filter(x => x.endsWith('.js'))) {
    try {
      registerCommandFromFile(path.join(customDir, f), commands, logger);
      ok++;
    } catch (e) {
      logger?.error?.(`Failed to reload ${f}: ${e.message}`);
    }
  }
  return ok;
}

/**
 * Runtime installer: User provided code → live command (non-persistent).
 * পরিবর্তন: এখানে sandbox/allowlist বাদ। নেটিভ require পাস করা হচ্ছে
 * যাতে `require('os')`, `require('fs')` ইত্যাদি কাজ করে।
 */
function registerCommandFromCode(name, code, logger) {
  if (!/^[a-z0-9_\-]{2,32}$/i.test(name)) {
    throw new Error('Invalid name (2–32 chars a-z0-9_-)');
  }

  // module.exports না থাকলে auto-wrapper
  let moduleCode = code;
  if (!/module\.exports\s*=/.test(code)) {
    moduleCode = `
module.exports = {
  name: '${name}',
  run: async ({ sock, m, jid, args, CONFIG, logger, commands }) => {
    try { ${code} }
    catch(e){ await sock.sendMessage(jid, { text: '❌ ' + (e?.message || e) }, { quoted: m }); }
  }
};`;
  }

  try {
    // ⚠️ Native require pass-through (no sandbox)
    // eslint-disable-next-line no-new-func
    const factory = new Function('module', 'exports', 'require', moduleCode);
    const mod = { exports: {} };
    factory(mod, mod.exports, require);

    if (!mod.exports || typeof mod.exports.run !== 'function' || !mod.exports.name) {
      throw new Error('Your code compiled but did not export { name, run }.');
    }

    const key = mod.exports.name.toLowerCase();
    volatileCommands.set(key, mod.exports);
    logger?.info?.(`🧪 Volatile command registered: ${mod.exports.name} (lost on restart)`);
    return mod.exports;
  } catch (e) {
    // Friendlier error
    throw new Error('Syntax/compile error: ' + (e?.message || e));
  }
}

function createHelpers(commands, logger, customDir) {
  return {
    registerCommandFromFile: (fp) => registerCommandFromFile(fp, commands, logger),
    unregisterCommandByName: (nm) => unregisterCommandByName(nm, commands),
    reloadCustomCommands: () => reloadCustomCommands(customDir, commands, logger),
    registerCommandFromCode: (nm, code) => {
      const mod = registerCommandFromCode(nm, code, logger);
      // main map-এও এক্সপোজ + aliases
      commands.set(mod.name.toLowerCase(), mod);
      attachAliases(commands, mod);
      return mod;
    },
    customDir,
    volatileCommands
  };
}

module.exports = {
  loadCommands,
  registerCommandFromFile,
  unregisterCommandByName,
  reloadCustomCommands,
  registerCommandFromCode,
  createHelpers,
  volatile: volatileCommands
};
