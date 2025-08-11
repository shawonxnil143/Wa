// handlers/commandManager.js
const fs = require('fs');
const path = require('path');

// In-memory registry for runtime commands installed via `/cmd install`.
// These commands are not persisted to disk and will be lost on restart.
// The `volatile` map mirrors the shape of the `commands` map but only
// contains commands that were loaded dynamically (not from files on disk).
const volatile = new Map();

// Node's built‑in VM module is used to safely evaluate arbitrary command
// source code provided at runtime. By running the code in a fresh
// sandbox we avoid polluting the global scope of the process. The
// exported `module.exports` from the evaluated code becomes the
// command definition.
const vm = require('vm');

function walkJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function safeRequire(filePath) {
  try { return require(filePath); }
  catch (e) {
    console.error('Failed to load command:', filePath, e.message);
    return null;
  }
}

function normalizeCommand(mod, filePath) {
  if (!mod || typeof mod !== 'object') return null;
  if (typeof mod.name !== 'string' || !mod.name.trim()) return null;
  if (typeof mod.run !== 'function') mod.run = async ({ m }) => m.reply('OK');
  if (!Array.isArray(mod.aliases)) mod.aliases = [];
  if (typeof mod.desc !== 'string') mod.desc = 'No description';
  if (typeof mod.usage !== 'string') mod.usage = '';
  if (typeof mod.role !== 'number' && typeof mod.role !== 'string') mod.role = 1;
  if (typeof mod.prefix !== 'boolean') mod.prefix = true;

  try {
    const rawCategory = path.basename(path.dirname(filePath)).toLowerCase();
    const normalizedCategory = (rawCategory === 'core') ? 'system' : rawCategory;
    if (!mod.category) mod.category = normalizedCategory;
  } catch {}

  mod.__file = filePath;
  return mod;
}

function loadCommands(commandsDir) {
  const files = walkJs(commandsDir).sort();
  const map = new Map();
  for (const filePath of files) {
    const mod = normalizeCommand(safeRequire(path.resolve(filePath)), filePath);
    if (!mod) continue;
    const key = String(mod.name).toLowerCase();
    if (map.has(key)) {
      console.warn('Duplicate command name, skipping:', key, 'at', filePath);
      continue;
    }
    map.set(key, mod);
  }
  return map;
}

/**
 * Load a command module from the given file and register it into the provided
 * commands map. If a command with the same name already exists it will be
 * overwritten. This helper is used by the hot‑reload mechanism and by
 * runtime helpers.
 *
 * @param {string} filePath – absolute path to the JavaScript file exporting a command
 * @param {Map} commandsMap – map of command name → command definition
 * @param {object} logger – optional logger for error reporting
 * @returns {object} the normalized command object
 */
function registerCommandFromFile(filePath, commandsMap, logger) {
  const mod = normalizeCommand(safeRequire(path.resolve(filePath)), filePath);
  if (!mod) {
    const errMsg = `Invalid command definition in ${filePath}`;
    if (logger?.warn) logger.warn(errMsg);
    throw new Error(errMsg);
  }
  const key = String(mod.name).toLowerCase();
  commandsMap.set(key, mod);
  return mod;
}

/**
 * Unregister a command from both the static commands map and the volatile map.
 * Returns true if a command was removed, otherwise false.
 *
 * @param {string} name – command name (case insensitive)
 * @param {Map} commandsMap – map of static commands
 * @returns {boolean}
 */
function unregisterCommandByName(name, commandsMap) {
  const key = String(name || '').toLowerCase();
  let removed = false;
  if (commandsMap?.delete(key)) removed = true;
  if (volatile.delete(key)) removed = true;
  return removed;
}

/**
 * Register a command from arbitrary JavaScript source code. The provided code
 * should assign a command definition to `module.exports`. The returned
 * command is stored in the `volatile` map. If the definition does not
 * contain a `name` property it will default to the supplied `name`.
 *
 * @param {string} name – suggested file/name for the command
 * @param {string} code – JavaScript source defining the command
 * @returns {object} the normalized command object
 */
function registerCommandFromCode(name, code) {
  const key = String(name || '').replace(/\.js$/i, '').toLowerCase();
  let exportsObj = {};
  try {
    const script = new vm.Script(code, { filename: `${key}.js` });
    const module = { exports: {} };
    const sandbox = {
      module,
      exports: module.exports,
      require,
      __dirname: __dirname,
      __filename: `${key}.js`,
      console
    };
    script.runInNewContext(sandbox);
    exportsObj = module.exports;
  } catch (e) {
    throw new Error(`Compile error: ${e.message}`);
  }
  // Default the command name if not provided
  if (!exportsObj.name) exportsObj.name = key;
  const cmd = normalizeCommand(exportsObj, '');
  if (!cmd) throw new Error('Invalid command');
  volatile.set(String(cmd.name).toLowerCase(), cmd);
  return cmd;
}

/**
 * Create a helper object scoped to a specific WhatsApp socket. Besides the
 * convenience methods (sendText, mention, sleep, react) it also exposes
 * functions for working with runtime commands (volatile, register/unregister
 * from files or code). The commands map and logger are captured via closure
 * to allow modifying the correct registry.
 *
 * @param {object} sock – WhatsApp socket instance
 * @param {Map} commandsMap – registry of static commands
 * @param {object} logger – optional logger
 * @param {string} [customDir] – unused but kept for backwards compatibility
 */
function createHelpers(sock, commandsMap, logger, customDir) {
  return {
    // Convenience helpers for command authors
    sendText: async (jid, text, opts = {}) => {
      try { await sock.sendMessage(jid, { text: String(text) }, opts); } catch {}
    },
    mention: (numbers = []) => numbers.map(n => (String(n).includes('@') ? n : `${n}@s.whatsapp.net`)),
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    react: async (m, emoji) => {
      try { await sock.sendMessage(m.key.remoteJid, { react: { text: emoji, key: m.key } }); } catch {}
    },
    // Expose the volatile registry
    volatile,
    // Proxy to register a command from an on‑disk file
    registerCommandFromFile: (filePath) => registerCommandFromFile(filePath, commandsMap, logger),
    // Proxy to unregister a command by name
    unregisterCommandByName: (name) => unregisterCommandByName(name, commandsMap),
    // Proxy to register a command from a string of code
    registerCommandFromCode: (name, code) => registerCommandFromCode(name, code)
  };
}

module.exports = {
  loadCommands,
  createHelpers,
  registerCommandFromFile,
  unregisterCommandByName,
  registerCommandFromCode,
  volatile
};
