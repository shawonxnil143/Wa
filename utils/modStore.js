
// utils/modStore.js
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'moderators.json');
function load(){ try{return JSON.parse(fs.readFileSync(FILE,'utf8'));}catch{return{mods:[]}} }
function save(obj){ fs.mkdirSync(path.dirname(FILE), {recursive:true}); fs.writeFileSync(FILE, JSON.stringify(obj,null,2)); }
async function list(configMods=[]){ const l=load(); const base = Array.isArray(configMods)?configMods:[]; const extra = Array.isArray(l.mods)?l.mods:[]; return Array.from(new Set([...base, ...extra])); }
async function add(num){ const l=load(); if(!l.mods.includes(num)) l.mods.push(num); save(l); return true; }
async function remove(num){ const l=load(); l.mods = (l.mods||[]).filter(n=>n!==num); save(l); return true; }
module.exports = { list, add, remove };
