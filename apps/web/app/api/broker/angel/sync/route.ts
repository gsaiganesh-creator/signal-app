// Angel One SmartAPI — sync holdings into the user's Angel One portfolio
export const runtime = 'nodejs';

import { createDecipheriv } from 'crypto';
import { NextRequest } from 'next/server';

const ANGEL_BASE   = 'https://apiconnect.angelbroking.com';
const ANGEL_KEY    = process.env.ANGEL_ONE_API_KEY!;
const ENC_KEY_HEX  = process.env.BROKER_ENCRYPTION_KEY!;
const SUPA_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function decrypt(hex: string): string {
  const key = Buffer.from(ENC_KEY_HEX, 'hex');
  const buf  = Buffer.from(hex, 'hex');
  const iv   = buf.subarray(0, 16);
  const tag  = buf.subarray(16, 32);
  const enc  = buf.subarray(32);
  const dc   = createDecipheriv('aes-256-gcm', key, iv);
  dc.setAuthTag(tag);
  return Buffer.concat([dc.update(enc), dc.final()]).toString('utf8');
}

interface AngelHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;          // authorised qty (settled)
  t1quantity: number;        // T+1 unsettled
  averageprice: number;
  ltp: number;
  isin: string;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user from Supabase
  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${userToken}` },
  });
  if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: userId } = await userRes.json() as { id: string };

  // Fetch angel connection
  const connRes = await fetch(
    `${SUPA_URL}/rest/v1/angel_connections?user_id=eq.${userId}&select=*`,
    { headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` } }
  );
  const [conn] = await connRes.json() as Array<{
    id: string; client_id: string; access_token_enc: string;
    expires_at: string; holdings_count: number;
  }>;

  if (!conn) return Response.json({ error: 'Angel One not connected' }, { status: 400 });

  if (new Date(conn.expires_at) < new Date()) {
    return Response.json({ error: 'Session expired — please reconnect Angel One', expired: true }, { status: 400 });
  }

  let jwtToken: string;
  try { jwtToken = decrypt(conn.access_token_enc); }
  catch { return Response.json({ error: 'Failed to decrypt token — reconnect Angel One' }, { status: 500 }); }

  // Fetch holdings from Angel One
  const holdRes = await fetch(
    `${ANGEL_BASE}/rest/secure/angelbroking/portfolio/v1/getAllHolding`,
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'X-PrivateKey':    ANGEL_KEY,
        'X-UserType':      'USER',
        'X-SourceID':      'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP':'127.0.0.1',
        'X-MACAddress':    '00:00:00:00:00:00',
        Accept:            'application/json',
        'Content-Type':    'application/json',
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  const holdJson = await holdRes.json() as {
    status: boolean; message: string;
    data?: { holdings: AngelHolding[] };
  };

  if (!holdJson.status || !holdJson.data) {
    return Response.json({ error: holdJson.message || 'Failed to fetch holdings' }, { status: 400 });
  }

  const angelHoldings = holdJson.data.holdings.filter(h => (h.quantity + h.t1quantity) > 0);
  if (angelHoldings.length === 0) return Response.json({ synced: 0 });

  // Ensure "Angel One" portfolio exists for this user
  const pfRes = await fetch(
    `${SUPA_URL}/rest/v1/portfolios?user_id=eq.${userId}&name=eq.Angel%20One&select=id`,
    { headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` } }
  );
  let [portfolio] = await pfRes.json() as Array<{ id: string }>;

  if (!portfolio) {
    const createPf = await fetch(`${SUPA_URL}/rest/v1/portfolios`, {
      method: 'POST',
      headers: {
        apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_id: userId, name: 'Angel One', broker: 'angel_one' }),
    });
    [portfolio] = await createPf.json() as Array<{ id: string }>;
  }

  // Map Angel One holdings → our schema
  const rows = angelHoldings.map(h => ({
    portfolio_id: portfolio.id,
    symbol:       h.tradingsymbol.replace(/-EQ$/i, '').toUpperCase(),
    exchange:     h.exchange === 'BSE' ? 'BSE' : 'NSE',
    qty:          h.quantity + h.t1quantity,
    avg_price:    h.averageprice,
  }));

  // Delete old synced holdings for this portfolio, then insert fresh
  await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${portfolio.id}`, {
    method: 'DELETE',
    headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` },
  });

  const insertRes = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
    method: 'POST',
    headers: {
      apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return Response.json({ error: 'Failed to insert holdings', detail: err }, { status: 500 });
  }

  // Update last_synced_at and holdings_count
  await fetch(`${SUPA_URL}/rest/v1/angel_connections?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ last_synced_at: new Date().toISOString(), holdings_count: rows.length }),
  });

  return Response.json({ synced: rows.length, portfolio_id: portfolio.id });
}
