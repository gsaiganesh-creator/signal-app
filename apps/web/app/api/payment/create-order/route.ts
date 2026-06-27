// Creates a Razorpay order server-side (Key Secret never leaves server)
// Env vars required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PLANS: Record<string, { monthly: number; annual: number; name: string }> = {
  starter: { monthly: 29900,  annual: 287040,  name: 'Starter' },  // ₹299/mo | ₹2392/yr (-20%)
  pro:     { monthly: 79900,  annual: 767040,  name: 'Pro'     },  // ₹799/mo | ₹6392/yr (-20%)
  elite:   { monthly: 199900, annual: 1919040, name: 'Elite'   },  // ₹1999/mo | ₹19192/yr (-20%)
};

export async function POST(req: Request) {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json({ error: 'Payment gateway not configured' }, { status: 503 });
  }

  let body: { plan?: string; billing?: string; user_token?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }

  const plan    = (body.plan ?? '').toLowerCase();
  const billing = body.billing === 'annual' ? 'annual' : 'monthly';
  const planDef = PLANS[plan];

  if (!planDef) {
    return Response.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }

  // Check for welcome discount (referred user 5% off first purchase)
  let welcomeDisc = 0;
  if (body.user_token && SUPA_URL && SUPA_KEY) {
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

  const baseAmount    = planDef[billing];
  const discountAmt   = welcomeDisc > 0 ? Math.round(baseAmount * welcomeDisc / 100) : 0;
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
        currency: 'INR',
        receipt: `signal_${plan}_${billing}_${Date.now()}`,
        notes: { plan, billing },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
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
      original_amount: baseAmount,
    });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
