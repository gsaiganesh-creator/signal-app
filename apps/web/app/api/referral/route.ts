// Referral API
// SQL to run in Supabase before using:
//
//   ALTER TABLE public.profiles
//     ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
//     ADD COLUMN IF NOT EXISTS referral_discount_pct INTEGER DEFAULT 0,
//     ADD COLUMN IF NOT EXISTS welcome_discount_pct INTEGER DEFAULT 0;
//
//   CREATE TABLE IF NOT EXISTS public.referrals (
//     id          uuid primary key default gen_random_uuid(),
//     referrer_id uuid not null references auth.users(id),
//     referred_id uuid not null references auth.users(id),
//     status      text not null default 'pending',
//     created_at  timestamptz default now(),
//     paid_at     timestamptz,
//     UNIQUE(referred_id)
//   );
//   ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "referrer_see_own" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
//   CREATE POLICY "insert_referral"  ON public.referrals FOR INSERT WITH CHECK (true);
//   CREATE POLICY "update_referral"  ON public.referrals FOR UPDATE USING (true);

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function discountFromPaidCount(paid: number): number {
  if (paid >= 5) return 80;
  if (paid >= 4) return 40;
  if (paid >= 3) return 20;
  if (paid >= 2) return 10;
  if (paid >= 1) return 5;
  return 0;
}

function genCode(userId: string): string {
  return 'SG-' + userId.replace(/-/g, '').slice(0, 5).toUpperCase();
}

function supaHeaders(token?: string) {
  return {
    apikey:          SUPA_KEY,
    Authorization:   `Bearer ${token ?? SUPA_KEY}`,
    'Content-Type':  'application/json',
    Accept:          'application/json',
  };
}

// ── GET: current user's referral stats ────────────────────────────────────────

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user from token
  const meRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) return Response.json({ error: 'Invalid token' }, { status: 401 });
  const me = await meRes.json() as { id: string; email: string };

  // Get or create referral_code in profiles
  const profRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?id=eq.${me.id}&select=referral_code,referral_discount_pct,welcome_discount_pct`,
    { headers: supaHeaders(token) },
  );
  const profiles = await profRes.json() as Array<{ referral_code: string | null; referral_discount_pct: number; welcome_discount_pct: number }>;
  const profile  = profiles[0];

  let code = profile?.referral_code;
  if (!code) {
    code = genCode(me.id);
    // Upsert the code into profiles
    await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${me.id}`, {
      method:  'PATCH',
      headers: { ...supaHeaders(token), Prefer: 'return=minimal' },
      body:    JSON.stringify({ referral_code: code }),
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsignal.in';

  // Get referrals for this user
  const refRes = await fetch(
    `${SUPA_URL}/rest/v1/referrals?referrer_id=eq.${me.id}&select=status,created_at,paid_at&order=created_at.desc`,
    { headers: supaHeaders(token) },
  );
  const referrals = refRes.ok
    ? await refRes.json() as Array<{ status: string; created_at: string; paid_at: string | null }>
    : [];

  const paidCount    = referrals.filter(r => r.status === 'paid').length;
  const discountPct  = discountFromPaidCount(paidCount);

  return Response.json({
    referral_code:      code,
    referral_link:      `${appUrl}/ref/${code}`,
    total_referrals:    referrals.length,
    paid_referrals:     paidCount,
    discount_pct:       discountPct,
    welcome_discount:   profile?.welcome_discount_pct ?? 0,
    referrals,
  });
}

// ── POST: record a referral after signup ──────────────────────────────────────
// Body: { ref_code: string, user_token: string }

export async function POST(req: Request) {
  let body: { ref_code?: string; user_token?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { ref_code, user_token } = body;
  if (!ref_code || !user_token) {
    return Response.json({ error: 'ref_code and user_token required' }, { status: 400 });
  }

  // Get referred user from token
  const meRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${user_token}` },
  });
  if (!meRes.ok) return Response.json({ error: 'Invalid token' }, { status: 401 });
  const referred = await meRes.json() as { id: string };

  // Look up referrer by code
  const refererRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?referral_code=eq.${encodeURIComponent(ref_code)}&select=id`,
    { headers: supaHeaders() },
  );
  const referers = await refererRes.json() as Array<{ id: string }>;
  if (!referers.length) {
    return Response.json({ error: 'Invalid referral code' }, { status: 404 });
  }
  const referrer = referers[0];

  // Don't allow self-referral
  if (referrer.id === referred.id) {
    return Response.json({ ok: false, reason: 'self_referral' });
  }

  // Insert referral (UNIQUE on referred_id — silently ignores duplicates)
  const insRes = await fetch(`${SUPA_URL}/rest/v1/referrals`, {
    method:  'POST',
    headers: { ...supaHeaders(), Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body:    JSON.stringify({ referrer_id: referrer.id, referred_id: referred.id, status: 'pending' }),
  });

  // Give referred user a 5% welcome discount on their first subscription
  if (insRes.ok) {
    await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${referred.id}`, {
      method:  'PATCH',
      headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body:    JSON.stringify({ welcome_discount_pct: 5 }),
    });
  }

  return Response.json({ ok: insRes.ok, referrer_id: referrer.id, welcome_discount: 5 });
}
