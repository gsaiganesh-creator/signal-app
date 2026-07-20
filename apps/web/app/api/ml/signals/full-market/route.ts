// Full NSE+BSE market scan (~4000 stocks) — read-only. The actual scan runs
// once daily on the VPS (apps/api core/full_market_scan.py, 9:30 AM IST cron)
// and writes to Supabase scan_cache under key 'india_full_market'. This route
// only ever reads that row — it never computes inline, since a scan this size
// (20+ min, Kite rate-limited) can't fit inside a request's execution window.
//
// This is the first route in the codebase with real SERVER-SIDE plan
// enforcement: every other /api/ml/signals/* route returns identical data to
// every caller regardless of plan (gating is client-side only via ProGate).
// Free tier gets zero depth here — paying tiers unlock progressively more of
// the same ranked result set, which is the actual fix for "why does a free
// user see the same stock universe as an Elite subscriber."
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FOUNDERS = ['gsaiganesh@gmail.com', 'gsai0905@gmail.com', 'bskumar.obiee@gmail.com'];

// How many of the ranked full-market results each tier can see. Free tier
// has no key here -> locked out entirely (stays on the curated ~100-stock
// scans). Same underlying scan for everyone; paying tiers unlock depth.
const TIER_DEPTH: Record<string, number> = {
  starter: 100,
  pro: 500,
  elite: Infinity,
  admin: Infinity,
};

const REFRESH_MS = 24 * 60 * 60_000; // once daily — see full_market_scan cron

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'unauth' }, { status: 401 });
  const token = auth.slice(7);

  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return Response.json({ error: 'invalid token' }, { status: 401 });
  const user = await userRes.json() as { id: string; email?: string };
  const email = (user.email ?? '').toLowerCase();

  let plan = 'free';
  if (FOUNDERS.includes(email)) {
    plan = 'admin';
  } else {
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?select=plan,plan_expires_at&id=eq.${user.id}`,
      { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
    );
    if (profRes.ok) {
      const rows = await profRes.json() as Array<{ plan: string; plan_expires_at: string | null }>;
      const row = rows[0];
      if (row) {
        const expired = row.plan_expires_at ? new Date(row.plan_expires_at) < new Date() : false;
        plan = expired ? 'free' : row.plan;
      }
    }
  }

  const depth = TIER_DEPTH[plan];
  if (!depth) {
    return Response.json({ error: 'upgrade required', plan, locked: true, signals: [], count: 0 }, { status: 403 });
  }

  const cacheRes = await fetch(
    `${SUPA_URL}/rest/v1/scan_cache?scan_key=eq.india_full_market&select=results,computed_at`,
    { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
  );
  if (!cacheRes.ok) return Response.json({ error: 'cache read failed', signals: [], count: 0 }, { status: 500 });

  const rows = await cacheRes.json() as Array<{ results: unknown[]; computed_at: string }>;
  const row = rows[0];
  if (!row) {
    return Response.json({ signals: [], count: 0, total_qualifying: 0, plan, computed_at: null, next_run_at: null });
  }

  const sliced = depth === Infinity ? row.results : row.results.slice(0, depth);

  return Response.json(
    {
      signals: sliced,
      count: sliced.length,
      total_qualifying: row.results.length,
      plan,
      computed_at: row.computed_at,
      next_run_at: new Date(new Date(row.computed_at).getTime() + REFRESH_MS).toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
