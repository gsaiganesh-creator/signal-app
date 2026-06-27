// Verifies Razorpay payment signature, then updates user's plan in Supabase
// Uses HMAC-SHA256: sha256(order_id + "|" + payment_id, key_secret)

import crypto from 'crypto';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Plan → duration in days
const PLAN_DAYS: Record<string, number> = {
  'starter-monthly': 31,  'starter-annual': 366,
  'pro-monthly':     31,  'pro-annual':     366,
  'elite-monthly':   31,  'elite-annual':   366,
};

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json({ error: 'Payment gateway not configured' }, { status: 503 });
  }

  let body: {
    order_id?: string; payment_id?: string; signature?: string;
    plan?: string; billing?: string; user_token?: string;
  };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  const { order_id, payment_id, signature, plan, billing, user_token } = body;

  if (!order_id || !payment_id || !signature) {
    return Response.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  // ── 1. Verify HMAC signature ────────────────────────────────────────────────
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (expected !== signature) {
    return Response.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  // ── 2. Update Supabase profile (anon key + user JWT respects RLS) ───────────
  if (!user_token) {
    // Payment verified but can't update — return success with warning
    return Response.json({ verified: true, plan_updated: false, warning: 'No user token — login and refresh' });
  }

  const planKey = `${(plan ?? 'starter').toLowerCase()}-${billing ?? 'monthly'}`;
  const days    = PLAN_DAYS[planKey] ?? 31;
  const expires = new Date(Date.now() + days * 86_400_000).toISOString();

  // Decode JWT payload (no sig verification — token was issued by Supabase, trusted)
  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(user_token.split('.')[1], 'base64url').toString()) as { sub?: string };
    if (!payload.sub) throw new Error('no sub');
    userId = payload.sub;
  } catch {
    return Response.json({ verified: true, plan_updated: false, warning: 'Could not decode user token' });
  }

  try {
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${user_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        plan:             plan?.toLowerCase() ?? 'starter',
        plan_billing:     billing ?? 'monthly',
        plan_expires_at:  expires,
        plan_payment_id:  payment_id,
      }),
    });

    if (!upd.ok) {
      return Response.json({ verified: true, plan_updated: false, plan, billing, expires });
    }

    // ── 3. Update referral status + referrer discount ───────────────────────────
    try {
      // Mark this user's referral as paid (if they were referred)
      const refUpd = await fetch(
        `${SUPABASE_URL}/rest/v1/referrals?referred_id=eq.${encodeURIComponent(userId)}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
        },
      );
      if (refUpd.ok) {
        const updated = await refUpd.json() as Array<{ referrer_id: string }>;
        if (updated.length > 0) {
          const referrerId = updated[0].referrer_id;
          // Count total paid referrals for this referrer
          const cntRes = await fetch(
            `${SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.${referrerId}&status=eq.paid&select=id`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
          );
          if (cntRes.ok) {
            const rows = await cntRes.json() as unknown[];
            const paid = rows.length;
            const disc = paid >= 5 ? 80 : paid >= 4 ? 40 : paid >= 3 ? 20 : paid >= 2 ? 10 : 5;
            await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${referrerId}`, {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ referral_discount_pct: disc }),
            });
          }
        }
      }
    } catch { /* referral update is non-critical — don't fail the payment */ }

    return Response.json({ verified: true, plan_updated: true, plan, billing, expires });
  } catch (e) {
    // Payment is verified even if DB update fails — log and return
    console.error('[verify] supabase update failed:', e);
    return Response.json({ verified: true, plan_updated: false, plan, billing, expires });
  }
}
