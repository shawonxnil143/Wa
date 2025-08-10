// commands/tools/alldown.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  usage: '',
  aliases: [],
  desc: 'No description',
  prefix: true,
  role: 1,
  name: "alldown",
  /**
   * Usage:
   *   !alldown <url>
   * Example:
   *   !alldown https://www.facebook.com/... (বা যেকোনো সমর্থিত লিঙ্ক)
   */
  run: async ({ sock, m, jid, args, logger
}) => {
    try {
      const url = (args[0] || "").trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        return sock.sendMessage(jid, {
          text: "Please provide a valid URL.\nUsage: !alldown <url>"
        }, { quoted: m });
      }

      // fetch metadata / video links
      const { data } = await axios.get(
        `https://nayan-video-downloader.vercel.app/alldown`,
        { params: { url } }
      );

      const info = data && data.data;
      if (!info || !info.low) {
        return sock.sendMessage(jid, {
          text: "❌ Failed to fetch video details. Try another link."
        }, { quoted: m });
      }

      const videoUrl = info.low;          // low quality url
      const title = info.title || "Video";
      const tmpFile = path.join("/tmp", `video_${Date.now()}.mp4`);

      // stream download to /tmp (Render-friendly)
      const resp = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tmpFile);
      resp.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // send video
      await sock.sendMessage(jid, {
        video: fs.readFileSync(tmpFile),
        caption: `🎥 *${title}*\nSource: ${url}`
      }, { quoted: m });

      // cleanup
      fs.unlink(tmpFile, () => {});
    } catch (err) {
      logger?.error?.(err);
      await sock.sendMessage(jid, {
        text: `❌ Error: ${err?.message || "download failed"}`
      }, { quoted: m });
    }
  }
};
