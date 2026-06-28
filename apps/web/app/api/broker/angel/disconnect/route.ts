// Angel One — remove connection and optionally delete synced holdings
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

const SUPA_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${userToken}` },
  });
  if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: userId } = await userRes.json() as { id: string };

  // Find the Angel One portfolio
  const pfRes = await fetch(
    `${SUPA_URL}/rest/v1/portfolios?user_id=eq.${userId}&name=eq.Angel%20One&select=id`,
    { headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` } }
  );
  const [portfolio] = await pfRes.json() as Array<{ id: string }>;

  // Delete holdings first, then portfolio, then connection
  if (portfolio) {
    await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${portfolio.id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` },
    });
    await fetch(`${SUPA_URL}/rest/v1/portfolios?id=eq.${portfolio.id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` },
    });
  }

  await fetch(`${SUPA_URL}/rest/v1/angel_connections?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` },
  });

  return Response.json({ success: true });
}
