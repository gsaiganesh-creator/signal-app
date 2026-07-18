// Stripe webhook — the USD counterpart to api/payment/verify's job, but
// event-driven instead of client-initiated. Stripe Checkout confirms payment
// server-to-server via webhook rather than a client-side signature check
// (Razorpay's model), so this route is the actual source of truth for "did
// the USD payment clear," not the success_url redirect (that's just where
// the browser lands, and could be hit without a real payment by editing the
// URL — this webhook is what actually grants access).
//
// Env vars required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Register this URL (https://<domain>/api/stripe/webhook) in the Stripe
// Dashboard → Developers → Webhooks, subscribed to checkout.session.completed.
export const runtime = 'nodejs';

import Stripe from 'stripe';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLAN_DAYS: Record<string, number> = {
  'starter-monthly': 31,  'starter-annual': 366,
  'pro-monthly':     31,  'pro-annual':     366,
  'elite-monthly':   31,  'elite-annual':   366,
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return Response.json({ error: 'Not configured' }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey);

  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  if (!sig) return Response.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    return Response.json({ error: `Signature verification failed: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true }); // ack other event types, nothing to do
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { user_id, plan, billing, promo_code, discount_pct } = session.metadata ?? {};
  if (!user_id || !plan) return Response.json({ received: true }); // not one of ours

  if (!SUPABASE_SERVICE_KEY) {
    console.error('[stripe webhook] SUPABASE_SERVICE_ROLE_KEY not set — cannot update plan');
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const svcHdr = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const planKey = `${plan}-${billing ?? 'monthly'}`;
  const days = PLAN_DAYS[planKey] ?? 31;
  const expires = new Date(Date.now() + days * 86_400_000).toISOString();

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH',
      headers: { ...svcHdr, Prefer: 'return=minimal' },
      body: JSON.stringify({
        plan, plan_billing: billing ?? 'monthly', plan_expires_at: expires,
        plan_payment_id: session.id, welcome_discount_pct: 0,
      }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: { ...svcHdr, Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id, email: session.customer_email ?? '', plan, billing: billing ?? 'monthly',
        amount: session.amount_total ?? 0, currency: (session.currency ?? 'usd').toUpperCase(),
        discount_pct: Number(discount_pct ?? 0), promo_code: promo_code || null,
        gateway: 'stripe', stripe_session_id: session.id,
      }),
    });

    if (promo_code) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/promo_codes?code=eq.${encodeURIComponent(promo_code)}&used_by=is.null`,
        {
          method: 'PATCH',
          headers: { ...svcHdr, Prefer: 'return=minimal' },
          body: JSON.stringify({ used_by: user_id, used_at: new Date().toISOString(), razorpay_payment_id: session.id }),
        },
      );
    }
  } catch (e) {
    console.error('[stripe webhook] Supabase update failed:', e);
    // Still 200 — Stripe retries on non-2xx, and retrying won't fix a
    // Supabase-side error. Logged for manual follow-up instead.
  }

  return Response.json({ received: true });
}
