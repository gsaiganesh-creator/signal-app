'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import {
  serverGetPortfolios,
  serverGetHoldings,
  serverCreatePortfolio,
  type ServerPortfolio,
  type ServerHolding,
} from '@/app/dashboard/portfolio/actions';

export type Portfolio = ServerPortfolio;
export type RawHolding = ServerHolding;

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
  // Browser client only used for auth state — all data fetching via server actions
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  function setActiveId(id: string) {
    setActiveIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', id);
  }

  const fetchHoldings = useCallback(async (portfolioId: string) => {
    const data = await serverGetHoldings(portfolioId);
    setHoldings(data);
  }, []);

  const fetchPortfolios = useCallback(async () => {
    const pList = await serverGetPortfolios();
    setPortfolios(pList);
    const stored = typeof window !== 'undefined' ? localStorage.getItem('signal_active_portfolio') : null;
    const aid = (stored && pList.find(p => p.id === stored)) ? stored : (pList[0]?.id ?? null);
    if (aid && typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', aid);
    setActiveIdState(aid);
    if (aid) await fetchHoldings(aid);
    else setHoldings([]);
  }, [fetchHoldings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPortfolios();
    } catch (err) {
      console.error('[portfolio-context] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPortfolios]);

  // Track auth state via onAuthStateChange — fires immediately with current session
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchPortfolios();
        } else {
          setPortfolios([]);
          setHoldings([]);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchPortfolios]);

  // Re-fetch holdings when user switches portfolio
  const [prevActiveId, setPrevActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (activeId && activeId !== prevActiveId) {
      setPrevActiveId(activeId);
      fetchHoldings(activeId);
    }
  }, [activeId, prevActiveId, fetchHoldings]);

  async function createPortfolio(name: string): Promise<{ id: string | null; error: string | null }> {
    if (!name.trim()) return { id: null, error: 'Portfolio name is required.' };
    const result = await serverCreatePortfolio(name.trim());
    if (result.id) {
      // Reload portfolio list via server action (no browser client auth needed)
      await fetchPortfolios();
      setActiveId(result.id);
    }
    return result;
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
