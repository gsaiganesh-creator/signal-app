'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from './supabase/client';

export interface Portfolio {
  id: string; name: string; broker: string | null; created_at: string;
}
export interface RawHolding {
  id: string; symbol: string; exchange: string; qty: number; avg_price: number;
}

interface PortfolioCtx {
  user: User | null;
  session: Session | null;
  portfolios: Portfolio[];
  activeId: string | null;
  activePortfolio: Portfolio | null;
  setActiveId: (id: string) => void;
  holdings: RawHolding[];
  symbols: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  createPortfolio: (name: string) => Promise<{ id: string | null; error: string | null }>;
  renamePortfolio: (id: string, name: string) => Promise<{ error: string | null }>;
  deletePortfolio: (id: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<PortfolioCtx | null>(null);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function restFetch(
  path: string,
  token: string,
  options?: RequestInit & { prefer?: string }
) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: options?.prefer ?? 'return=representation',
      ...options?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<RawHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Ref so setActiveId can call fetchHoldings without stale-closure issues
  const sessionRef = useRef<Session | null>(null);

  const fetchHoldings = useCallback(async (portfolioId: string, token: string) => {
    try {
      const data: RawHolding[] = await restFetch(
        `holdings?select=id,symbol,exchange,qty,avg_price&portfolio_id=eq.${portfolioId}&order=symbol`,
        token
      );
      setHoldings(data ?? []);
    } catch (err) {
      console.error('[fetchHoldings]', err);
      setHoldings([]);
    }
  }, []);

  // Throttled activity heartbeat — updates profiles.last_active_at, at most once/hour
  // per browser, so "last seen" reflects real usage instead of Supabase's
  // last_sign_in_at (which only updates on actual re-authentication, not on
  // every app open with an already-valid session).
  const pingActive = useCallback((token: string, uid: string) => {
    if (typeof window === 'undefined') return;
    const key = 'signal_last_heartbeat';
    const last = Number(localStorage.getItem(key) ?? '0');
    if (Date.now() - last < 3_600_000) return; // <1hr since last ping — skip
    localStorage.setItem(key, String(Date.now()));
    restFetch(`profiles?id=eq.${uid}`, token, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ last_active_at: new Date().toISOString() }),
    }).catch(() => { /* non-critical, retry next hour */ });
  }, []);

  const fetchPortfolios = useCallback(async (token: string, uid: string) => {
    try {
      const data: Portfolio[] = await restFetch(
        `portfolios?select=id,name,broker,created_at&user_id=eq.${uid}&order=created_at`,
        token
      );
      const pList = data ?? [];
      setPortfolios(pList);
      const stored = typeof window !== 'undefined' ? localStorage.getItem('signal_active_portfolio') : null;
      const aid = (stored && pList.find(p => p.id === stored)) ? stored : (pList[0]?.id ?? null);
      if (aid && typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', aid);
      setActiveIdState(aid);
      if (aid) await fetchHoldings(aid, token);
      else setHoldings([]);
    } catch (err) {
      console.error('[fetchPortfolios]', err);
      setPortfolios([]);
    }
  }, [fetchHoldings]);

  const refresh = useCallback(async () => {
    if (!sessionRef.current) return;
    setLoading(true);
    try { await fetchPortfolios(sessionRef.current.access_token, sessionRef.current.user.id); }
    catch (err) { console.error('[refresh]', err); }
    finally { setLoading(false); }
  }, [fetchPortfolios]);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        sessionRef.current = sess;
        setSession(sess);
        const u = sess?.user ?? null;
        setUser(u);
        if (sess && u) {
          await fetchPortfolios(sess.access_token, u.id);
          pingActive(sess.access_token, u.id);
        } else {
          setPortfolios([]); setHoldings([]);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchPortfolios, pingActive]);

  // Switch active portfolio — fetches holdings via sessionRef (no stale closure)
  function setActiveId(id: string) {
    setActiveIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', id);
    if (sessionRef.current) {
      fetchHoldings(id, sessionRef.current.access_token);
    }
  }

  async function createPortfolio(name: string): Promise<{ id: string | null; error: string | null }> {
    if (!name.trim()) return { id: null, error: 'Portfolio name is required.' };
    if (!sessionRef.current) return { id: null, error: 'Not logged in. Please sign in again.' };
    const token = sessionRef.current.access_token;
    const uid   = sessionRef.current.user.id;

    try {
      await restFetch('profiles', token, {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify({
          id: uid,
          email: sessionRef.current.user.email ?? null,
          full_name: (sessionRef.current.user.user_metadata?.full_name ?? sessionRef.current.user.user_metadata?.name) || null,
          avatar_url: sessionRef.current.user.user_metadata?.avatar_url ?? null,
        }),
      });
    } catch (err) {
      console.warn('[createPortfolio] profile upsert:', err);
    }

    try {
      const rows = await restFetch('portfolios', token, {
        method: 'POST',
        body: JSON.stringify({ user_id: uid, name: name.trim(), broker: 'manual' }),
      });
      const id = Array.isArray(rows) ? rows[0]?.id : rows?.id;
      if (!id) return { id: null, error: 'Portfolio created but ID not returned.' };
      await fetchPortfolios(token, uid);
      setActiveId(id);
      return { id, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[createPortfolio]', msg);
      return { id: null, error: msg };
    }
  }

  async function renamePortfolio(id: string, name: string): Promise<{ error: string | null }> {
    if (!name.trim()) return { error: 'Name cannot be empty.' };
    if (!sessionRef.current) return { error: 'Not logged in.' };
    const token = sessionRef.current.access_token;
    try {
      await restFetch(`portfolios?id=eq.${id}`, token, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ name: name.trim() }),
      });
      setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p));
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[renamePortfolio]', msg);
      return { error: msg };
    }
  }

  async function deletePortfolio(id: string): Promise<{ error: string | null }> {
    if (!sessionRef.current) return { error: 'Not logged in.' };
    const token = sessionRef.current.access_token;
    try {
      // Delete holdings first (cascade via RLS)
      await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
      });
      await fetch(`${SUPA_URL}/rest/v1/portfolios?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
      });
      const remaining = portfolios.filter(p => p.id !== id);
      setPortfolios(prev => prev.filter(p => p.id !== id));
      if (activeId === id) {
        const next = remaining[0]?.id ?? null;
        setActiveIdState(next);
        if (next && typeof window !== 'undefined') localStorage.setItem('signal_active_portfolio', next);
        else if (typeof window !== 'undefined') localStorage.removeItem('signal_active_portfolio');
        if (next && sessionRef.current) {
          await fetchHoldings(next, sessionRef.current.access_token);
        } else {
          setHoldings([]);
        }
      }
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[deletePortfolio]', msg);
      return { error: msg };
    }
  }

  const activePortfolio = portfolios.find(p => p.id === activeId) ?? null;
  const symbols = holdings.map(h => h.symbol);

  return (
    <Ctx.Provider value={{ user, session, portfolios, activeId, activePortfolio, setActiveId, holdings, symbols, loading, refresh, createPortfolio, renamePortfolio, deletePortfolio }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePortfolio must be inside PortfolioProvider');
  return ctx;
}
