module.exports = {
  name: 'help',
  run: async ({ sock, jid, CONFIG }) => {
    const list = [
      '*Core*: help, ping, owner, prefix, uptime, system',
      '*Admin*: add, kick, promote, demote, mute, unmute',
      '*Tools*: sticker, toimg, quote',
      '*Fun*: eightball'
    ].join('\n');
    await sock.sendMessage(jid, { text: `*${CONFIG.botName}* Commands\n${list}` });
  }
};