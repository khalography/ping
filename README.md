# Ping

Telegram channel digests plus voice and AI-drafted replies, on Even Realities G2 glasses.

Built for the Even Realities "Heads Up" hackathon on DoraHacks, Messaging & News track. Build week 23-29 November 2026.

## What it does

Ping shows a short digest of your Telegram channels on the glasses. Tap cycles through the items; tapping past the last item pulls a fresh digest; double-tap exits.

- **Digest:** the backend (`backend/api/digest.ts`) reads the newest messages the Ping bot can see and returns them as JSON. The app fetches it on start and renders the first item.
- **Offline fallback:** if the backend cannot be reached, the app shows clearly marked sample items, so the UI stays demoable.
- **Voice replies:** planned, not built yet. The manifest already requests the `g2-microphone` permission.

## Run

```bash
npm install
npm run dev
```

Then either:

- **Simulator:** `npm run simulate` (or start the simulator with `--automation-port 9898` to drive taps from a script)
- **Real glasses:** `npx evenhub qr --url http://<your-ip>:5174` and scan with the Even Hub companion app.

## Pack for distribution

```bash
npm run pack
```

Produces an `.ehpk` file.

## Backend

The backend is a single Vercel serverless function, `backend/api/digest.ts`. Deploy it as its own Vercel project with the root directory set to `backend`, then set the `TELEGRAM_BOT_TOKEN` environment variable in the Vercel dashboard and redeploy. The app calls `https://ping-backend.vercel.app/api/digest`; that address is whitelisted in `app.json`.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | WebView host. |
| `src/main.ts` | Digest UI: fetch, render, tap to cycle, refresh on wrap, double-tap to exit. |
| `app.json` | Even Hub manifest. Network permission whitelists the backend; `g2-microphone` for voice replies. |
| `backend/api/digest.ts` | Vercel function: Telegram `getUpdates` turned into a short digest. |
| `backend/docs/wiring-plan.md` | Backend deploy plan and open questions. |
| `backend/package.json` | Backend package marker for Vercel. |
| `package.json` / `package-lock.json` | App dependencies and scripts. |
| `tsconfig.json` | Standard Vite vanilla-ts config. |
| `vite.config.ts` | Dev server on port 5173 by default; the Ping dev server runs on 5174. |

## What existed before 23 November 2026

The Even Hub minimal starter template (Vite + TypeScript + SDK + CLI + simulator, one text container) and the Telegram bot `@ping_g2_bot` with its test group and feed channel. The digest UI, the backend function, and the wiring plan were built during build week.

## Status

- Digest UI built and verified in the simulator (tap advances the digest).
- Backend written, not deployed yet.
- Voice reply path not built yet.
