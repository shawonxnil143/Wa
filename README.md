# IrfanBot – Render Complete

- **CommonJS**, Node **18**
- Pairing-code login with **stable retry**
- **Dashboard** at `PORT`: `/`, `/status`, `/health`, `/logs/tail`, `/dashboard/save`
- **Optional MongoDB** for user data + **optional session backup/restore**
- `config.dev.json` → copied to `config.json` on Render build

## Local
```
cp .env.example .env
cp config.dev.json config.json
npm i
npm run dev    # or npm start
```
Dashboard: http://localhost:10000/

## Render
- `render.yaml` included (build: `npm ci && cp config.dev.json config.json`)
- Start: `npm start`
- Persistent Disk mount: `/opt/render/project/src/auth`
- Optional: set `MONGO_URI` secret

## MongoDB
- Toggle in `config.json` → `"database.enabled": true`
- URI from `config.database.mongoURI` or env `MONGO_URI`
- To back up session (avoid re-pair on restart), set `"database.sessionBackup": true`