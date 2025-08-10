// commands/tools/poli.js
// Generates an image using Poli API and sends it back.
// Usage: !poli <prompt>
// Example: !poli a cat astronaut on the moon

const axios = require("axios");

module.exports = {
  name: "poli",
  aliases: ["pimg", "polimg"],

  run: async ({ sock, m, jid, args, CONFIG, logger }) => {
    try {
      // prompt resolve: args or replied text
      let prompt = (args && args.length) ? args.join(" ") : "";
      const quotedText =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        "";

      if (!prompt && quotedText) prompt = quotedText.trim();

      if (!prompt) {
        return sock.sendMessage(
          jid,
          { text: `Give me a prompt!\nExample: ${CONFIG.prefix}poli a cat wearing sunglasses` },
          { quoted: m }
        );
      }

      const API_KEY =
        process.env.POLI_API_KEY ||
        "92dfd003-fe2d-4c30-9f0b-cc4532177838"; // ⚠️ প্রোডে .env ব্যবহার করো

      const BASE_URL =
        process.env.POLI_API_BASE ||
        "https://kaiz-apis.gleeze.com/api/poli";

      const url = `${BASE_URL}?prompt=${encodeURIComponent(prompt)}&apikey=${encodeURIComponent(API_KEY)}`;

      // API returns raw image bytes
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: { "User-Agent": "IrfanBot/poli" },
        validateStatus: s => s >= 200 && s < 400
      });

      const imgBuffer = Buffer.from(res.data);

      await sock.sendMessage(
        jid,
        { image: imgBuffer, caption: `🧪 Poli Image\n📝 Prompt: ${prompt}` },
        { quoted: m }
      );
    } catch (err) {
      logger?.error?.(err);
      const msg = (err?.response?.status)
        ? `HTTP ${err.response.status} – Poli API error`
        : (err?.message || "Poli request failed");
      await sock.sendMessage(jid, { text: `❌ ${msg}` }, { quoted: m });
    }
  }
};
