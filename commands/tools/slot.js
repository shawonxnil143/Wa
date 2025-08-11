// commands/fun/slot.js
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
  role: 1,
  name: "slot",
  aliases: ["slots", "spin"],
  usage: "slot <bet>",
  desc: "🎰 Play slot machine",
  run: async ({ m, args
}) => {
    const bet = parseInt(args[0] || "0");
    if (!bet || bet <= 0) return m.reply("❌ Enter a valid bet amount.");

    let db = loadDB();
    const uid = m.sender || m.key.participant || m.key.remoteJid;
    db[uid] = db[uid] || 100; // default balance

    if (db[uid] < bet) return m.reply("💸 Not enough balance.");

    const items = ["🍒", "🍋", "🍇", "7️⃣", "🍉", "⭐"];
    const roll = [
      items[Math.floor(Math.random() * items.length)],
      items[Math.floor(Math.random() * items.length)],
      items[Math.floor(Math.random() * items.length)]
    ];

    let result = roll.join(" | ");
    if (roll[0] === roll[1] && roll[1] === roll[2]) {
      const win = bet * 5;
      db[uid] += win;
      saveDB(db);
      return m.reply(`🎰 ${result} 🎰\n✨ JACKPOT! You won ${win} coins!\n💰 Balance: ${db[uid]}`);
    } else if (roll[0] === roll[1] || roll[1] === roll[2]) {
      const win = bet * 2;
      db[uid] += win;
      saveDB(db);
      return m.reply(`🎰 ${result} 🎰\n😊 Nice! You won ${win} coins!\n💰 Balance: ${db[uid]}`);
    } else {
      db[uid] -= bet;
      saveDB(db);
      return m.reply(`🎰 ${result} 🎰\n😢 You lost ${bet} coins.\n💰 Balance: ${db[uid]}`);
    }
  }
};
