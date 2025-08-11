// commands/fun/bal.js
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/balances.json');

function loadDB() {
  if (!fs.existsSync(dbPath)) return {};
  return JSON.parse(fs.readFileSync(dbPath, 'utf8') || '{}');
}

module.exports = {
  prefix: true,
  role: 1,
  name: "bal",
  aliases: ["balance", "coins"],
  usage: "bal",
  desc: "💰 Check your balance",
  run: async ({ m
}) => {
    const db = loadDB();
    const uid = m.sender || m.key.participant || m.key.remoteJid;
    const bal = db[uid] || 100; // default balance
    return m.reply(`💰 Your balance: ${bal} coins.`);
  }
};
