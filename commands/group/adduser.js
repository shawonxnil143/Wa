// commands/group/adduser.js
module.exports = {
  usage: '',
  desc: 'No description',
  prefix: true,
  role: 2,
  name: "adduser",
  aliases: ["add", "aduser"],
  run: async ({ sock, m, jid, args, CONFIG
}) => {
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
      if (!isBotAdmin) return m.reply("❌ I must be an admin to add members.");

      if (!args[0]) return m.reply(`Usage: ${CONFIG.prefix}adduser <number with country code>`);

      const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";

      await sock.groupParticipantsUpdate(jid, [num], "add");
      m.reply(`✅ Added ${args[0]} to the group.`);
    } catch (e) {
      m.reply(`❌ Error: ${e.message}`);
    }
  }
};
