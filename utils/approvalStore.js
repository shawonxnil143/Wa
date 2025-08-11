
// utils/approvalStore.js
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'group_approval.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { approved:{}, pending:{} }; }
}
function save(obj) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

function ensure(obj){ if(!obj.approved) obj.approved={}; if(!obj.pending) obj.pending={}; }

async function addPending(jid, meta={}){
  const db = load(); ensure(db);
  db.pending[jid] = { jid, ...meta, addedAt: new Date().toISOString() };
  save(db); return true;
}
async function approve(jids=[]){
  const db = load(); ensure(db);
  const approved = [];
  for(const jid of jids){
    const meta = db.pending[jid] || { jid };
    delete db.pending[jid];
    db.approved[jid] = { ...meta, approvedAt: new Date().toISOString() };
    approved.push(jid);
  }
  save(db); return approved;
}
async function isApproved(jid){
  const db = load(); ensure(db);
  return Boolean(db.approved[jid]);
}
async function listPending(){ const db = load(); ensure(db); return Object.values(db.pending); }
async function listApproved(){ const db = load(); ensure(db); return Object.values(db.approved); }
async function unapprove(jid){ const db = load(); ensure(db); delete db.approved[jid]; save(db); return true; }

module.exports = { addPending, approve, isApproved, listPending, listApproved, unapprove };
