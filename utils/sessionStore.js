// Backup and restore session from MongoDB
const fs = require('fs');
const path = require('path');
const Session = require('../database/sessionModel');

async function backupAuthToDB(authDir) {
  const files = fs.readdirSync(authDir);
  for (const file of files) {
    const filePath = path.join(authDir, file);
    const data = fs.readFileSync(filePath, 'base64');
    await Session.findOneAndUpdate({ file, botNumber: (process.env.BOT_NUMBER || (require('../config.json').botNumber || '')) }, { data }, { upsert: true });
  }
  console.log('✅ Session backed up to DB');
}

async function restoreAuthFromDB(authDir) {
  const bn = (process.env.BOT_NUMBER || (require('../config.json').botNumber || ''));
  const sessions = await Session.find({ botNumber: bn });
  if (!sessions.length) return false;
  for (const s of sessions) {
    const filePath = path.join(authDir, s.file);
    fs.writeFileSync(filePath, Buffer.from(s.data, 'base64'));
  }
  console.log('✅ Session restored from DB');
  return true;
}

module.exports = { backupAuthToDB, restoreAuthFromDB };
