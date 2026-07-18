// Creates a Stripe Checkout session — the USD/international counterpart to
// api/payment/create-order (Razorpay/INR). Mirrors that route's promo-code
// and welcome-discount logic exactly so both gateways behave identically
// from the user's side; only the gateway call itself differs.
//
// mode: 'payment' (one-time charge), not 'subscription' — matches how the
// Razorpay side actually works today: a single charge extends
// plan_expires_at by 31/366 days, there's no auto-recurring billing or
// subscription-lifecycle handling anywhere in this codebase. Using Stripe
// Subscriptions here would be inconsistent with that and pull in a whole
// second billing model (proration, cancellation, dunning) this app doesn't
// have for Razorpay either.
//
// Env vars required: STRIPE_SECRET_KEY. Not set yet — returns 503 until it is.
export const runtime = 'nodejs';

import Stripe from 'stripe';
import { PLANS_USD } from '@/lib/pricing-usd';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return Response.json({ error: 'USD payments not configured yet — use India (₹) pricing.' }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey);

  let body: { plan?: string; billing?: string; user_token?: string; promo_code?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }

  const plan    = (body.plan ?? '').toLowerCase();
  const billing = body.billing === 'annual' ? 'annual' : 'monthly';
  const planDef = PLANS_USD[plan];

  if (!planDef) {
    return Response.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }
  if (!body.user_token) {
    return Response.json({ error: 'Sign in required' }, { status: 401 });
  }

  // Same promo-code / welcome-discount precedence as create-order — see that
  // file for the reasoning (promo overrides referral discount, not stacked).
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

  let welcomeDisc = 0;
  let userId = '';
  let userEmail = '';
  if (SUPA_URL && SUPA_KEY) {
    try {
      const meRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${body.user_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json() as { id: string; email?: string };
        userId = me.id;
        userEmail = me.email ?? '';
        if (promoDisc === 0 && SRVC_KEY) {
          const profRes = await fetch(
            `${SUPA_URL}/rest/v1/profiles?id=eq.${me.id}&select=welcome_discount_pct`,
            { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
          );
          if (profRes.ok) {
            const rows = await profRes.json() as Array<{ welcome_discount_pct: number }>;
            welcomeDisc = rows[0]?.welcome_discount_pct ?? 0;
          }
        }
      }
    } catch { /* non-critical — proceed without discount, userId stays required below */ }
  }
  if (!userId) {
    return Response.json({ error: 'Could not verify session — please sign in again' }, { status: 401 });
  }

  const effectiveDisc = promoDisc > 0 ? promoDisc : welcomeDisc;
  const baseAmount    = planDef[billing];
  const discountAmt   = effectiveDisc > 0 ? Math.round(baseAmount * effectiveDisc / 100) : 0;
  const amount        = baseAmount - discountAmt;

  const origin = req.headers.get('origin') ?? 'https://signalgenie.ai';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: { name: `SignalGenie ${planDef.name} — ${billing === 'annual' ? 'Annual' : 'Monthly'}` },
        },
        quantity: 1,
      }],
      metadata: { user_id: userId, plan, billing, promo_code: promoCode ?? '', discount_pct: String(effectiveDisc) },
      success_url: `${origin}/dashboard/upgrade?stripe=success`,
      cancel_url: `${origin}/dashboard/upgrade?stripe=cancelled`,
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
