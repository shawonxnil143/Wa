// IrfanBot – Full Feature (Render-ready, real dashboard)
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const chalk = require('chalk');
const P = require('pino');
const NodeCache = require('node-cache');

// Boxen (ESM/CommonJS safe)
const boxenModule = require('boxen');
const boxen = (typeof boxenModule === 'function') ? boxenModule : boxenModule.default;

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

// ---------- Load & hold config ----------
const CONFIG_PATH = path.join(__dirname, 'config.json');
let CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// ---------- Logger, state ----------
const logger = P({ level: 'info' });
const cooldown = new NodeCache({ stdTTL: 1.5, checkperiod: 2 });
let STATE = { connected: false };

// ---------- Optional MongoDB connect ----------
let connectDB = null;
try { ({ connectDB } = require('./utils/database')); } catch {}
(async () => {
  if (CONFIG.database?.enabled) {
    if (typeof connectDB === 'function') {
      const uri = process.env.MONGO_URI || CONFIG.database.mongoURI || '';
      if (!uri) console.log(chalk.yellow('⚠ MongoDB enabled but URI missing (set config.database.mongoURI or MONGO_URI)'));
      else await connectDB(uri);
    } else {
      console.log(chalk.yellow('⚠ utils/database.js not found — skipping MongoDB connect.'));
    }
  } else {
    console.log(chalk.yellow('⚠ MongoDB Disabled in config.json'));
  }
})();

// ---------- Web server (Dashboard) ----------
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (_, res) => res.redirect('/index.html'));
app.get('/health', (_, res) => res.json({ ok: true, uptime: process.uptime() }));

// ⬅️ index.html এখন ফ্ল্যাট config এক্সপেক্ট করছে, তাই এখানে টপ-লেভেল config ফেরত দিচ্ছি
app.get('/status', (_, res) => {
  try {
    // প্রতিবার টাটকা ফাইল থেকে পড়ি, যাতে অন্য কোথাও সেভ করলে UI রিফ্রেশে দেখা যায়
    const fresh = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    CONFIG = fresh;
    res.json({
      // UI যা চায় সেই ফ্ল্যাট কীসমূহ
      botName: fresh.botName,
      prefix: fresh.prefix,
      botNumber: fresh.botNumber,
      language: fresh.language,
      // চাইলে এগুলোও ইউজ করতে পারো
      owner: fresh.owner,
      features: fresh.features,
      database: fresh.database,
      connected: STATE.connected
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/logs/tail', (_, res) => {
  try {
    // তুমি চাইলে latest.log বা logs/app.log—যেটা আছে সেটাই দেখাও
    const candidates = [
      path.join(__dirname, 'logs', 'app.log'),
      path.join(__dirname, 'latest.log')
    ];
    let data = 'No logs yet.';
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        data = fs.readFileSync(p, 'utf8');
        break;
      }
    }
    res.type('text/plain').send((data.split('\n').slice(-200).join('\n')) || 'No logs yet.');
  } catch {
    res.type('text/plain').send('No logs.');
  }
});

function checkAdminKey(req) {
  const key = req.header('X-Admin-Key');
  const need = process.env[CONFIG.dashboard?.adminKeyEnv || 'ADMIN_KEY'];
  return need && key && key === need;
}

// index.html থেকে যা পাঠাচ্ছে (botName, prefix, botNumber, language) + চাইলে ফিচার/ডিবিও সাপোর্ট
app.post('/dashboard/save', (req, res) => {
  if (!checkAdminKey(req)) return res.status(401).json({ ok: false, error: 'Invalid admin key' });
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const { botName, prefix, botNumber, language, features, database, owner } = req.body || {};

    if (botName) cfg.botName = String(botName);
    if (prefix) cfg.prefix = String(prefix);
    if (botNumber) cfg.botNumber = String(botNumber);
    if (language) cfg.language = String(language);
    if (Array.isArray(owner)) cfg.owner = owner;

    if (features && typeof features === 'object') {
      cfg.features = cfg.features || {};
      for (const [k, v] of Object.entries(features)) {
        if (cfg.features[k] && typeof cfg.features[k] === 'object') cfg.features[k].enabled = !!v;
        else cfg.features[k] = !!v;
      }
    }

    if (database && typeof database === 'object') {
      cfg.database = cfg.database || {};
      if ('enabled' in database) cfg.database.enabled = !!database.enabled;
      if ('sessionBackup' in database) cfg.database.sessionBackup = !!database.sessionBackup;
      if ('mongoURI' in database) cfg.database.mongoURI = String(database.mongoURI || '');
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    CONFIG = cfg; // ইন-মেমরি আপডেট
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => logger.info(`HTTP server on :${PORT}`));

// ---------- Banner ----------
const banner = boxen(
  [
    `Bot       : ${CONFIG.botName}`,
    `Owner     : ${CONFIG.owner?.join(', ') || ''}`,
    `Prefix    : ${CONFIG.prefix}`,
    `Login     : Pairing Code`,
    `Language  : ${CONFIG.language}`,
    `PORT      : ${PORT}`
  ].join('\n'),
  { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
);
console.log(chalk.cyan(banner));

// ---------- Command loader (with logs) ----------
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
console.log(chalk.green(`✅ Total Commands: ${commands.size}`));

// ---------- Bot core ----------
process.on('uncaughtException', e => {
  if (String(e?.message || '').includes('tried remove, but no previous op')) {
    logger.warn('Baileys sync mismatch warning (ignored)');
  } else {
    logger.error(e);
  }
});
process.on('unhandledRejection', e => logger.error(e));

let restarting = false;

async function start() {
  const authDir = path.join(__dirname, 'auth');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Safari'),
    syncFullHistory: false
  });

  // Pairing code (connecting/open + 8 retries)
  let pairingShown = false;
  let connState = 'init';
  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function showPairingCodeWhenReady() {
    if (pairingShown) return;
    const noSession = !fs.existsSync(path.join(authDir, 'creds.json'));
    if (!CONFIG.features?.pairingCode || !noSession) return;

    const phone = (CONFIG.botNumber || '').replace(/[^0-9]/g, '');
    if (!phone) return logger.error('Set botNumber in config.json with country code.');

    for (let i = 1; i <= 8; i++) {
      if (connState !== 'connecting' && connState !== 'open') {
        await delay(600);
      }
      try {
        const code = await sock.requestPairingCode(phone);
        console.log(boxen(
          `PAIRING CODE (try ${i})\n${code}\nOpen WhatsApp ➜ Linked devices ➜ Link with phone number`,
          { padding: 1, borderColor: 'magenta' }
        ));
        pairingShown = true;
        break;
      } catch (e) {
        logger.error(`Pairing code error (try ${i}): ${e.message}`);
        await delay(1500);
      }
    }
  }

  sock.ev.on('connection.update', async (u) => {
    if (u.connection) connState = u.connection;
    const { connection, lastDisconnect } = u;

    if (connection === 'connecting' || connection === 'open') {
      setTimeout(showPairingCodeWhenReady, 700);
    }

    if (connection === 'open') {
      STATE.connected = true;
      logger.info('✅ Connected');
    }

    if (connection === 'close') {
      STATE.connected = false;
      const reason = lastDisconnect?.error?.output?.statusCode ||
                     lastDisconnect?.error?.status ||
                     lastDisconnect?.error;
      logger.error(`Connection closed: ${reason}`);
      if (reason !== DisconnectReason.loggedOut && !restarting) {
        restarting = true;
        setTimeout(() => { restarting = false; start(); }, 1200);
      }
    }
  });

  // safety: initial attempt
  setTimeout(showPairingCodeWhenReady, 1200);

  // Anti-call
  if (CONFIG.features?.antiCall) {
    sock.ev.on('CB:call', async (json) => {
      const from = json?.content?.[0]?.attrs?.from;
      if (from) {
        await sock.sendMessage(from, { text: 'Calls are not allowed. You are being blocked.' }).catch(() => {});
        await sock.updateBlockStatus(from, 'block').catch(() => {});
      }
    });
  }

  // Welcome/Goodbye
  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const meta = await sock.groupMetadata(ev.id);
      if (ev.action === 'add' && CONFIG.features?.welcome) {
        for (const u of ev.participants) {
          const msg = `Welcome @${u.split('@')[0]} to *${meta.subject}*!`;
          await sock.sendMessage(ev.id, { text: msg, mentions: [u] });
        }
      }
      if (ev.action === 'remove' && CONFIG.features?.goodbye) {
        for (const u of ev.participants) {
          await sock.sendMessage(ev.id, { text: `Goodbye @${u.split('@')[0]} 👋`, mentions: [u] });
        }
      }
    } catch {}
  });

  // Messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m?.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      '';

    if (CONFIG.features?.autoRead) sock.readMessages([m.key]).catch(() => {});

    // Anti-link in groups with allowlist
    if (CONFIG.features?.antiLink?.enabled && jid.endsWith('@g.us') && /https?:\/\//i.test(text)) {
      const allow = (CONFIG.features.antiLink.allowlist || []);
      const isAllowed = allow.some(d =>
        new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)
      );
      if (!isAllowed) {
        const act = CONFIG.features.antiLink.action;
        try {
          if (act === 'delete') await sock.sendMessage(jid, { delete: m.key });
          else if (act === 'kick') await sock.groupParticipantsUpdate(jid, [m.key.participant], 'remove');
          else await sock.sendMessage(jid, { text: 'Links are not allowed.' }, { quoted: m });
        } catch {}
        return;
      }
    }

    // Commands
    if (!text.startsWith(CONFIG.prefix)) return;
    const [name, ...args] = text.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const cmd = commands.get(name?.toLowerCase());
    if (!cmd) return;

    const key = `${name}:${m.key.participant || jid}`;
    if (cooldown.get(key)) return; cooldown.set(key, true);

    try {
      if (CONFIG.features?.typingIndicator) await sock.sendPresenceUpdate('composing', jid);
      await cmd.run({ sock, m, jid, args, CONFIG, logger });
    } catch (e) {
      logger.error(e);
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: m });
    } finally {
      if (CONFIG.features?.typingIndicator) await sock.sendPresenceUpdate('paused', jid);
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });
}

start().catch(e => logger.error(e));
