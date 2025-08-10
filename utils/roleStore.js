
// utils/roleStore.js
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'command_roles.json');
function load(){ try{return JSON.parse(fs.readFileSync(FILE,'utf8'));}catch{return{};} }
function save(obj){ fs.mkdirSync(path.dirname(FILE), {recursive:true}); fs.writeFileSync(FILE, JSON.stringify(obj,null,2)); }
async function get(name){ const db=load(); return db[name?.toLowerCase()]||null; }
async function set(name, level){ const db=load(); db[name.toLowerCase()] = Number(level); save(db); return true; }
async function all(){ return load(); }
module.exports = { get, set, all };
