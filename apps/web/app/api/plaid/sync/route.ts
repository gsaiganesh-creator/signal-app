import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@/lib/supabase/server';
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

function decrypt(encoded: string): string {
  const [ivHex, tagHex, dataHex] = encoded.split(':');
  const key = Buffer.from(process.env.PLAID_TOKEN_ENCRYPTION_KEY!, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connection_id } = await req.json();

  // Fetch the connection record
  const { data: conn, error: connErr } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .single();

  if (connErr || !conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  try {
    const access_token = decrypt(conn.plaid_access_token);

    // Fetch investment holdings from Plaid
    const { data: holdingsResp } = await plaidClient.investmentsHoldingsGet({ access_token });
    const { holdings, securities, accounts } = holdingsResp;

    const accountMap = Object.fromEntries(accounts.map(a => [a.account_id, a]));
    const secMap     = Object.fromEntries(securities.map(s => [s.security_id, s]));

    const rows = holdings
      .filter(h => {
        const sec = secMap[h.security_id];
        return sec && sec.ticker_symbol;
      })
      .map(h => {
        const sec     = secMap[h.security_id];
        const account = accountMap[h.account_id];
        return {
          user_id:              user.id,
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

    // Upsert into plaid_holdings (symbol + connection_id is the unique key)
    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('plaid_holdings')
        .upsert(rows, { onConflict: 'broker_connection_id,symbol' });
      if (upsertErr) throw upsertErr;
    }

    // Update last_synced_at
    await supabase
      .from('broker_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', conn.id);

    return NextResponse.json({
      synced:   rows.length,
      holdings: rows.map(r => ({ symbol: r.symbol, qty: r.qty, cost_basis: r.cost_basis, vested_qty: r.vested_qty })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
