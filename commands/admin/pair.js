// commands/admin/pair.js
const fs = require('fs');
const path = require('path');

module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: "pair",
  run: async ({ sock, m, jid, args, CONFIG, logger
}) => {
    try {
      const sender = m.key?.participant || m.key?.remoteJid;
      const isOwner = (CONFIG.owner || []).some(o => (o+'').replace(/\D/g,'') === (sender||'').replace(/\D/g,''));
      if (!isOwner) return sock.sendMessage(jid, { text: 'Only owner can request a pairing code.' }, { quoted: m });

      const authDir = path.join(process.cwd(), 'auth');
      const hasCreds = fs.existsSync(path.join(authDir, 'creds.json'));
      if (hasCreds) return sock.sendMessage(jid, { text: 'Session already exists. Delete auth/ to re-pair.' }, { quoted: m });

      const phoneArg = args[0] ? args[0].replace(/\D/g,'') : (CONFIG.botNumber || '').replace(/\D/g,'');
      if (!phoneArg) return sock.sendMessage(jid, { text: 'Provide a phone with country code, e.g., 6598840792' }, { quoted: m });

      const code = await sock.requestPairingCode(phoneArg);
      await sock.sendMessage(jid, { text: `🔐 Pairing Code: *${code}*\nOpen WhatsApp → Linked devices → Link with phone number.` }, { quoted: m });
    } catch (e) {
      logger?.error?.(e);
      await sock.sendMessage(jid, { text: `❌ ${e.message}` }, { quoted: m });
    }
  }
};
