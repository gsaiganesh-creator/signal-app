// Backfill 7d and 30d outcome prices for sentiment_scan_log rows.
// Fully decoupled from /api/cron/sentiment-scan — runs on its own schedule,
// a failure here never blocks the daily sentiment scan or the feed page.
// Call daily (Vercel Cron or manual): GET /api/cron/sentiment-scan/backfill
// Safe to call multiple times — only updates rows where the price is still null.

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LogRow {
  id: string; symbol: string; exchange: string; scanned_at: string;
  price_at: number; price_7d: number | null; price_30d: number | null;
}

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number | null> {
  const suffix = exchange === 'BSE' ? '.BO' : exchange === 'NYSE' || exchange === 'NASDAQ' ? '' : '.NS';
  const ySym = `${symbol}${suffix}`;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    const d = await r.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
    return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

export async function GET() {
  if (!SUPA_URL || !SUPA_KEY) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  const today  = new Date();
  const d7ago  = new Date(today.getTime() - 7 * 86_400_000).toISOString().split('T')[0];
  const d30ago = new Date(today.getTime() - 30 * 86_400_000).toISOString().split('T')[0];

  const need7 = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?scanned_at=lte.${d7ago}&price_7d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_7d,price_30d&limit=200`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<LogRow[]> : [] as LogRow[]);

  const need30 = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?scanned_at=lte.${d30ago}&price_30d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_7d,price_30d&limit=200`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<LogRow[]> : [] as LogRow[]);

  const allRows = [...need7, ...need30];
  const uniqueSymbols = [...new Set(allRows.map(r => `${r.symbol}:${r.exchange}`))];

  const priceCache: Record<string, number | null> = {};
  for (const key of uniqueSymbols) {
    const [sym, exch] = key.split(':');
    priceCache[key] = await fetchCurrentPrice(sym, exch);
    await new Promise(r => setTimeout(r, 200));
  }

  let updated7 = 0, updated30 = 0;

  for (const row of need7) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price == null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/sentiment_scan_log?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ price_7d: price, return_7d: ret }),
    });
    updated7++;
  }

  for (const row of need30) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price == null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/sentiment_scan_log?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ price_30d: price, return_30d: ret }),
    });
    updated30++;
  }

  return Response.json({
    ok: true, updated_7d: updated7, updated_30d: updated30,
    skipped: allRows.length - updated7 - updated30, ran_at: new Date().toISOString(),
  });
}
