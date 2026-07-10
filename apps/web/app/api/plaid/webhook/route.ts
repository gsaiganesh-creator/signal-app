// Plaid webhook — handles INVESTMENTS_DEFAULT_UPDATE events to auto-sync holdings
// Register this URL in Plaid Dashboard → Webhooks: https://signalgenie.ai/api/plaid/webhook
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createDecipheriv } from 'crypto';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET':    process.env.PLAID_SECRET!,
      },
    },
  }),
);

const SUPA_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENC_KEY      = process.env.PLAID_TOKEN_ENCRYPTION_KEY!;

function decrypt(encoded: string): string {
  const [ivHex, tagHex, dataHex] = encoded.split(':');
  const key = Buffer.from(ENC_KEY, 'hex');
  const dc  = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  dc.setAuthTag(Buffer.from(tagHex, 'hex'));
  return dc.update(Buffer.from(dataHex, 'hex')).toString('utf8') + dc.final('utf8');
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    webhook_type: string;
    webhook_code: string;
    item_id: string;
    error?: unknown;
  };

  // Only handle investment holding updates
  if (
    body.webhook_type !== 'INVESTMENTS' ||
    body.webhook_code !== 'DEFAULT_UPDATE'
  ) {
    return Response.json({ received: true });
  }

  const itemId = body.item_id;

  // Find the broker connection by item_id
  const connRes = await fetch(
    `${SUPA_URL}/rest/v1/broker_connections?plaid_item_id=eq.${itemId}&select=*`,
    { headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` } }
  );
  const [conn] = await connRes.json() as Array<{
    id: string; user_id: string; plaid_access_token: string;
  }>;

  if (!conn) return Response.json({ received: true });

  try {
    const access_token = decrypt(conn.plaid_access_token);
    const { data } = await plaidClient.investmentsHoldingsGet({ access_token });
    const { holdings, securities, accounts } = data;

    const accountMap = Object.fromEntries(accounts.map(a => [a.account_id, a]));
    const secMap     = Object.fromEntries(securities.map(s => [s.security_id, s]));

    const rows = holdings
      .filter(h => secMap[h.security_id]?.ticker_symbol)
      .map(h => {
        const sec     = secMap[h.security_id];
        const account = accountMap[h.account_id];
        return {
          user_id:              conn.user_id,
          broker_connection_id: conn.id,
          symbol:               sec.ticker_symbol!.toUpperCase(),
          name:                 sec.name ?? sec.ticker_symbol,
          qty:                  h.quantity,
          cost_basis:           h.cost_basis != null ? h.cost_basis / h.quantity : null,
          institution_price:    h.institution_price,
          institution_value:    h.institution_value,
          security_type:        sec.type ?? 'equity',
          vested_qty:           h.vested_quantity ?? null,
          unvested_qty:         h.quantity - (h.vested_quantity ?? h.quantity),
          account_name:         account?.name ?? null,
          account_type:         account?.type ?? null,
          synced_at:            new Date().toISOString(),
        };
      });

    if (rows.length > 0) {
      await fetch(`${SUPA_URL}/rest/v1/plaid_holdings`, {
        method: 'POST',
        headers: {
          apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
      });
    }

    await fetch(`${SUPA_URL}/rest/v1/broker_connections?id=eq.${conn.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
    });
  } catch { /* best-effort — don't retry on error */ }

  return Response.json({ received: true });
}
