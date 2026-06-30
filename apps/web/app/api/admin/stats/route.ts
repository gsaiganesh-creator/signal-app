export const runtime = 'nodejs';

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FOUNDERS = ['gsaiganesh@gmail.com', 'gsai0905@gmail.com', 'bskumar.obiee@gmail.com'];

const svcHdr = () => ({
  apikey: SRVC_KEY,
  Authorization: `Bearer ${SRVC_KEY}`,
  'Content-Type': 'application/json',
});

async function svcGet(path: string) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: svcHdr() });
  return r.ok ? r.json() : [];
}

export async function GET(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars' }, { status: 503 });

  // ── Auth: verify caller is a founder ───────────────────────────────────────
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'unauth' }, { status: 401 });
  const token = auth.slice(7);

  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return Response.json({ error: 'invalid token' }, { status: 401 });
  const caller = await userRes.json() as { email?: string };
  if (!FOUNDERS.includes((caller.email ?? '').toLowerCase())) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  // ── Fetch all auth users via admin API ─────────────────────────────────────
  const usersRes = await fetch(`${SUPA_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` },
  });
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
  const authUsers: Array<{
    id: string; email?: string; created_at: string;
    last_sign_in_at?: string; email_confirmed_at?: string;
  }> = usersData.users ?? [];

  // ── Fetch public tables ────────────────────────────────────────────────────
  const [profiles, portfolios, holdings, grants] = await Promise.all([
    svcGet('profiles?select=id,plan,plan_expires_at') as Promise<Array<{ id: string; plan: string; plan_expires_at: string | null }>>,
    svcGet('portfolios?select=id,user_id') as Promise<Array<{ id: string; user_id: string }>>,
    svcGet('holdings?select=portfolio_id,exchange,qty,avg_price') as Promise<Array<{ portfolio_id: string; exchange: string; qty: number; avg_price: number }>>,
    svcGet('equity_grants?select=user_id,symbol,type') as Promise<Array<{ user_id: string; symbol: string; type: string }>>,
  ]);

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const portfolioMap = new Map(portfolios.map(p => [p.id, p.user_id]));

  // Per-user aggregates from holdings
  const userHoldings = new Map<string, { india: number; us: number; india_inv: number; us_inv: number }>();
  for (const h of holdings) {
    const uid = portfolioMap.get(h.portfolio_id);
    if (!uid) continue;
    if (!userHoldings.has(uid)) userHoldings.set(uid, { india: 0, us: 0, india_inv: 0, us_inv: 0 });
    const u = userHoldings.get(uid)!;
    const inv = Number(h.qty) * Number(h.avg_price);
    if (h.exchange === 'NSE' || h.exchange === 'BSE') { u.india++; u.india_inv += inv; }
    else { u.us++; u.us_inv += inv; }
  }

  // Per-user RSU grant count
  const userGrants = new Map<string, number>();
  for (const g of grants) {
    userGrants.set(g.user_id, (userGrants.get(g.user_id) ?? 0) + 1);
  }

  // Per-user portfolio count
  const userPortfolios = new Map<string, number>();
  for (const p of portfolios) {
    userPortfolios.set(p.user_id, (userPortfolios.get(p.user_id) ?? 0) + 1);
  }

  // ── Build per-user rows ────────────────────────────────────────────────────
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const planDist: Record<string, number> = {};
  let totalIndiaInv = 0, totalUSInv = 0, active7d = 0;

  const users = authUsers.map(u => {
    const profile  = profileMap.get(u.id);
    const expired  = profile?.plan_expires_at ? new Date(profile.plan_expires_at) < new Date() : false;
    const plan     = FOUNDERS.includes((u.email ?? '').toLowerCase()) ? 'admin'
                   : (expired ? 'free' : (profile?.plan ?? 'free'));
    planDist[plan] = (planDist[plan] ?? 0) + 1;

    const h = userHoldings.get(u.id) ?? { india: 0, us: 0, india_inv: 0, us_inv: 0 };
    totalIndiaInv += h.india_inv;
    totalUSInv    += h.us_inv;

    if (u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < sevenDays) active7d++;

    return {
      id:            u.id,
      email:         u.email ?? '—',
      created_at:    u.created_at,
      last_sign_in:  u.last_sign_in_at ?? null,
      confirmed:     !!u.email_confirmed_at,
      plan,
      portfolios:    userPortfolios.get(u.id) ?? 0,
      india_holdings: h.india,
      us_holdings:   h.us,
      india_invested: h.india_inv,
      us_invested:   h.us_inv,
      rsu_grants:    userGrants.get(u.id) ?? 0,
    };
  });

  return Response.json({
    summary: {
      total_users:   authUsers.length,
      confirmed:     authUsers.filter(u => !!u.email_confirmed_at).length,
      active_7d:     active7d,
      plan_dist:     planDist,
      total_india_invested: totalIndiaInv,
      total_us_invested:    totalUSInv,
      total_portfolios:     portfolios.length,
      total_holdings:       holdings.length,
      total_rsu_grants:     grants.length,
    },
    users: users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    generated_at: new Date().toISOString(),
  });
}
