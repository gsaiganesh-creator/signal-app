// Saves/removes a push subscription for the authenticated user.
// Client sends: { subscription: PushSubscriptionJSON, action: 'subscribe'|'unsubscribe' }

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'unauth' }, { status: 401 });
  const token = auth.slice(7);

  // Verify JWT — fetch user from Supabase
  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return Response.json({ error: 'invalid token' }, { status: 401 });
  const { id: user_id } = await userRes.json() as { id: string };

  const body = await req.json() as { subscription: PushSubscriptionJSON; action?: string };
  const { subscription, action = 'subscribe' } = body;
  const endpoint = subscription.endpoint ?? '';
  const keys     = subscription.keys as Record<string, string> | undefined;
  const p256dh   = keys?.p256dh ?? '';
  const auth_key = keys?.auth   ?? '';

  if (action === 'unsubscribe') {
    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${user_id}&endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
    });
    return Response.json({ ok: true });
  }

  // Upsert subscription
  const res = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id, endpoint, p256dh, auth: auth_key }),
  });

  return Response.json({ ok: res.ok });
}
