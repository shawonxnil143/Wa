const axios = require("axios");

module.exports = {
  name: "fluxr",
  aliases: ["fluxrep", "fr"],

  run: async ({ sock, m, jid, args, CONFIG, logger }) => {
    try {
      let prompt = (args && args.length) ? args.join(" ") : "";
      const quotedText =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        "";

      if (!prompt && quotedText) prompt = quotedText.trim();

      if (!prompt) {
        return sock.sendMessage(
          jid,
          { text: `Give me a prompt!\nExample: ${CONFIG.prefix}fluxr a cat astronaut on the moon` },
          { quoted: m }
        );
      }

      const API_KEY =
        process.env.FLUXR_API_KEY ||
        "92dfd003-fe2d-4c30-9f0b-cc4532177838";

      const BASE_URL =
        process.env.FLUXR_API_BASE ||
        "https://kaiz-apis.gleeze.com/api/flux-replicate";

      const url = `${BASE_URL}?prompt=${encodeURIComponent(prompt)}&apikey=${encodeURIComponent(API_KEY)}`;

      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 120000,
        headers: { "User-Agent": "IrfanBot/flux-replicate" },
        validateStatus: s => s >= 200 && s < 400
      });

      const imgBuffer = Buffer.from(res.data);

      await sock.sendMessage(
        jid,
        { image: imgBuffer, caption: `🖼️ Flux Replicate\n📝 Prompt: ${prompt}` },
        { quoted: m }
      );

    } catch (err) {
      logger?.error?.(err);
      const msg = (err?.response?.status)
        ? `HTTP ${err.response.status} – Flux Replicate API error`
        : (err?.message || "Flux Replicate request failed");
      await sock.sendMessage(jid, { text: `❌ ${msg}` }, { quoted: m });
    }
  }
};
