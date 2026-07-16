// Founder-only: business expense + founder-capital-contribution ledger.
// Claude/App Store/mail/domain costs, recurring or one-time, plus who put
// cash in. Visible only to the two founders — same gating as admin/stats.
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

const CATEGORIES = ['claude_subscription', 'app_store_ios', 'app_store_android', 'mail', 'domain', 'hosting', 'api_keys', 'other'];

export async function GET(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  if (!(await requireFounder(req))) return Response.json({ error: 'forbidden' }, { status: 403 });

  const res = await fetch(`${SUPA_URL}/rest/v1/admin_ledger?select=*&order=occurred_on.desc`, { headers: svcHdr() });
  const entries = res.ok ? await res.json() as Array<{
    id: string; record_type: 'expense' | 'contribution'; category: string; description: string;
    amount: number; currency: string; is_recurring: boolean; recurrence_interval: string | null;
    person: string; occurred_on: string; notes: string | null;
  }> : [];

  // Summary: totals per currency (mixed USD/INR — don't fake a conversion), plus
  // per-founder contribution totals and an annualized recurring-cost estimate (INR + USD split).
  const totalsByCurrency: Record<string, { expenses: number; contributions: number }> = {};
  const contributionsByPerson: Record<string, Record<string, number>> = {};
  const annualizedRecurring: Record<string, number> = {};

  for (const e of entries) {
    totalsByCurrency[e.currency] ??= { expenses: 0, contributions: 0 };
    if (e.record_type === 'expense') totalsByCurrency[e.currency].expenses += Number(e.amount);
    else totalsByCurrency[e.currency].contributions += Number(e.amount);

    if (e.record_type === 'contribution') {
      contributionsByPerson[e.person] ??= {};
      contributionsByPerson[e.person][e.currency] = (contributionsByPerson[e.person][e.currency] ?? 0) + Number(e.amount);
    }

    if (e.record_type === 'expense' && e.is_recurring) {
      const mult = e.recurrence_interval === 'yearly' ? 1 : e.recurrence_interval === 'monthly' ? 12 : 0;
      annualizedRecurring[e.currency] = (annualizedRecurring[e.currency] ?? 0) + Number(e.amount) * mult;
    }
  }

  return Response.json({ entries, summary: { totalsByCurrency, contributionsByPerson, annualizedRecurring }, categories: CATEGORIES });
}

export async function POST(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  const founder = await requireFounder(req);
  if (!founder) return Response.json({ error: 'forbidden' }, { status: 403 });

  let body: {
    record_type?: string; category?: string; description?: string; amount?: number; currency?: string;
    is_recurring?: boolean; recurrence_interval?: string; person?: string; occurred_on?: string; notes?: string;
  };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  if (body.record_type !== 'expense' && body.record_type !== 'contribution') {
    return Response.json({ error: 'record_type must be expense or contribution' }, { status: 400 });
  }
  if (!body.description?.trim()) return Response.json({ error: 'description required' }, { status: 400 });
  if (!body.amount || body.amount <= 0) return Response.json({ error: 'amount must be > 0' }, { status: 400 });
  if (!body.person?.trim()) return Response.json({ error: 'person required' }, { status: 400 });

  const res = await fetch(`${SUPA_URL}/rest/v1/admin_ledger`, {
    method: 'POST',
    headers: { ...svcHdr(), Prefer: 'return=representation' },
    body: JSON.stringify({
      record_type: body.record_type,
      category: body.record_type === 'contribution' ? 'founder_capital' : (body.category ?? 'other'),
      description: body.description.trim(),
      amount: body.amount,
      currency: body.currency ?? 'INR',
      is_recurring: body.record_type === 'expense' ? !!body.is_recurring : false,
      recurrence_interval: body.is_recurring ? (body.recurrence_interval ?? 'monthly') : null,
      person: body.person.trim(),
      occurred_on: body.occurred_on ?? new Date().toISOString().slice(0, 10),
      notes: body.notes?.trim() || null,
      created_by: founder,
    }),
  });

  if (!res.ok) return Response.json({ error: await res.text() }, { status: 502 });
  const [row] = await res.json();
  return Response.json({ entry: row });
}

export async function DELETE(req: Request) {
  if (!SRVC_KEY) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 });
  if (!(await requireFounder(req))) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const res = await fetch(`${SUPA_URL}/rest/v1/admin_ledger?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...svcHdr(), Prefer: 'return=minimal' },
  });
  if (!res.ok) return Response.json({ error: 'Delete failed' }, { status: 502 });
  return Response.json({ ok: true });
}
