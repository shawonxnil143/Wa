// handlers/commandManager.js
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

function safeRequire(filePath){
  try { return require(filePath); }
  catch(e){ console.error('Failed to load command:', filePath, e.message); return null; }
}

function normalizeCommand(mod, filePath){
  if (!mod || typeof mod !== 'object') return null;
  if (typeof mod.name !== 'string') return null;
  if (typeof mod.run !== 'function') mod.run = async ({ m }) => m.reply('OK');
  if (!Array.isArray(mod.aliases)) mod.aliases = [];
  if (typeof mod.desc !== 'string') mod.desc = 'No description';
  if (typeof mod.usage !== 'string') mod.usage = '';
  if (typeof mod.role !== 'number' && typeof mod.role !== 'string') mod.role = 1;
  if (typeof mod.prefix !== 'boolean') mod.prefix = true;

  // inject category from folder (core -> system)
  try {
    const rawCategory = path.basename(path.dirname(filePath)).toLowerCase();
    const normalizedCategory = (rawCategory === 'core') ? 'system' : rawCategory;
    if (!mod.category) mod.category = normalizedCategory;
  } catch {}

  mod.__file = filePath;
  return mod;
}

function loadCommands(commandsDir){
  const files = globSync(path.join(commandsDir, '**/*.js')).sort();
  const map = new Map();
  for (const filePath of files){
    const mod = normalizeCommand(safeRequire(path.resolve(filePath)), filePath);
    if (!mod) continue;
    const key = String(mod.name).toLowerCase();
    if (map.has(key)){
      console.warn('Duplicate command name, skipping:', key, 'at', filePath);
      continue;
    }
    map.set(key, mod);
  }
  return map;
}

module.exports = { loadCommands };
