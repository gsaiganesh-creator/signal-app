// Angel One SmartAPI — authenticate user and store encrypted JWT
// Password is used ONCE and NEVER stored. Only the resulting JWT is persisted (AES-256-GCM encrypted).
export const runtime = 'nodejs';

import { createCipheriv, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';

const ANGEL_BASE   = 'https://apiconnect.angelbroking.com';
const ANGEL_KEY    = process.env.ANGEL_ONE_API_KEY!;
const ENC_KEY_HEX  = process.env.BROKER_ENCRYPTION_KEY!;      // 64 hex chars = 32 bytes
const SUPA_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function encrypt(text: string): string {
  const key = Buffer.from(ENC_KEY_HEX, 'hex');
  const iv  = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  // layout: iv(16) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, enc]).toString('hex');
}

function midnightIst(): string {
  // Returns ISO string for midnight IST (UTC+5:30) of today
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow    = new Date(now.getTime() + istOffset);
  const midnight  = new Date(Date.UTC(
    istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1,
    0, 0, 0
  ) - istOffset);
  return midnight.toISOString();
}

export async function POST(req: NextRequest) {
  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization') ?? '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user ID from Supabase
  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${userToken}` },
  });
  if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: userId } = await userRes.json() as { id: string };

  const { clientcode, password, totp } = await req.json() as {
    clientcode: string; password: string; totp: string;
  };
  if (!clientcode || !password || !totp) {
    return Response.json({ error: 'clientcode, password and totp required' }, { status: 400 });
  }

  // Authenticate with Angel One SmartAPI
  const angelRes = await fetch(`${ANGEL_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'Accept':          'application/json',
      'X-UserType':      'USER',
      'X-SourceID':      'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP':'127.0.0.1',
      'X-MACAddress':    '00:00:00:00:00:00',
      'X-PrivateKey':    ANGEL_KEY,
    },
    body: JSON.stringify({ clientcode, password, totp }),
    signal: AbortSignal.timeout(10000),
  });

  const angelJson = await angelRes.json() as {
    status: boolean; message: string; errorcode: string;
    data?: { jwtToken: string; refreshToken: string; feedToken: string };
  };

  if (!angelJson.status || !angelJson.data) {
    const msg = angelJson.message || 'Angel One authentication failed';
    return Response.json({ error: msg }, { status: 400 });
  }

  const { jwtToken, feedToken } = angelJson.data;
  const expiresAt = midnightIst();

  // Encrypt tokens before storage — password already discarded here
  const accessTokenEnc = encrypt(jwtToken);
  const feedTokenEnc   = feedToken ? encrypt(feedToken) : null;

  // Upsert into angel_connections using service role (bypasses RLS)
  const upsertRes = await fetch(`${SUPA_URL}/rest/v1/angel_connections`, {
    method: 'POST',
    headers: {
      apikey: SUPA_SERVICE,
      Authorization: `Bearer ${SUPA_SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id:          userId,
      client_id:        clientcode.toUpperCase(),
      access_token_enc: accessTokenEnc,
      feed_token_enc:   feedTokenEnc,
      expires_at:       expiresAt,
    }),
  });

  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    return Response.json({ error: 'Failed to save connection', detail: err }, { status: 500 });
  }

  return Response.json({ success: true, client_id: clientcode.toUpperCase(), expires_at: expiresAt });
}
