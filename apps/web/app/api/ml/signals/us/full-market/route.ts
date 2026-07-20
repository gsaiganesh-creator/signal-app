// Full NASDAQ/NYSE/AMEX market scan (~7-8k stocks) — read-only, mirrors
// api/ml/signals/full-market/route.ts's India version. The scan itself runs
// once daily on the VPS (apps/api core/full_market_scan_us.py, 8:20 PM IST
// cron) and writes to Supabase scan_cache under key 'us_full_market'.
//
// Unlike India's tiered depth, the entire US signals section is already
// Elite-only (PLAN_GATES['signals-us'] in lib/use-plan.ts gates the whole
// market toggle) — no lower tier can reach this route via the UI, so there's
// no depth slicing here: Elite/admin gets every qualifying stock, everyone
// else is rejected outright.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FOUNDERS = ['gsaiganesh@gmail.com', 'gsai0905@gmail.com', 'bskumar.obiee@gmail.com'];

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

  if (plan !== 'elite' && plan !== 'admin') {
    return Response.json({ error: 'upgrade required', plan, locked: true, signals: [], count: 0 }, { status: 403 });
  }

  const cacheRes = await fetch(
    `${SUPA_URL}/rest/v1/scan_cache?scan_key=eq.us_full_market&select=results,computed_at`,
    { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
  );
  if (!cacheRes.ok) return Response.json({ error: 'cache read failed', signals: [], count: 0 }, { status: 500 });

  const rows = await cacheRes.json() as Array<{ results: unknown[]; computed_at: string }>;
  const row = rows[0];
  if (!row) {
    return Response.json({ signals: [], count: 0, computed_at: null, next_run_at: null });
  }

  const REFRESH_MS = 24 * 60 * 60_000; // once daily — see full_market_scan_us cron
  return Response.json(
    {
      signals: row.results,
      count: row.results.length,
      computed_at: row.computed_at,
      next_run_at: new Date(new Date(row.computed_at).getTime() + REFRESH_MS).toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
