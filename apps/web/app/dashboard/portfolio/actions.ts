'use server';
import { createClient } from '@/lib/supabase/server';

export async function serverCreatePortfolio(
  name: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, error: 'Not logged in. Please sign in again.' };

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
