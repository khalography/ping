// Ping backend — GET /api/digest
// Draft, not deployed. Reads Telegram updates for the Ping bot and returns a
// short digest the G2 app can render. No token is stored in this repo: the
// bot token must be set as TELEGRAM_BOT_TOKEN in the Vercel project env vars
// (dashboard only, never pasted in chat or committed).
// Group chat id for the demo group "ping test" is -1004295937452; the
// endpoint filters to chats the bot can see and groups by chat title.

type TgMessage = {
  message_id: number;
  chat?: { id: number; title?: string; type?: string };
  from?: { username?: string; first_name?: string };
  text?: string;
  date?: number;
};

type TgUpdate = {
  update_id: number;
  message?: TgMessage;
};

function titleOf(m: TgMessage): string {
  const text = (m.text || '').trim();
  if (!text) return '(no text)';
  // Link posts: use the host + first line, e.g. "Minting tomorrow — x.com".
  const firstLine = text.split('\n')[0].slice(0, 80);
  const url = text.match(/https?:\/\/([^\s/]+)/);
  if (url) {
    const body = text.replace(/https?:\/\/\S+/, '').trim();
    return body ? `${body.slice(0, 60)} · ${url[1]}` : `Link · ${url[1]}`;
  }
  return firstLine;
}

export default async function handler(req: any, res: any) {
  // The G2 app fetches this from a different origin, so the response must
  // allow cross-origin reads, and preflight requests must be answered.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set on server' });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 50);
  const r = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?limit=${limit}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!r.ok) {
    res.status(502).json({ error: `Telegram ${r.status}` });
    return;
  }
  const data = await r.json();
  const items = ((data.result || []) as TgUpdate[])
    .map((u) => u.message)
    .filter((m): m is TgMessage => !!m && typeof m.text === 'string')
    .slice(-10)
    .reverse()
    .map((m) => ({
      chat: m.chat?.title || String(m.chat?.id || 'direct'),
      author: m.from?.username || m.from?.first_name || 'unknown',
      title: titleOf(m),
      text: (m.text || '').slice(0, 140),
      date: m.date ? m.date * 1000 : null,
    }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ generatedAt: new Date().toISOString(), count: items.length, items });
}
