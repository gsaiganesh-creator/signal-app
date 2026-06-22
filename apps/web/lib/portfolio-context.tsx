'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './supabase/client';

export interface Portfolio {
  id: string;
  name: string;
  broker: string | null;
  created_at: string;
}

export interface RawHolding {
  id: string;
  symbol: string;
  exchange: string;
  qty: number;
  avg_price: number;
}

interface PortfolioCtx {
  user: User | null;
  portfolios: Portfolio[];
  activeId: string | null;
  activePortfolio: Portfolio | null;
  setActiveId: (id: string) => void;
  holdings: RawHolding[];
  symbols: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  createPortfolio: (name: string) => Promise<{ id: string | null; error: string | null }>;
}

const Ctx = createContext<PortfolioCtx | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<RawHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  function setActiveId(id: string) {
    setActiveIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', id);
  }

  const fetchHoldings = useCallback(async (portfolioId: string) => {
    const { data } = await supabase
      .from('holdings')
      .select('id, symbol, exchange, qty, avg_price')
      .eq('portfolio_id', portfolioId)
      .order('symbol');
    setHoldings(data ?? []);
  }, [supabase]);

  const fetchPortfolios = useCallback(async (uid: string) => {
    const { data: ps } = await supabase
      .from('portfolios')
      .select('id, name, broker, created_at')
      .eq('user_id', uid)
      .order('created_at');
    const pList = ps ?? [];
    setPortfolios(pList);
    const stored = typeof window !== 'undefined' ? localStorage.getItem('signal_active_portfolio') : null;
    const aid = (stored && pList.find(p => p.id === stored)) ? stored : (pList[0]?.id ?? null);
    if (aid && typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', aid);
    setActiveIdState(aid);
    if (aid) await fetchHoldings(aid);
    else setHoldings([]);
  }, [supabase, fetchHoldings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      if (u) await fetchPortfolios(u.id);
      else { setPortfolios([]); setHoldings([]); }
    } catch (err) {
      console.error('[portfolio-context] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchPortfolios]);

  // onAuthStateChange is the correct Supabase pattern for client components.
  // It fires immediately with the current session on mount, then on every change.
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchPortfolios(u.id);
        } else {
          setPortfolios([]);
          setHoldings([]);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchPortfolios]);

  // Re-fetch holdings when user switches active portfolio
  const [prevActiveId, setPrevActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (activeId && activeId !== prevActiveId) {
      setPrevActiveId(activeId);
      fetchHoldings(activeId);
    }
  }, [activeId, prevActiveId, fetchHoldings]);

  async function createPortfolio(name: string): Promise<{ id: string | null; error: string | null }> {
    // Use user from state — populated by onAuthStateChange which is always current
    if (!user) return { id: null, error: 'Not logged in. Please sign in again.' };
    // Upsert profile first — handles users who signed up before the trigger was deployed
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name ?? user.user_metadata?.name) || null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    }, { onConflict: 'id' });
    if (profileErr) console.error('[createPortfolio] profile upsert failed:', profileErr.message);
    const { data, error } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id, name, broker: 'manual' })
      .select('id')
      .single();
    if (error) {
      console.error('[createPortfolio] portfolio insert failed:', error.message, error.details, error.hint);
      return { id: null, error: error.message };
    }
    const newId = data?.id ?? null;
    await refresh();
    if (newId) setActiveId(newId);
    return { id: newId, error: null };
  }

  const activePortfolio = portfolios.find(p => p.id === activeId) ?? null;
  const symbols = holdings.map(h => h.symbol);

  return (
    <Ctx.Provider value={{ user, portfolios, activeId, activePortfolio, setActiveId, holdings, symbols, loading, refresh, createPortfolio }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePortfolio must be inside PortfolioProvider');
  return ctx;
}
