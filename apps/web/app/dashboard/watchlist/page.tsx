'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

const StockChart = dynamic(() => import('@/components/StockChart'), { ssr: false });

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';

interface WatchItem {
  id: string;
  symbol: string;
  exchange: Exchange;
  added_at: string;
  price?: number | null;
  change_pct?: number | null;
  prev_close?: number | null;
}

interface DetailData {
  ema20?: number | null;
  ema50?: number | null;
  rsi14?: number | null;
  name?: string;
  signals?: string[];
}

const inp: React.CSSProperties = {
  height: 40, borderRadius: 8, background: 'var(--surf2)', border: '1px solid var(--bdr)',
  color: 'var(--txt)', fontSize: 13, padding: '0 12px', fontFamily: 'inherit', outline: 'none', width: '100%',
};

export default function WatchlistPage() {
  const [session, setSession]   = useState<Session | null>(null);
  const [items, setItems]       = useState<WatchItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [symbol, setSymbol]     = useState('');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [adding, setAdding]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [detail, setDetail]     = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Session
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch watchlist
  const fetchItems = useCallback(async (sess: Session) => {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/watchlist?user_id=eq.${sess.user.id}&select=*&order=added_at.desc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${sess.access_token}` } },
    );
    if (!res.ok) return;
    const rows: WatchItem[] = await res.json();
    setItems(rows);
    return rows;
  }, []);

  // Fetch prices for all items
  const fetchPrices = useCallback(async (rows: WatchItem[]) => {
    if (!rows.length) return;
    const nse = rows.filter(r => r.exchange === 'NSE').map(r => r.symbol + '.NS');
    const bse = rows.filter(r => r.exchange === 'BSE').map(r => r.symbol + '.BO');
    const us  = rows.filter(r => r.exchange === 'NYSE' || r.exchange === 'NASDAQ').map(r => r.symbol);
    const syms = [...nse, ...bse, ...us];
    if (!syms.length) return;
    const res = await fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`);
    if (!res.ok) return;
    const prices: Record<string, { price: number; change_pct: number }> = await res.json();
    setItems(prev => prev.map(item => {
      const key = item.exchange === 'NSE' ? item.symbol + '.NS'
                : item.exchange === 'BSE' ? item.symbol + '.BO'
                : item.symbol;
      const p = prices[key];
      return p ? { ...item, price: p.price, change_pct: p.change_pct } : item;
    }));
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchItems(session).then(rows => {
      if (rows) fetchPrices(rows);
      setLoading(false);
    });
  }, [session, fetchItems, fetchPrices]);

  // Add to watchlist
  async function handleAdd() {
    const sym = symbol.trim().toUpperCase();
    if (!sym || !session) return;
    setAdding(true); setMsg('');
    const res = await fetch(`${SUPA_URL}/rest/v1/watchlist`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify({ user_id: session.user.id, symbol: sym, exchange }),
    });
    if (res.status === 409) { setMsg(`${sym} already in watchlist`); setAdding(false); return; }
    if (!res.ok) { setMsg('Failed to add'); setAdding(false); return; }
    setSymbol('');
    const rows = await fetchItems(session);
    if (rows) fetchPrices(rows);
    setAdding(false);
  }

  // Remove from watchlist
  async function handleRemove(id: string) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/watchlist?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    setItems(prev => prev.filter(i => i.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  // Load detail on select
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/stock-detail?symbol=${selected.symbol}&exchange=${selected.exchange}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setDetailLoading(false); });
  }, [selected]);

  const card: React.CSSProperties = {
    background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: 16, marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Watchlist</h1>
        <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 0' }}>Track stocks you&apos;re watching. Prices update every refresh.</p>
      </div>

      {/* Add form */}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5 }}>SYMBOL</div>
          <input style={inp} placeholder="e.g. RELIANCE" value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5 }}>EXCHANGE</div>
          <select style={{ ...inp, appearance: 'none' }} value={exchange}
            onChange={e => setExchange(e.target.value as Exchange)}>
            {(['NSE', 'BSE', 'NYSE', 'NASDAQ'] as Exchange[]).map(x => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>
        <button onClick={handleAdd} disabled={adding || !symbol.trim()}
          style={{ height: 40, padding: '0 20px', borderRadius: 8, background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: adding || !symbol.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: adding || !symbol.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
          {adding ? 'Adding…' : '+ Add'}
        </button>
        {msg && <div style={{ width: '100%', fontSize: 12, color: 'var(--red)' }}>{msg}</div>}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading watchlist…</div>
      ) : !items.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 32 }}>
          No stocks added yet. Type a symbol above and hit Add.
        </div>
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Symbol', 'Price', 'Change', 'Exchange', ''].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--bdr)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const up = (item.change_pct ?? 0) >= 0;
                const isSelected = selected?.id === item.id;
                return (
                  <>
                    <tr key={item.id}
                      onClick={() => setSelected(isSelected ? null : item)}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(23,64,245,0.06)' : 'transparent' }}>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{item.symbol}</div>
                        {detail?.name && isSelected && <div style={{ fontSize: 11, color: 'var(--dim)' }}>{detail.name}</div>}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', fontSize: 14, fontWeight: 600 }}>
                        {item.price != null ? (item.exchange === 'NSE' || item.exchange === 'BSE' ? `₹${item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `$${item.price.toFixed(2)}`) : <span style={{ color: 'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', fontSize: 13, fontWeight: 700, color: item.change_pct != null ? (up ? 'var(--grn)' : 'var(--red)') : 'var(--dim2)' }}>
                        {item.change_pct != null ? `${up ? '+' : ''}${item.change_pct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--surf2)', color: 'var(--dim)' }}>{item.exchange}</span>
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', textAlign: 'right' }}>
                        <button onClick={e => { e.stopPropagation(); handleRemove(item.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--dim2)', cursor: 'pointer', fontSize: 16, padding: '0 4px', fontFamily: 'inherit' }}>×</button>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr key={item.id + '-detail'}>
                        <td colSpan={5} style={{ padding: '0 10px 16px', borderBottom: '1px solid rgba(28,46,74,0.4)' }}>
                          {/* Quick stats */}
                          {detail && !detailLoading && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8, marginTop: 8 }}>
                              {[
                                { label: 'RSI 14', val: detail.rsi14 != null ? detail.rsi14.toFixed(1) : '—', color: detail.rsi14 != null ? (detail.rsi14 < 35 ? 'var(--grn)' : detail.rsi14 > 70 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' },
                                { label: 'EMA 20', val: detail.ema20 != null ? (item.exchange === 'NSE' || item.exchange === 'BSE' ? `₹${detail.ema20.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `$${detail.ema20.toFixed(2)}`) : '—', color: 'var(--txt)' },
                                { label: 'EMA 50', val: detail.ema50 != null ? (item.exchange === 'NSE' || item.exchange === 'BSE' ? `₹${detail.ema50.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `$${detail.ema50.toFixed(2)}`) : '—', color: 'var(--txt)' },
                              ].map(m => (
                                <div key={m.label} style={{ background: 'var(--surf2)', borderRadius: 8, padding: '7px 12px', minWidth: 80 }}>
                                  <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700 }}>{m.label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.val}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Signals */}
                          {detail?.signals?.slice(0, 3).map((s, i) => {
                            const bull = /ABOVE|BULLISH|OVERSOLD/i.test(s);
                            const bear = /BELOW|BEARISH|OVERBOUGHT/i.test(s);
                            return (
                              <div key={i} style={{ fontSize: 11, color: bull ? 'var(--grn)' : bear ? 'var(--red)' : 'var(--dim)', marginBottom: 3 }}>
                                {bull ? '▲' : bear ? '▼' : '·'} {s}
                              </div>
                            );
                          })}
                          {/* Chart */}
                          <StockChart symbol={item.symbol} exchange={item.exchange} ema20={detail?.ema20} ema50={detail?.ema50} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--dim2)', textAlign: 'center', marginTop: 8 }}>
        Not SEBI registered · Not investment advice · DYOR
      </div>
    </div>
  );
}
