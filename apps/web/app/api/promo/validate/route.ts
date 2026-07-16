// Validates a one-time promo code before checkout — doesn't consume it.
// Actual redemption (marking used_by) happens server-side in /api/payment/verify
// after a real payment clears, so a validate-only call can never burn a code.
export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  if (!SRVC_KEY) return Response.json({ valid: false, error: 'Not configured' }, { status: 503 });

  let body: { code?: string };
  try { body = await req.json(); }
  catch { return Response.json({ valid: false, error: 'Invalid request' }, { status: 400 }); }

  const code = (body.code ?? '').trim().toUpperCase();
  if (!code) return Response.json({ valid: false, error: 'Enter a code' }, { status: 400 });

  const res = await fetch(
    `${SUPA_URL}/rest/v1/promo_codes?code=eq.${encodeURIComponent(code)}&select=discount_pct,is_active,used_by,label`,
    { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
  );
  if (!res.ok) return Response.json({ valid: false, error: 'Lookup failed' }, { status: 502 });

  const rows = await res.json() as Array<{ discount_pct: number; is_active: boolean; used_by: string | null; label: string | null }>;
  const row = rows[0];

  if (!row) return Response.json({ valid: false, error: 'Code not found' });
  if (!row.is_active) return Response.json({ valid: false, error: 'Code disabled' });
  if (row.used_by) return Response.json({ valid: false, error: 'Code already used' });

  return Response.json({ valid: true, discount_pct: row.discount_pct, label: row.label });
}
