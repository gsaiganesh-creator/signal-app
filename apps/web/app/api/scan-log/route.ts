// scan_log — batch upsert scan entries (POST) + fetch history with accuracy stats (GET)
// Run this SQL in Supabase before using:
//
//   CREATE TABLE IF NOT EXISTS public.scan_log (
//     id          uuid primary key default gen_random_uuid(),
//     scanned_at  date not null,
//     symbol      text not null,
//     exchange    text not null default 'NSE',
//     scan_score  text not null,
//     price_at    numeric not null,
//     rsi14       numeric,
//     confidence  numeric,
//     price_30d   numeric,
//     return_30d  numeric,
//     price_60d   numeric,
//     return_60d  numeric,
//     created_at  timestamptz default now(),
//     UNIQUE(scanned_at, symbol, exchange)
//   );
//   ALTER TABLE public.scan_log ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public_read_scan_log"   ON public.scan_log FOR SELECT USING (true);
//   CREATE POLICY "anon_insert_scan_log"   ON public.scan_log FOR INSERT WITH CHECK (true);
//   CREATE POLICY "anon_update_scan_log"   ON public.scan_log FOR UPDATE USING (true);

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ScanEntry {
  symbol:     string;
  exchange?:  string;
  scan_score: string;   // 'Strong Momentum' | 'Building' | 'Sideways' | 'Weak / Declining'
  price_at:   number;
  rsi14?:     number | null;
  confidence?: number | null;
}

// ── POST: batch upsert scan entries ──────────────────────────────────────────

export async function POST(req: Request) {
  if (!SUPA_URL || !SUPA_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { entries?: ScanEntry[] };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return Response.json({ error: 'entries array required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD IST proxy (UTC date)

  const rows = entries.map(e => ({
    scanned_at:  today,
    symbol:      e.symbol.toUpperCase().replace('.NS','').replace('.BO',''),
    exchange:    (e.exchange ?? 'NSE').toUpperCase(),
    scan_score:  e.scan_score,
    price_at:    e.price_at,
    rsi14:       e.rsi14  ?? null,
    confidence:  e.confidence ?? null,
  }));

  const res = await fetch(`${SUPA_URL}/rest/v1/scan_log`, {
    method: 'POST',
    headers: {
      apikey:          SUPA_KEY,
      Authorization:   `Bearer ${SUPA_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates',  // upsert on UNIQUE(scanned_at, symbol, exchange)
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('42P01') || err.includes('PGRST205') || err.includes("'scan_log'")) {
      return Response.json({ error: 'scan_log table not created yet. Run the SQL in the API route comment.' }, { status: 503 });
    }
    return Response.json({ error: err }, { status: 502 });
  }

  return Response.json({ ok: true, inserted: rows.length, date: today });
}

// ── GET: fetch accuracy stats + recent scan history ───────────────────────────

interface ScanRow {
  scanned_at: string;
  symbol:     string;
  exchange:   string;
  scan_score: string;
  price_at:   number;
  rsi14:      number | null;
  confidence: number | null;
  price_30d:  number | null;
  return_30d: number | null;
  price_60d:  number | null;
  return_60d: number | null;
}

export async function GET(req: Request) {
  if (!SUPA_URL || !SUPA_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const days  = Math.min(180, Math.max(7, Number(searchParams.get('days')  ?? 90)));
  const limit = Math.min(500, Math.max(10, Number(searchParams.get('limit') ?? 200)));

  const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];

  const res = await fetch(
    `${SUPA_URL}/rest/v1/scan_log?scanned_at=gte.${since}&order=scanned_at.desc&limit=${limit}`,
    {
      headers: {
        apikey:        SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('42P01') || err.includes('PGRST205') || err.includes("'scan_log'")) {
      return Response.json({ entries: [], stats: null, setup_needed: true });
    }
    return Response.json({ error: err }, { status: 502 });
  }

  const rows: ScanRow[] = await res.json();

  // ── Compute accuracy stats ────────────────────────────────────────────────
  const closed = rows.filter(r => r.return_30d !== null);
  const ZONES  = ['Strong Momentum','Building','Sideways','Weak / Declining'];

  const zoneStats = ZONES.map(zone => {
    const zRows = closed.filter(r => r.scan_score === zone);
    if (zRows.length === 0) return { zone, count: 0, avg_return: null, accuracy: null };
    const rets  = zRows.map(r => r.return_30d!);
    const avg   = rets.reduce((a, b) => a + b, 0) / rets.length;
    const wins  = rets.filter(r => r > 0).length;
    return { zone, count: zRows.length, avg_return: +avg.toFixed(2), accuracy: +(wins / zRows.length * 100).toFixed(1) };
  });

  // Monthly accuracy (Strong Momentum zone only — the core claim)
  const monthMap: Record<string, { wins: number; total: number }> = {};
  for (const r of closed.filter(c => c.scan_score === 'Strong Momentum')) {
    const key = r.scanned_at.slice(0, 7); // YYYY-MM
    if (!monthMap[key]) monthMap[key] = { wins: 0, total: 0 };
    monthMap[key].total++;
    if ((r.return_30d ?? 0) > 0) monthMap[key].wins++;
  }
  const monthStats = Object.entries(monthMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, pct: +(v.wins / v.total * 100).toFixed(1) }));

  // Overall strong momentum accuracy
  const smRows  = closed.filter(r => r.scan_score === 'Strong Momentum');
  const smAccuracy = smRows.length
    ? +(smRows.filter(r => (r.return_30d ?? 0) > 0).length / smRows.length * 100).toFixed(1)
    : null;

  return Response.json({
    entries:    rows.slice(0, 100),   // most recent 100 for the table
    total_rows: rows.length,
    stats: {
      total_scanned:   rows.length,
      closed_count:    closed.length,
      sm_accuracy_pct: smAccuracy,
      zone_stats:      zoneStats,
      month_stats:     monthStats,
    },
    setup_needed: false,
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=120' },
  });
}
