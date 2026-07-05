// Vercel Cron: daily before market open, scans distinct symbols from holdings+watchlist
// and stores an AI sentiment take per symbol (Grok, no live search — not real-time tweets).
// Requires env: SUPABASE_SERVICE_ROLE_KEY, XAI_API_KEY, CRON_SECRET
// Add to vercel.json crons: { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" }
// (2:00 UTC = 7:30 AM IST, Mon–Fri, before market open)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const XAI_KEY     = process.env.XAI_API_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const MAX_SYMBOLS = 200;

interface Row { symbol: string; exchange: string; }
interface SentimentResult { label: 'bullish' | 'bearish' | 'neutral'; blurb: string; }

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function grokSentiment(symbol: string, exchange: string): Promise<SentimentResult | null> {
  const prompt = `You're a stock market sentiment analyst. In one short sentence (max 120 chars), ` +
    `give current retail/market sentiment for ${symbol} (${exchange} listed stock). ` +
    `Reply as JSON: {"label":"bullish"|"bearish"|"neutral","blurb":"..."}`;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-4.3',
        max_tokens: 80,
        messages: [
          { role: 'system', content: 'You are a stock sentiment engine. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const clean = raw.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean) as { label?: string; blurb?: string };
    if (parsed.label !== 'bullish' && parsed.label !== 'bearish' && parsed.label !== 'neutral') return null;
    return { label: parsed.label, blurb: String(parsed.blurb ?? '').slice(0, 160) };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (!SERVICE_KEY) return Response.json({ error: 'SERVICE_KEY missing' }, { status: 500 });
  if (!XAI_KEY) return Response.json({ error: 'XAI_KEY missing' }, { status: 500 });

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  const [holdingsRes, watchlistRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/holdings?select=symbol,exchange`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/watchlist?select=symbol,exchange`, { headers }),
  ]);
  const holdings: Row[]  = holdingsRes.ok  ? await holdingsRes.json()  : [];
  const watchlist: Row[] = watchlistRes.ok ? await watchlistRes.json() : [];

  // Dedupe by symbol (table PK is symbol alone); count occurrences to prioritize
  // most-held/watched symbols first when over the daily cap.
  const counts = new Map<string, { symbol: string; exchange: string; count: number }>();
  for (const r of [...holdings, ...watchlist]) {
    const existing = counts.get(r.symbol);
    if (existing) existing.count++;
    else counts.set(r.symbol, { symbol: r.symbol, exchange: r.exchange, count: 1 });
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, MAX_SYMBOLS);

  let scanned = 0, failed = 0;
  for (const { symbol, exchange } of ranked) {
    const result = await grokSentiment(symbol, exchange);
    if (result) {
      const upsertRes = await fetch(`${SUPA_URL}/rest/v1/sentiment_scores`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ symbol, exchange, label: result.label, blurb: result.blurb, scanned_at: new Date().toISOString() }),
      });
      if (upsertRes.ok) scanned++; else failed++;
    } else {
      failed++;
    }
    await sleep(200);
  }

  return Response.json({ candidates: ranked.length, scanned, failed });
}
