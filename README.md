# 🚀 IrfanBot – WhatsApp Bot (Render Ready)

শক্তপোক্ত WhatsApp বট: ড্যাশবোর্ড + Pairing code login + MongoDB (optional) + **Dynamic Command Install** (Goat Bot স্টাইলে)।

---

## ✅ ফিচার
- **Pairing code login** (stable retry, no QR hassle)
- ড্যাশবোর্ড `/status`, `/health`, `/logs/tail`, `/dashboard/save`
- MongoDB optional (User data & session backup)
- Command loader (core/admin/tools/fun) + **runtime custom commands**
- Anti-link / Anti-call / Welcome / Goodbye / Typing / AutoRead
- লগ টেইল দেখার সুবিধা

---

## 📂 ফোল্ডার স্ট্রাকচার
```
project/
├─ index.js                # বট core + dashboard API
├─ config.json             # কনফিগ (botName, prefix, owner, botNumber, features, database)
├─ public/
│  └─ index.html           # রিয়েল ড্যাশবোর্ড (API থেকে ডেটা নেয়)
├─ commands/
│  ├─ core/                # বেসিক কমান্ড (help, ping, uptime…)
│  ├─ admin/               # অ্যাডমিন/owner কমান্ড (cmd manager সহ)
│  ├─ tools/               # ইউটিলিটি (alldown ইত্যাদি)
│  └─ fun/                 # মজার কমান্ড
├─ utils/
│  └─ database.js          # MongoDB connect (optional)
├─ auth/                   # WhatsApp সেশন (creds.json)
├─ logs/                   # app.log
└─ package.json
```

---

## ⚙️ কনফিগ (config.json)
```json
{
  "botName": "IrfanBot",
  "prefix": "!",
  "language": "en",
  "owner": ["+6585062351"],
  "botNumber": "+6598840792",
  "features": {
    "pairingCode": true,
    "autoRead": true,
    "typingIndicator": true,
    "welcome": true,
    "goodbye": true,
    "antiCall": true,
    "antiLink": {
      "enabled": true,
      "action": "warn",
      "allowlist": ["youtube.com", "facebook.com", "google.com"]
    }
  },
  "dashboard": { "enabled": true, "adminKeyEnv": "ADMIN_KEY" },
  "database": { "enabled": false, "mongoURI": "", "sessionBackup": false }
}
```

---

## 🚀 লোকাল রান
```bash
cp .env.example .env
npm i
node index.js
```

---

## ☁️ Render ডিপ্লয়
- Repo কানেক্ট → Node সার্ভিস
- Build Command: `npm ci`
- Start Command: `node index.js`
- Disks: `/opt/render/project/src/auth` (persistent session)
- Env Vars:
  ```
  PORT=10000
  ADMIN_KEY=<secret>
  MONGO_URI=<atlas-uri>   # optional
  ```

---

## 🧩 কমান্ড উদাহরণ

### 1) পিং (বেসিক)
```js
// commands/core/ping.js
module.exports = {
  name: "ping",
  run: async ({ sock, m, jid }) => {
    await sock.sendMessage(jid, { text: "Pong!" }, { quoted: m });
  }
};
```
```
!ping
```

---

### 2) আর্গুমেন্ট সহ
```js
// commands/tools/say.js
module.exports = {
  name: "say",
  run: async ({ sock, m, jid, args }) => {
    const msg = args.join(" ") || "Nothing to say!";
    await sock.sendMessage(jid, { text: msg }, { quoted: m });
  }
};
```
```
!say Irfan is the owner!
```

---

### 3) ছবি পাঠানো
```js
// commands/tools/photo.js
module.exports = {
  name: "photo",
  run: async ({ sock, m, jid }) => {
    await sock.sendMessage(jid, {
      image: { url: "https://picsum.photos/400" },
      caption: "Random Photo"
    }, { quoted: m });
  }
};
```
```
!photo
```

---

### 4) ভিডিও ডাউনলোড (alldown)
```js
// commands/tools/alldown.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "alldown",
  run: async ({ sock, m, jid, args }) => {
    if (!args[0]) return sock.sendMessage(jid, { text: "Give me a link!" }, { quoted: m });

    const url = args[0];
    const { data } = await axios.get(`https://nayan-video-downloader.vercel.app/alldown?url=${url}`);
    if (!data.data || !data.data.low) return sock.sendMessage(jid, { text: "Download failed!" }, { quoted: m });

    const filePath = path.join(__dirname, `temp_${Date.now()}.mp4`);
    const videoStream = await axios({ url: data.data.low, method: "GET", responseType: "stream" });
    const writer = fs.createWriteStream(filePath);

    videoStream.data.pipe(writer);
    writer.on("finish", async () => {
      await sock.sendMessage(jid, {
        video: { stream: fs.createReadStream(filePath) },
        caption: data.data.title
      }, { quoted: m });
      fs.unlinkSync(filePath);
    });
  }
};
```
```
!alldown https://www.youtube.com/watch?v=example
```

---

## 🧨 Runtime Command Install

**Owner** রানটাইমে নতুন কমান্ড ইনস্টল করতে পারবে:
```
!cmd install hello ```js
await sock.sendMessage(jid, { text: "Hello from runtime!" }, { quoted: m });
```
```
!hello
```

**লিস্ট দেখতে:**
```
!cmd list
```

**রিমুভ করতে:**
```
!cmd remove hello
```

**সব রিলোড করতে:**
```
!cmd reload
```

---

## 📦 প্রয়োজনীয় প্যাকেজ
```bash
npm i @whiskeysockets/baileys axios boxen chalk@4.1.2 dotenv express humanize-duration mongoose node-cache pino
npm i -D nodemon
```
