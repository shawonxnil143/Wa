// commands/group/kick.js
module.exports = {
  name: "kick",
  aliases: ["remove"],
  run: async ({ sock, m, jid, args, CONFIG }) => {
    try {
      if (!jid.endsWith("@g.us")) {
        return m.reply("❌ This command only works in groups.");
      }

      // Must be group admin
      const meta = await sock.groupMetadata(jid);
      const sender = m.key.participant || m.participant || jid;
      const isAdmin = meta.participants.some(
        p => p.id === sender && ["admin", "superadmin"].includes(p.admin)
      );
      const isBotAdmin = meta.participants.some(
        p => p.id === sock.user.id && ["admin", "superadmin"].includes(p.admin)
      );

      if (!isAdmin) return m.reply("❌ You must be a group admin to use this.");
      if (!isBotAdmin) return m.reply("❌ I must be an admin to remove members.");

      let targets = [];

      if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        targets = m.message.extendedTextMessage.contextInfo.mentionedJid;
      } else if (args[0]) {
        targets = [args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net"];
      }

      if (!targets.length) return m.reply(`Usage: ${CONFIG.prefix}kick @user or ${CONFIG.prefix}kick <number>`);

      await sock.groupParticipantsUpdate(jid, targets, "remove");
      m.reply(`✅ Removed ${targets.length} member(s) from the group.`);
    } catch (e) {
      m.reply(`❌ Error: ${e.message}`);
    }
  }
};
