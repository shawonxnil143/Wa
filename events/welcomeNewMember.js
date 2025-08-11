// events/welcomeNewMember.js
// Sends a welcome message whenever new participants are added to a group.

module.exports = function init({ sock, CONFIG, logger }) {
  const enabled = CONFIG?.features?.welcome !== false; // default on unless explicitly false
  if (!enabled) {
    logger?.info?.("welcomeNewMember disabled via config.features.welcome === false");
    return;
  }

  sock.ev.on("group-participants.update", async (ev) => {
    try {
      // We only care when action is 'add' (new members joined/added)
      if (ev.action !== "add" || !Array.isArray(ev.participants) || !ev.participants.length) return;

      // Basic metadata (subject, etc.)
      const meta = await sock.groupMetadata(ev.id).catch(() => null);
      const subject = meta?.subject || "this group";

      // Build mentions + text for multiple participants
      const mentions = [];
      const tags = ev.participants.map(j => {
        const tag = "@" + (String(j).split("@")[0] || "");
        mentions.push(j);
        return tag;
      });

      const prefix = CONFIG?.prefix || "!";
      const owners = Array.isArray(CONFIG?.owner) ? CONFIG.owner.join(", ") : (CONFIG?.owner || "");
      const lang = CONFIG?.language || "en";
      const dashUrl = CONFIG?.dashboard?.url || `http://localhost:${process.env.PORT || 10000}`;

      // Optional: custom welcome template in config (CONFIG.features.welcomeTemplate)
      // You can put something like:
      // "features": { "welcome": true, "welcomeTemplate": "Hey {users}, welcome to *{group}*!" }
      const tpl = (CONFIG?.features?.welcomeTemplate) || 
`ðŸŽ‰ *Welcome* {users} to *{group}*!
â€¢ Prefix: \`${prefix}\`
â€¢ Try: \`${prefix}help\` to see commands
â€¢ Owner(s): ${owners}
â€¢ Language: ${lang}
â€¢ Dashboard: ${dashUrl}

Enjoy your stay!`;

      const text = tpl
        .replace(/{users}/g, tags.join(", "))
        .replace(/{group}/g, subject);

      await sock.sendMessage(
        ev.id,
        { text, mentions },
      );
      logger?.info?.(`Welcome sent to ${tags.join(", ")} in ${subject}`);
    } catch (e) {
      logger?.error?.("welcomeNewMember error: " + (e?.message || e));
    }
  });
};
