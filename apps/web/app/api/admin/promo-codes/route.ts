// Founder-only: list + generate one-time promo codes (Twitter giveaways etc).
// Mirrors the auth pattern in app/api/admin/stats/route.ts exactly.
export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FOUNDERS = ['gsaiganesh@gmail.com', 'gsai0905@gmail.com', 'bskumar.obiee@gmail.com'];

const svcHdr = () => ({ apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}`, 'Content-Type': 'application/json' });

async function requireFounder(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!userRes.ok) return null;
  const caller = await userRes.json() as { email?: string };
  const email = (caller.email ?? '').toLowerCase();
  return FOUNDERS.includes(email) ? email : null;
}

export async function GET(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  const founder = await requireFounder(req);
  if (!founder) return Response.json({ error: 'forbidden' }, { status: 403 });

  const res = await fetch(
    `${SUPA_URL}/rest/v1/promo_codes?select=*&order=created_at.desc`,
    { headers: svcHdr() },
  );
  const codes = res.ok ? await res.json() : [];

  // Resolve used_by user ids -> emails for display
  const usedIds = [...new Set((codes as Array<{ used_by: string | null }>).map(c => c.used_by).filter(Boolean))] as string[];
  const emailMap: Record<string, string> = {};
  if (usedIds.length > 0) {
    const usersRes = await fetch(`${SUPA_URL}/auth/v1/admin/users?per_page=1000`, { headers: svcHdr() });
    if (usersRes.ok) {
      const { users } = await usersRes.json() as { users: Array<{ id: string; email?: string }> };
      for (const u of users) if (usedIds.includes(u.id)) emailMap[u.id] = u.email ?? u.id;
    }
  }

  const enriched = (codes as Array<Record<string, unknown>>).map(c => ({
    ...c,
    used_by_email: c.used_by ? (emailMap[c.used_by as string] ?? c.used_by) : null,
  }));

  return Response.json({ codes: enriched });
}

export async function POST(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  const founder = await requireFounder(req);
  if (!founder) return Response.json({ error: 'forbidden' }, { status: 403 });

  let body: { code?: string; discount_pct?: number; label?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  const code = (body.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const discount_pct = Number(body.discount_pct);

  if (!code) return Response.json({ error: 'Code required' }, { status: 400 });
  if (!discount_pct || discount_pct <= 0 || discount_pct > 100) return Response.json({ error: 'discount_pct must be 1-100' }, { status: 400 });

  const res = await fetch(`${SUPA_URL}/rest/v1/promo_codes`, {
    method: 'POST',
    headers: { ...svcHdr(), Prefer: 'return=representation' },
    body: JSON.stringify({ code, discount_pct, label: body.label?.trim() || null, created_by: founder }),
  });

  if (!res.ok) {
    const err = await res.text();
    const isDupe = err.includes('duplicate key') || err.includes('already exists');
    return Response.json({ error: isDupe ? `Code "${code}" already exists` : err }, { status: isDupe ? 409 : 502 });
  }

  const [row] = await res.json();
  return Response.json({ code: row });
}

export async function DELETE(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  const founder = await requireFounder(req);
  if (!founder) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  // Soft-disable rather than hard delete — keeps history intact if it was ever used
  const res = await fetch(`${SUPA_URL}/rest/v1/promo_codes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...svcHdr(), Prefer: 'return=minimal' },
    body: JSON.stringify({ is_active: false }),
  });
  if (!res.ok) return Response.json({ error: 'Failed to disable code' }, { status: 502 });
  return Response.json({ ok: true });
}
