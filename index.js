/**
 * IrfanBot Render Pro
 * - CommonJS (Node 18/20 friendly)
 * - Robust error handling & reconnection
 * - Pairing-code login, plugin system, health endpoint
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const chalk = require('chalk');
const P = require('pino');
const NodeCache = require('node-cache');
const boxenModule = require('boxen');
const boxen = (typeof boxenModule === 'function') ? boxenModule : boxenModule.default;
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const LANG = (function(){
  try { return JSON.parse(fs.readFileSync(path.join(__dirname,'locales',`${CONFIG.language}.json`),'utf8')); }
  catch { return { welcome: 'Welcome @user!', goodbye: 'Goodbye @user', error: 'Error: @error' }; }
})();

const logger = P({ level: 'info' });
const cooldown = new NodeCache({ stdTTL: 1.5, checkperiod: 2 });

// Health server for Render keeps app "web service" alive and exposes /health, /metrics
const app = express();
app.get('/', (_,res)=>res.send('IrfanBot is running.'));
app.get('/health', (_,res)=>res.json({ ok:true, uptime: process.uptime() }));
app.get('/metrics', (_,res)=>res.json({ memory: process.memoryUsage(), pid: process.pid }));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => logger.info(`HTTP server on :${PORT}`));

// Pretty banner
const banner = boxen(
  [
    `Bot       : ${CONFIG.botName}`,
    `Owner     : ${CONFIG.owner.join(', ')}`,
    `Prefix    : ${CONFIG.prefix}`,
    `Login     : Pairing Code`,
    `Language  : ${CONFIG.language}`
  ].join('\n'),
  { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
);
console.log(chalk.cyan(banner));

// Global error guards
process.on('uncaughtException', e => logger.error({err:e}, 'uncaughtException'));
process.on('unhandledRejection', e => logger.error({err:e}, 'unhandledRejection'));

// Plugin loader (CommonJS require)
function loadCommands(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))) {
    try {
      const mod = require(path.join(dir, file));
      if (mod?.name && typeof mod.run === 'function') {
        map.set(mod.name, mod);
        logger.info(`✔ Loaded command: ${mod.name}`);
      }
    } catch (e) {
      logger.error(`Failed to load ${file}: ${e.message}`);
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

let restarting = false;
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname,'auth'));
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Safari'),
    syncFullHistory: false
  });

  // Pairing on first run
  if (!fs.existsSync(path.join(__dirname,'auth','creds.json')) && CONFIG.features.pairingCode) {
    try {
      const phone = (CONFIG.botNumber || '').replace(/[^0-9]/g,'');
      if (!phone) throw new Error('Set botNumber in config.json with country code.');
      const code = await sock.requestPairingCode(phone);
      console.log(boxen(`PAIRING CODE\n${code}\nOpen WhatsApp ➜ Linked devices ➜ Link with phone number`, { padding: 1, borderColor: 'magenta' }));
    } catch (e) {
      logger.error(`Pairing code error: ${e.message}`);
    }
  }

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') logger.info('✅ Connected');
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.status || lastDisconnect?.error;
      logger.error(`Connection closed: ${reason}`);
      if (reason !== DisconnectReason.loggedOut && !restarting) {
        restarting = true;
        setTimeout(() => { restarting = false; start(); }, 1500);
      }
    }
  });

  // Anti-call
  if (CONFIG.features.antiCall) {
    sock.ev.on('CB:call', async (json) => {
      const from = json?.content?.[0]?.attrs?.from;
      if (from) {
        await sock.sendMessage(from, { text: 'Calls are not allowed. You are being blocked.' }).catch(()=>{});
        await sock.updateBlockStatus(from, 'block').catch(()=>{});
      }
    });
  }

  // Group participants welcome/goodbye
  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const meta = await sock.groupMetadata(ev.id);
      if (ev.action === 'add' && CONFIG.features.welcome) {
        for (const u of ev.participants) {
          const msg = (LANG.welcome || 'Welcome @user')
            .replace('@user', `@${u.split('@')[0]}`)
            .replace('@subject', meta.subject || 'Group')
            .replace('@count', String(meta.participants.length));
          await sock.sendMessage(ev.id, { text: msg, mentions: [u] });
        }
      }
      if (ev.action === 'remove' && CONFIG.features.goodbye) {
        for (const u of ev.participants) {
          const msg = (LANG.goodbye || 'Goodbye @user').replace('@user', `@${u.split('@')[0]}`);
          await sock.sendMessage(ev.id, { text: msg, mentions: [u] });
        }
      }
    } catch {}
  });

  // Messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m?.message || m.key.fromMe) return;
    const jid = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    if (CONFIG.features.autoRead) sock.readMessages([m.key]).catch(()=>{});

    // Anti-link (basic)
    if (CONFIG.features.antiLink?.enabled && /chat\.whatsapp\.com\/[0-9A-Za-z]+/i.test(text) && jid.endsWith('@g.us')) {
      const act = CONFIG.features.antiLink.action;
      try {
        if (act === 'delete') await sock.sendMessage(jid, { delete: m.key });
        else if (act === 'kick') await sock.groupParticipantsUpdate(jid, [m.key.participant], 'remove');
        else await sock.sendMessage(jid, { text: 'Group invite links are not allowed.' }, { quoted: m });
      } catch {}
      return;
    }

    if (!text.startsWith(CONFIG.prefix)) return;
    const [name, ...args] = text.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const cmd = commands.get(name?.toLowerCase());
    if (!cmd) return;

    const key = `${name}:${m.key.participant || jid}`;
    if (cooldown.get(key)) return; cooldown.set(key, true);

    try {
      if (CONFIG.features.typingIndicator) await sock.sendPresenceUpdate('composing', jid);
      await cmd.run({ sock, m, jid, args, CONFIG, LANG, logger });
    } catch (e) {
      logger.error(e);
      await sock.sendMessage(jid, { text: (LANG.error || 'Error: @error').replace('@error', e.message) }, { quoted: m });
    } finally {
      if (CONFIG.features.typingIndicator) await sock.sendPresenceUpdate('paused', jid);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}
start().catch(e => logger.error(e));