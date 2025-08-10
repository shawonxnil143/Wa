// utils/sessionStore.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  files: { type: Object, default: {} }, // { filename: base64 }
}, { collection: 'wa_sessions' });

const Session = mongoose.model('Session', SessionSchema);

async function backupAuthDir(authDir, logger=console) {
  try {
    const files = {};
    if (!fs.existsSync(authDir)) return;
    for (const f of fs.readdirSync(authDir)) {
      const full = path.join(authDir, f);
      if (fs.statSync(full).isFile()) {
        files[f] = fs.readFileSync(full).toString('base64');
      }
    }
    await Session.updateOne({ _id: 'default' }, { $set: { files } }, { upsert: true });
    logger.info('🔐 Session backup saved to MongoDB');
  } catch (e) {
    logger.error('Session backup failed: ' + e.message);
  }
}

async function restoreAuthDir(authDir, logger=console) {
  try {
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    const doc = await Session.findById('default').lean();
    if (!doc || !doc.files) return false;
    for (const [name, b64] of Object.entries(doc.files)) {
      fs.writeFileSync(path.join(authDir, name), Buffer.from(b64, 'base64'));
    }
    logger.info('🔐 Session restored from MongoDB');
    return true;
  } catch (e) {
    logger.error('Session restore failed: ' + e.message);
    return false;
  }
}

module.exports = { backupAuthDir, restoreAuthDir };
