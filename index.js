// Load env variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const chalk = require('chalk');
const boxen = require('boxen');
const NodeCache = require('node-cache');
const P = require('pino');
const { connectDB } = require('./utils/database');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

// Load config
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// MongoDB Connect
if (CONFIG.database?.enabled) {
  connectDB(process.env.MONGO_URI || CONFIG.database.mongoURI);
} else {
  console.log(chalk.yellow('⚠ MongoDB Disabled in config.json'));
}

// Logger & cache
const logger = P({ level: 'info' });
const cooldown = new NodeCache({ stdTTL: 1.5, checkperiod: 2 });
let STATE = { connected: false };

// --- Web server for Render ---
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (_, res) => res.redirect('/index.html'));
app.get('/health', (_, res) => res.json({ ok: true, uptime: process.uptime() }));
app.listen(PORT, () => console.log(chalk.green(`🌐 HTTP Server running on port ${PORT}`)));

// --- Load Commands ---
function loadCommands(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try {
      const mod = require(path.join(dir, file));
      if (mod?.name && typeof mod.run === 'function') {
        map.set(mod.name, mod);
        console.log(chalk.green(`✔ Command Loaded: ${mod.name}`));
      } else {
        console.log(chalk.yellow(`⚠ Skipped: ${file} (invalid format)`));
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to load ${file}: ${err.message}`));
    }
  }
  return map;
}

const commands = new Map([
  ...loadCommands(path.join(__dirname, 'commands/core')),
  ...loadCommands(path.join(__dirname, 'commands/admin')),
  ...loadCommands(path.join(__dirname, 'commands/tools')),
  ...loadCommands(path.join(__dirname, 'commands/fun')),
]);

// --- Banner ---
const banner = boxen(
  [
    `Bot       : ${CONFIG.botName}`,
    `Owner     : ${CONFIG.owner.join(', ')}`,
    `Prefix    : ${CONFIG.prefix}`,
    `Login     : Pairing Code`,
    `Language  : ${CONFIG.language}`,
    `PORT      : ${PORT}`
  ].join('\n'),
  { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
);
console.log(chalk.cyan(banner));

// --- Start Bot ---
let restarting = false;
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth'));
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Safari'),
    syncFullHistory: false
  });

  // Show Pairing Code if no creds
  if (!fs.existsSync(path.join(__dirname, 'auth', 'creds.json')) && CONFIG.features.pairingCode) {
    try {
      const phone = (CONFIG.botNumber || '').replace(/[^0-9]/g, '');
      if (!phone) throw new Error('Set botNumber in config.json with country code.');
      const code = await sock.requestPairingCode(phone);
      console.log(
        boxen(`PAIRING CODE\n${code}\n\nOpen WhatsApp ➜ Linked Devices ➜ Link with phone number`, {
          padding: 1,
          borderColor: 'magenta'
        })
      );
    } catch (e) {
      console.error(chalk.red(`❌ Pairing code error: ${e.message}`));
    }
  }

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      STATE.connected = true;
      console.log(chalk.green('✅ Connected to WhatsApp'));
    }
    if (connection === 'close') {
      STATE.connected = false;
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.status;
      console.error(chalk.red(`❌ Connection closed: ${reason}`));
      if (reason !== DisconnectReason.loggedOut && !restarting) {
        restarting = true;
        setTimeout(() => {
          restarting = false;
          start();
        }, 1200);
      }
    }
  });

  // Handle Messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m?.message || m.key.fromMe) return;
    const jid = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

    if (CONFIG.features.autoRead) sock.readMessages([m.key]).catch(() => {});

    if (!text.startsWith(CONFIG.prefix)) return;
    const [name, ...args] = text.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const cmd = commands.get(name?.toLowerCase());
    if (!cmd) return;

    const key = `${name}:${m.key.participant || jid}`;
    if (cooldown.get(key)) return;
    cooldown.set(key, true);

    try {
      if (CONFIG.features.typingIndicator) await sock.sendPresenceUpdate('composing', jid);
      await cmd.run({ sock, m, jid, args, CONFIG, logger });
    } catch (e) {
      console.error(chalk.red(`❌ Command Error: ${e.message}`));
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m });
    } finally {
      if (CONFIG.features.typingIndicator) await sock.sendPresenceUpdate('paused', jid);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

start().catch(e => console.error(chalk.red(e)));
