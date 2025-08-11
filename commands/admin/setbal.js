// commands/admin/setbal.js
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/balances.json');

function loadDB() {
  if (!fs.existsSync(dbPath)) return {};
  return JSON.parse(fs.readFileSync(dbPath, 'utf8') || '{}');
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = {
  prefix: true,
  // Restrict this command to owners only. Removing the lower role
  // declaration prevents accidental privilege escalation.
  role: 'owner',
  name: 'setbal',
  aliases: ['setbalance'],
  usage: 'setbal @user <amount>',
  desc: '💼 Set a user\'s balance (Owner only)',
  run: async ({ m, args }) => {
    // Extract mentioned JIDs from the message context. WhatsApp embeds
    // mentioned users in the extendedTextMessage contextInfo. Fallback to an
    // empty array if none are found.
    const mentionList = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentionList.length) {
      return m.reply('❌ Mention a user to set balance.\nExample: setbal @user 500');
    }
    // Parse the amount from the second argument. Negative or zero amounts
    // are invalid.
    const amount = parseInt(args[1] || '0', 10);
    if (!amount || amount < 0) {
      return m.reply('❌ Enter a valid balance amount.');
    }

    // Load the balances database, update the target and persist.
    const db = loadDB();
    const target = mentionList[0];
    db[target] = amount;
    saveDB(db);

    return m.reply(
      `✅ Balance of @${target.split('@')[0]} set to ${amount} coins.`,
      { mentions: [target] }
    );
  }
};
