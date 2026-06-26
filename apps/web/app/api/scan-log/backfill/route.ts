// Backfill 30d and 60d outcome prices for scan_log rows.
// Call daily (Vercel Cron or manual): GET /api/scan-log/backfill
// Safe to call multiple times — only updates rows where price is still null.

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ScanRow {
  id:        string;
  symbol:    string;
  exchange:  string;
  scanned_at: string;
  price_at:  number;
  price_30d: number | null;
  price_60d: number | null;
}

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number | null> {
  const suffix = exchange === 'BSE' ? '.BO' : '.NS';
  const ySym   = `${symbol}${suffix}`;
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
  if (!SUPA_URL || !SUPA_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const today     = new Date();
  const d30ago    = new Date(today.getTime() - 30 * 86_400_000).toISOString().split('T')[0];
  const d60ago    = new Date(today.getTime() - 60 * 86_400_000).toISOString().split('T')[0];
  const d65ago    = new Date(today.getTime() - 65 * 86_400_000).toISOString().split('T')[0]; // 60-65d window

  // Fetch rows needing 30d backfill (scanned 30+ days ago, price_30d still null)
  const need30 = await fetch(
    `${SUPA_URL}/rest/v1/scan_log?scanned_at=lte.${d30ago}&price_30d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_30d,price_60d&limit=100`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<ScanRow[]> : [] as ScanRow[]);

  // Fetch rows needing 60d backfill (scanned 60-65 days ago, price_60d still null)
  const need60 = await fetch(
    `${SUPA_URL}/rest/v1/scan_log?scanned_at=lte.${d60ago}&scanned_at=gte.${d65ago}&price_60d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_30d,price_60d&limit=100`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<ScanRow[]> : [] as ScanRow[]);

  // Dedupe symbols to minimize Yahoo Finance calls
  const allRows = [...need30, ...need60];
  const uniqueSymbols = [...new Set(allRows.map(r => `${r.symbol}:${r.exchange}`))];

  const priceCache: Record<string, number | null> = {};
  for (const key of uniqueSymbols) {
    const [sym, exch] = key.split(':');
    priceCache[key] = await fetchCurrentPrice(sym, exch);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  let updated30 = 0;
  let updated60 = 0;

  // Update 30d rows
  for (const row of need30) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price === null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/scan_log?id=eq.${row.id}`, {
      method:  'PATCH',
      headers: {
        apikey:         SUPA_KEY,
        Authorization:  `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ price_30d: price, return_30d: ret }),
    });
    updated30++;
  }

  // Update 60d rows
  for (const row of need60) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price === null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/scan_log?id=eq.${row.id}`, {
      method:  'PATCH',
      headers: {
        apikey:         SUPA_KEY,
        Authorization:  `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ price_60d: price, return_60d: ret }),
    });
    updated60++;
  }

  return Response.json({
    ok: true,
    updated_30d: updated30,
    updated_60d: updated60,
    skipped: allRows.length - updated30 - updated60,
    ran_at:  new Date().toISOString(),
  });
}
