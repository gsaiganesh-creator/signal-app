// Fetches FII/DII data from NSE, upserts to Supabase, returns last 20 trading days.
// NSE API requires a cookie from the homepage — single-step fetch works with cached jar.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NSE_URL  = 'https://www.nseindia.com/api/fiidiiTradeReact';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

interface NseRow { buyValue: string; sellValue: string; netValue: string; category: string; date: string; }
interface DbRow  { date: string; fii_buy: number; fii_sell: number; fii_net: number; dii_buy: number; dii_sell: number; dii_net: number; fetched_at: string; }

// In-memory: store cookie so we don't hit NSE homepage on every request
let _cookie  = '';
let _cache: { rows: DbRow[]; ts: number } | null = null;
const TTL = 15 * 60_000; // 15 min

function parseDate(d: string): string {
  // "23-Jun-2026" → "2026-06-23"
  const months: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
  const [day, mon, yr] = d.split('-');
  return `${yr}-${months[mon] ?? '01'}-${day.padStart(2,'0')}`;
}

async function fetchNSE(): Promise<NseRow[] | null> {
  // Step 1: get cookie if we don't have one
  if (!_cookie) {
    try {
      const r = await fetch('https://www.nseindia.com/', {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(8000),
      });
      const raw = r.headers.get('set-cookie') ?? '';
      // Extract cookie names+values (strip path/domain/etc)
      _cookie = raw.split(',')
        .map(c => c.trim().split(';')[0])
        .filter(Boolean)
        .join('; ');
    } catch { /* proceed without cookie — NSE sometimes works anyway */ }
  }

  // Step 2: hit the API
  try {
    const r = await fetch(NSE_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/market-data/fii-dii-activity',
        ..._cookie ? { Cookie: _cookie } : {},
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { _cookie = ''; return null; }
    return await r.json() as NseRow[];
  } catch { return null; }
}

async function upsertToday(row: { date: string; fii_buy: number; fii_sell: number; fii_net: number; dii_buy: number; dii_sell: number; dii_net: number }) {
  await fetch(`${SUPA_URL}/rest/v1/fii_dii_history`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ ...row, fetched_at: new Date().toISOString() }),
  });
}

async function fetchHistory(limit = 20): Promise<DbRow[]> {
  const r = await fetch(
    `${SUPA_URL}/rest/v1/fii_dii_history?select=*&order=date.desc&limit=${limit}`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  if (!r.ok) return [];
  return await r.json() as DbRow[];
}

export async function GET() {
  // Serve in-memory cache if fresh
  if (_cache && Date.now() - _cache.ts < TTL) {
    return Response.json({ rows: _cache.rows, cached: true },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
  }

  // Fetch from NSE
  const nse = await fetchNSE();

  if (nse && nse.length >= 2) {
    const fiiRow = nse.find(r => r.category.startsWith('FII') || r.category.startsWith('FPI'));
    const diiRow = nse.find(r => r.category === 'DII');

    if (fiiRow && diiRow) {
      const dateStr = parseDate(fiiRow.date);
      await upsertToday({
        date:     dateStr,
        fii_buy:  +fiiRow.buyValue,
        fii_sell: +fiiRow.sellValue,
        fii_net:  +fiiRow.netValue,
        dii_buy:  +diiRow.buyValue,
        dii_sell: +diiRow.sellValue,
        dii_net:  +diiRow.netValue,
      });
    }
  }

  // Always return from Supabase (ensures history even if NSE fails)
  const rows = await fetchHistory(20);
  _cache = { rows, ts: Date.now() };

  return Response.json({ rows, cached: false },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
}
