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
  name: "setbal",
  aliases: ["setbalance"],
  role: "owner", // only owner can use
  usage: "setbal @user <amount>",
  desc: "💼 Set a user's balance (Owner only)",
  run: async ({ m, args, mentionedJid }) => {
    if (!mentionedJid || mentionedJid.length === 0) {
      return m.reply("❌ Mention a user to set balance.\nExample: setbal @user 500");
    }
    const amount = parseInt(args[1] || "0");
    if (!amount || amount < 0) {
      return m.reply("❌ Enter a valid balance amount.");
    }

    let db = loadDB();
    const target = mentionedJid[0];
    db[target] = amount;
    saveDB(db);

    return m.reply(`✅ Balance of @${target.split('@')[0]} set to ${amount} coins.`, { mentions: [target] });
  }
};
