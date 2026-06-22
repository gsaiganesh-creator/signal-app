'use server';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  // getSession reads JWT from cookies — no network call, no hang.
  // Middleware already verified the token; RLS enforces data access.
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, user: session?.user ?? null };
}

export interface ServerPortfolio {
  id: string; name: string; broker: string | null; created_at: string;
}
export interface ServerHolding {
  id: string; symbol: string; exchange: string; qty: number; avg_price: number;
}

export async function serverGetPortfolios(): Promise<ServerPortfolio[]> {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return [];
  const { data } = await supabase
    .from('portfolios')
    .select('id, name, broker, created_at')
    .eq('user_id', user.id)
    .order('created_at');
  return (data ?? []) as ServerPortfolio[];
}

export async function serverGetHoldings(portfolioId: string): Promise<ServerHolding[]> {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return [];
  const { data } = await supabase
    .from('holdings')
    .select('id, symbol, exchange, qty, avg_price')
    .eq('portfolio_id', portfolioId)
    .order('symbol');
  return (data ?? []) as ServerHolding[];
}

export async function serverCreatePortfolio(
  name: string
): Promise<{ id: string | null; error: string | null }> {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return { id: null, error: 'Not logged in. Please sign in again.' };

  // Ensure profile row exists (users who signed up before trigger)
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name ?? user.user_metadata?.name) || null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id' });

  const { data, error } = await supabase
    .from('portfolios')
    .insert({ user_id: user.id, name, broker: 'manual' })
    .select('id')
    .single();

  if (error) {
    console.error('[serverCreatePortfolio]', error.message, error.details);
    return { id: null, error: error.message };
  }
  return { id: data?.id ?? null, error: null };
}

export async function serverInsertHoldings(
  portfolioId: string,
  rows: Array<{ symbol: string; exchange: string; qty: number; avg_price: number }>
): Promise<{ error: string | null }> {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return { error: 'Not logged in. Please sign in again.' };

  const inserts = rows.map(r => ({
    portfolio_id: portfolioId,
    user_id: user.id,
    symbol: r.symbol,
    exchange: r.exchange,
    qty: r.qty,
    avg_price: r.avg_price,
  }));

  const { error } = await supabase
    .from('holdings')
    .upsert(inserts, { onConflict: 'portfolio_id,symbol,exchange' });

  if (error) {
    console.error('[serverInsertHoldings]', error.message);
    return { error: error.message };
  }
  return { error: null };
}
