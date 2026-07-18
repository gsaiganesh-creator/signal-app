// Creates a Razorpay order server-side (Key Secret never leaves server)
// Env vars required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PLANS_INR: Record<string, { monthly: number; annual: number; name: string }> = {
  starter: { monthly: 29900,  annual: 287040,  name: 'Starter' },  // ₹299/mo | ₹2392/yr (-20%)
  pro:     { monthly: 79900,  annual: 767040,  name: 'Pro'     },  // ₹799/mo | ₹6392/yr (-20%)
  elite:   { monthly: 199900, annual: 1919040, name: 'Elite'   },  // ₹1999/mo | ₹19192/yr (-20%)
};
// USD amounts in cents (Razorpay, like most gateways, wants the smallest
// currency unit). Not a straight FX conversion of the INR prices — priced
// to what US SaaS buyers actually expect at these tiers.
// NOTE: charging USD requires Razorpay's "International Payments" to be
// enabled on the account (not on by default) — see create-order's currency
// branch below; until then this path returns whatever error Razorpay gives.
const PLANS_USD: Record<string, { monthly: number; annual: number; name: string }> = {
  starter: { monthly: 499,  annual: 4790,  name: 'Starter' },  // $4.99/mo | $47.90/yr (-20%)
  pro:     { monthly: 1299, annual: 12470, name: 'Pro'     },  // $12.99/mo | $124.70/yr (-20%)
  elite:   { monthly: 2999, annual: 28790, name: 'Elite'   },  // $29.99/mo | $287.90/yr (-20%)
};

export async function POST(req: Request) {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json({ error: 'Payment gateway not configured' }, { status: 503 });
  }

  let body: { plan?: string; billing?: string; user_token?: string; promo_code?: string; currency?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }

  const plan     = (body.plan ?? '').toLowerCase();
  const billing  = body.billing === 'annual' ? 'annual' : 'monthly';
  const currency = body.currency === 'USD' ? 'USD' : 'INR';
  const planDef  = (currency === 'USD' ? PLANS_USD : PLANS_INR)[plan];

  if (!planDef) {
    return Response.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }

  // A promo code (admin-generated, one-time) overrides the welcome-referral
  // discount rather than stacking with it — simpler math, and stops a
  // referred user from also redeeming a giveaway code on the same order.
  const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let promoDisc = 0;
  let promoCode: string | null = null;
  if (body.promo_code && SUPA_URL && SRVC_KEY) {
    const code = body.promo_code.trim().toUpperCase();
    try {
      const promoRes = await fetch(
        `${SUPA_URL}/rest/v1/promo_codes?code=eq.${encodeURIComponent(code)}&select=discount_pct,is_active,used_by`,
        { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
      );
      if (promoRes.ok) {
        const rows = await promoRes.json() as Array<{ discount_pct: number; is_active: boolean; used_by: string | null }>;
        const row = rows[0];
        if (row && row.is_active && !row.used_by) { promoDisc = row.discount_pct; promoCode = code; }
      }
    } catch { /* non-critical — falls back to welcome discount below */ }
  }

  // Check for welcome discount (referred user 5% off first purchase) — only
  // consulted when no valid promo code was supplied.
  let welcomeDisc = 0;
  if (promoDisc === 0 && body.user_token && SUPA_URL && SUPA_KEY) {
    try {
      const meRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${body.user_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json() as { id: string };
        const profRes = await fetch(
          `${SUPA_URL}/rest/v1/profiles?id=eq.${me.id}&select=welcome_discount_pct`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
        );
        if (profRes.ok) {
          const rows = await profRes.json() as Array<{ welcome_discount_pct: number }>;
          welcomeDisc = rows[0]?.welcome_discount_pct ?? 0;
        }
      }
    } catch { /* non-critical — proceed without discount */ }
  }

  const effectiveDisc = promoDisc > 0 ? promoDisc : welcomeDisc;
  const baseAmount    = planDef[billing];
  const discountAmt   = effectiveDisc > 0 ? Math.round(baseAmount * effectiveDisc / 100) : 0;
  const amount        = baseAmount - discountAmt;

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `signal_${plan}_${billing}_${Date.now()}`,
        notes: { plan, billing, promo_code: promoCode ?? '' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      // Razorpay's most likely rejection for a USD order: International
      // Payments isn't enabled on the account. Surface a specific message
      // instead of a raw Razorpay error string the user can't act on.
      if (currency === 'USD' && (err.includes('international') || err.includes('currency') || res.status === 400)) {
        return Response.json({ error: 'USD payments aren’t enabled on our account yet — please use the India (₹) pricing, or contact support@signalgenie.ai.' }, { status: 502 });
      }
      return Response.json({ error: err }, { status: 502 });
    }

    const order = await res.json() as { id: string; amount: number; currency: string };
    return Response.json({
      order_id:        order.id,
      amount:          order.amount,
      currency:        order.currency,
      plan,
      billing,
      plan_name:       planDef.name,
      key_id:          keyId,
      welcome_disc_pct: welcomeDisc,
      promo_code:      promoCode,
      promo_disc_pct:  promoDisc,
      original_amount: baseAmount,
    });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
