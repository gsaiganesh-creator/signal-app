import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@/lib/supabase/server';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

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

// AES-256-GCM encrypt for storing access token in Supabase
function encrypt(text: string): string {
  const key = Buffer.from(process.env.PLAID_TOKEN_ENCRYPTION_KEY!, 'hex');
  const iv  = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encoded: string): string {
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

  const { public_token, institution_name } = await req.json();
  if (!public_token) return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });

  try {
    const { data } = await plaidClient.itemPublicTokenExchange({ public_token });
    const encrypted = encrypt(data.access_token);

    // Upsert broker connection (one per item_id)
    const { error } = await supabase.from('broker_connections').upsert({
      user_id:            user.id,
      broker_name:        institution_name ?? 'Unknown',
      plaid_access_token: encrypted,
      plaid_item_id:      data.item_id,
      institution_name:   institution_name ?? null,
      last_synced_at:     null,
    }, { onConflict: 'plaid_item_id' });

    if (error) throw error;
    return NextResponse.json({ success: true, item_id: data.item_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
