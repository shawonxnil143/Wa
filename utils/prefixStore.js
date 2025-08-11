
// utils/prefixStore.js
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'group_prefixes.json');

function loadJson() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function saveJson(obj) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

async function getPrefixFor(jid) {
  const map = loadJson();
  return map[jid] || null;
}
async function setPrefixFor(jid, prefix, meta={}) {
  const map = loadJson();
  map[jid] = { prefix, ...meta, updatedAt: new Date().toISOString() };
  saveJson(map);
  return true;
}
async function resetPrefix(jid) {
  const map = loadJson();
  delete map[jid];
  saveJson(map);
  return true;
}
async function getAll() {
  return loadJson();
}

module.exports = { getPrefixFor, setPrefixFor, resetPrefix, getAll };
