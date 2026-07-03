import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { createClient } from '@/lib/supabase/server';

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

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params: Parameters<typeof plaidClient.linkTokenCreate>[0] = {
      user:          { client_user_id: user.id },
      client_name:   'SignalGenie',
      products:      [Products.Investments],
      country_codes: [CountryCode.Us],
      language:      'en',
    };

    // OAuth redirect — required for major US banks (Chase, BoA, etc.) in production
    if (process.env.NEXT_PUBLIC_PLAID_REDIRECT_URI) {
      params.redirect_uri = process.env.NEXT_PUBLIC_PLAID_REDIRECT_URI;
    }
    // Webhook for auto-sync when broker pushes updates
    if (process.env.PLAID_WEBHOOK_URL) {
      params.webhook = process.env.PLAID_WEBHOOK_URL;
    }

    const resp = await plaidClient.linkTokenCreate(params);
    return NextResponse.json({ link_token: resp.data.link_token });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
