// events/welcomeOnJoin.js
module.exports = function init({ sock, CONFIG, logger }) {
  // helper: normalize our JID
  const myJid = (() => {
    try {
      const raw = sock?.user?.id || "";                 // e.g. "12345:1@s.whatsapp.net"
      const num = raw.split("@")[0].split(":")[0];       // "12345"
      return `${num}@s.whatsapp.net`;
    } catch { return ""; }
  })();

  sock.ev.on("group-participants.update", async (ev) => {
    try {
      // Only care when someone is added AND that someone is the bot itself
      if (ev.action !== "add" || !Array.isArray(ev.participants)) return;
      if (!myJid || !ev.participants.includes(myJid)) return;

      // Fetch group metadata to show subject and admins
      const meta = await sock.groupMetadata(ev.id);
      const admins = (meta.participants || [])
        .filter(p => p.admin) // 'admin' | 'superadmin'
        .map(p => "@" + (p.id || "").split("@")[0]);

      // Build message
      const owners = Array.isArray(CONFIG.owner) ? CONFIG.owner.join(", ") : (CONFIG.owner || "");
      const dashUrl = CONFIG.dashboard?.url || `http://localhost:${process.env.PORT || 10000}`;
      const prefix = CONFIG.prefix || "!";
      const botNum = CONFIG.botNumber || "Not set";

      let text = `👋 *Hello ${meta.subject}*!\n`;
      text += `\n🤖 *${CONFIG.botName}* is now active in this group.`;
      text += `\n• Prefix: \`${prefix}\``;
      text += `\n• Bot Number: ${botNum}`;
      text += `\n• Owner(s): ${owners}`;
      text += `\n• Dashboard: ${dashUrl}`;
      text += `\n• Help: type \`${prefix}help\``;
      if (admins.length) text += `\n\n👮 *Group Admins:* ${admins.join(", ")}`;

      await sock.sendMessage(
        ev.id,
        { text, mentions: admins.map(a => a.replace("@", "") + "@s.whatsapp.net") },
      );
      logger?.info?.(`Sent join-welcome to ${meta.subject}`);
    } catch (e) {
      logger?.error?.(`welcomeOnJoin error: ${e.message}`);
    }
  });
};
