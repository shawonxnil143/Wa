// commands/tools/flux.js
// Generates an image using Flux API and sends it back.
// Usage: !flux <prompt>
// Example: !flux a cyberpunk cat in neon city

const axios = require("axios");

module.exports = {
  usage: '',
  desc: 'No description',
  prefix: true,
  role: 1,
  name: "flux",
  // optional aliases: type !imgও কাজ করবে চাইলে
  aliases: ["img"],

  run: async ({ sock, m, jid, args, CONFIG, logger
}) => {
    try {
      // 1) Prompt resolve: arg বা reply টেক্সট
      let prompt = (args && args.length) ? args.join(" ") : "";
      const replyText =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        "";

      if (!prompt && replyText) prompt = replyText.trim();
      if (!prompt) {
        return sock.sendMessage(
          jid,
          { text: `Give me a prompt!\nExample: ${CONFIG.prefix}flux a cat astronaut on the moon` },
          { quoted: m }
        );
      }

      // 2) API key/endpoint (প্রেফার .env → না থাকলে নিচের ডিফল্ট)
      const API_KEY =
        process.env.FLUX_API_KEY ||
        "92dfd003-fe2d-4c30-9f0b-cc4532177838"; // NOTE: keep this private in production

      const BASE_URL =
        process.env.FLUX_API_BASE ||
        "https://kaiz-apis.gleeze.com/api/flux";

      const url = `${BASE_URL}?prompt=${encodeURIComponent(prompt)}&apikey=${encodeURIComponent(API_KEY)}`;

      // 3) Call Flux API (returns raw image bytes)
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: { "User-Agent": "IrfanBot/flux" },
        validateStatus: s => s >= 200 && s < 400
      });

      const imgBuffer = Buffer.from(res.data);

      // 4) Send image
      await sock.sendMessage(
        jid,
        { image: imgBuffer, caption: `🧪 Flux Image\n📝 Prompt: ${prompt}` },
        { quoted: m }
      );
    } catch (err) {
      logger?.error?.(err);
      const msg = (err?.response?.status)
        ? `HTTP ${err.response.status} – Flux API error`
        : (err?.message || "Flux request failed");
      await sock.sendMessage(jid, { text: `❌ ${msg}` }, { quoted: m });
    }
  }
};
