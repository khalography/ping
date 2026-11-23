# Ping backend — wiring plan (draft, 2026-11-20)

Status: the digest pipeline is proven end to end in chat (bot @ping_g2_bot,
id 9296978188, reads the "ping test" supergroup -1004295937452 as admin;
first digest built 2026-11-20 ~18:55 WAT from 2 messages). The G2 app UI
is built as of 2026-11-23 (build week day 1): `src/main.ts` fetches
`/api/digest` on start, renders the first item, tap cycles items, tapping
past the last item pulls a fresh digest, double-tap exits. If the backend
cannot be reached it shows clearly-marked offline sample items, so the UI
is demoable in the simulator before the backend is deployed. Build passes
(`tsc --noEmit && vite build`). Still to verify in the simulator: the
render and the tap-to-cycle gesture.

## Files

- `api/digest.ts` — Vercel serverless function, GET /api/digest. Calls
  Telegram getUpdates, returns the newest 10 text messages as
  `{ generatedAt, count, items: [{ chat, author, title, text, date }] }`.
  No token in the repo. It reads `TELEGRAM_BOT_TOKEN` from the Vercel
  project environment.
- `src/digest.ts` (draft, in `backend/docs/` sketch form — see below) —
  app-side fetch + render: fetch the endpoint, show "N new" plus the top
  item, tap cycles items, double-tap exits (same exit gesture as now).

## Deploy steps (needs Ibraheem, nothing to run yet)

1. Create a Vercel project from `backend/` (or link the existing
   ping-backend project to this folder).
2. In the Vercel dashboard only, set env var `TELEGRAM_BOT_TOKEN` to the
   bot token from BotFather. Never paste it in chat, never commit it.
   The token Muse holds is in the secure vault only; Vercel cannot read
   it from there, so this one manual step is unavoidable.
3. Deploy. The app's `app.json` already whitelists
   `https://ping-backend.vercel.app`, so no app change is needed for the
   network permission.
4. Wire `src/main.ts` to fetch `/api/digest` on start and render the
   first item, then verify in the simulator before the build week.

## App-side sketch (to paste into src/main.ts after review)

```ts
const res = await fetch('https://ping-backend.vercel.app/api/digest')
const digest = await res.json() // { count, items: [{ chat, author, title }] }
// render: `${digest.items[0]?.chat} · ${digest.count} new\n1. ${digest.items[0]?.title}`
// tap cycles digest.items; double-tap exits (keep existing gesture code).
```

## Open questions for Ibraheem

- Reply path is not in this draft: voice/AI-drafted replies need a POST
  endpoint (`/api/reply`) plus the draft-approval step. Build it after
  the read-only digest is verified on the glasses.
- Long polling vs getUpdates: the draft uses plain getUpdates (last 20).
  For the demo that is enough; a webhook would be the next step if the
  judges ask about live updates.
