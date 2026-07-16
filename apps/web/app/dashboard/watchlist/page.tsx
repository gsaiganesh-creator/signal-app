'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

const StockChart = dynamic(() => import('@/components/StockChart'), { ssr: false });
import { PushSubscribeButton } from '@/components/PushSubscribeButton';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';
type Condition = 'above' | 'below';

interface WatchItem {
  id: string; symbol: string; exchange: Exchange; added_at: string;
  price?: number | null; change_pct?: number | null;
}

interface Alert {
  id: string; user_id: string; symbol: string; exchange: Exchange;
  target_price: number; condition: Condition;
  triggered: boolean; triggered_at?: string | null; triggered_price?: number | null;
  created_at: string;
}

interface DetailData {
  ema20?: number | null; ema50?: number | null;
  rsi14?: number | null; name?: string; signals?: string[];
}

const inp: React.CSSProperties = {
  height: 38, borderRadius: 8, background: 'var(--surf2)', border: '1px solid var(--bdr)',
  color: 'var(--txt)', fontSize: 13, padding: '0 10px', fontFamily: 'inherit', outline: 'none', width: '100%',
};

function priceKey(symbol: string, exchange: Exchange) {
  return exchange === 'NSE' ? symbol + '.NS' : exchange === 'BSE' ? symbol + '.BO' : symbol;
}

function fmtPrice(p: number, exchange: Exchange) {
  return exchange === 'NSE' || exchange === 'BSE'
    ? `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : `$${p.toFixed(2)}`;
}

export default function WatchlistPage() {
  const [session, setSession]         = useState<Session | null>(null);
  const [items, setItems]             = useState<WatchItem[]>([]);
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [triggered, setTriggered]     = useState<Alert[]>([]);
  const [loading, setLoading]         = useState(true);
  const [prices, setPrices]           = useState<Record<string, { price: number; change_pct: number }>>({});

  // Add watchlist form
  const [symbol, setSymbol]     = useState('');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [adding, setAdding]     = useState(false);
  const [msg, setMsg]           = useState('');

  // Alert form per stock
  const [alertStock, setAlertStock]       = useState<string | null>(null); // item.id
  const [alertCondition, setAlertCond]    = useState<Condition>('above');
  const [alertPrice, setAlertPrice]       = useState('');
  const [savingAlert, setSavingAlert]     = useState(false);

  // Expanded row + detail
  const [selected, setSelected]   = useState<WatchItem | null>(null);
  const [detail, setDetail]       = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Triggered banner
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Session ────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch alerts ───────────────────────────────────────────────────
  const fetchAlerts = useCallback(async (sess: Session) => {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/price_alerts?user_id=eq.${sess.user.id}&select=*&order=created_at.desc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${sess.access_token}` } },
    );
    if (!res.ok) return;
    const rows: Alert[] = await res.json();
    setAlerts(rows);
    return rows;
  }, []);

  // ── Fetch watchlist ────────────────────────────────────────────────
  const fetchItems = useCallback(async (sess: Session) => {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/watchlist?user_id=eq.${sess.user.id}&select=*&order=added_at.desc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${sess.access_token}` } },
    );
    if (!res.ok) return [] as WatchItem[];
    return (await res.json()) as WatchItem[];
  }, []);

  // ── Fetch prices + check alerts ────────────────────────────────────
  const fetchPricesAndCheck = useCallback(async (
    rows: WatchItem[], alertRows: Alert[], sess: Session,
  ) => {
    if (!rows.length) return;
    const syms = [...new Set(rows.map(r => priceKey(r.symbol, r.exchange)))];
    const res  = await fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`);
    if (!res.ok) return;
    const priceMap: Record<string, { price: number; change_pct: number }> = await res.json();
    setPrices(priceMap);
    setItems(prev => prev.map(item => {
      const p = priceMap[priceKey(item.symbol, item.exchange)];
      return p ? { ...item, price: p.price, change_pct: p.change_pct } : item;
    }));

    // Check untriggered alerts
    const active = alertRows.filter(a => !a.triggered);
    if (!active.length) return;
    const newlyTriggered: Alert[] = [];
    for (const a of active) {
      const p = priceMap[priceKey(a.symbol, a.exchange)]?.price;
      if (p == null) continue;
      const fired = a.condition === 'above' ? p >= a.target_price : p <= a.target_price;
      if (!fired) continue;
      // Mark triggered in DB
      await fetch(`${SUPA_URL}/rest/v1/price_alerts?id=eq.${a.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${sess.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ triggered: true, triggered_price: p, triggered_at: new Date().toISOString() }),
      });
      newlyTriggered.push({ ...a, triggered: true, triggered_price: p });
    }
    if (newlyTriggered.length) {
      setTriggered(newlyTriggered);
      setBannerDismissed(false);
      // Refresh alerts list
      fetchAlerts(sess);
    }
  }, [fetchAlerts]);

  // ── Bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([fetchItems(session), fetchAlerts(session)]).then(([rows, alertRows]) => {
      setItems(rows ?? []);
      if (rows?.length && alertRows) fetchPricesAndCheck(rows, alertRows, session);
      setLoading(false);
    });
  }, [session, fetchItems, fetchAlerts, fetchPricesAndCheck]);

  // ── Detail load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/stock-detail?symbol=${selected.symbol}&exchange=${selected.exchange}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setDetailLoading(false); });
  }, [selected]);

  // ── Add to watchlist ───────────────────────────────────────────────
  async function handleAdd() {
    const sym = symbol.trim().toUpperCase();
    if (!sym || !session) return;
    setAdding(true); setMsg('');
    const res = await fetch(`${SUPA_URL}/rest/v1/watchlist`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: session.user.id, symbol: sym, exchange }),
    });
    if (res.status === 409) { setMsg(`${sym} already in watchlist`); setAdding(false); return; }
    if (!res.ok) { setMsg('Failed to add'); setAdding(false); return; }
    setSymbol('');
    const rows = await fetchItems(session);
    setItems(rows ?? []);
    if (rows?.length) fetchPricesAndCheck(rows, alerts, session);
    setAdding(false);
  }

  // ── Remove from watchlist ──────────────────────────────────────────
  async function handleRemove(id: string) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/watchlist?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    setItems(prev => prev.filter(i => i.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  // ── Save alert ─────────────────────────────────────────────────────
  async function handleSaveAlert(item: WatchItem) {
    const tp = parseFloat(alertPrice);
    if (!session || isNaN(tp) || tp <= 0) return;
    setSavingAlert(true);
    const res = await fetch(`${SUPA_URL}/rest/v1/price_alerts`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, symbol: item.symbol, exchange: item.exchange, target_price: tp, condition: alertCondition }),
    });
    if (res.ok) {
      setAlertStock(null); setAlertPrice('');
      fetchAlerts(session);
    }
    setSavingAlert(false);
  }

  // ── Delete alert ───────────────────────────────────────────────────
  async function handleDeleteAlert(id: string) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/price_alerts?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  const card: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 14, padding: 16, marginBottom: 16,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'var(--card-shadow)',
  };

  const untriggeredCount = alerts.filter(a => !a.triggered).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Watchlist</h1>
          <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 0' }}>
            {items.length} stocks · {untriggeredCount} active alert{untriggeredCount !== 1 ? 's' : ''}
          </p>
        </div>
        <PushSubscribeButton accessToken={session?.access_token ?? null} />
      </div>

      {/* Triggered alerts banner */}
      {triggered.length > 0 && !bannerDismissed && (
        <div style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.35)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#FFB800' }}>🔔 Price Alerts Triggered</span>
            <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          {triggered.map(a => (
            <div key={a.id} style={{ fontSize: 13, color: 'var(--txt)', marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>{a.symbol}</span>
              <span style={{ color: 'var(--dim)' }}> crossed </span>
              <span style={{ color: '#FFB800', fontWeight: 700 }}>{fmtPrice(a.target_price, a.exchange)}</span>
              <span style={{ color: 'var(--dim)' }}> — now at </span>
              <span style={{ fontWeight: 700 }}>{a.triggered_price != null ? fmtPrice(a.triggered_price, a.exchange) : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add stock form */}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5 }}>SYMBOL</div>
          <input style={inp} placeholder="e.g. RELIANCE" value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5 }}>EXCHANGE</div>
          <select style={{ ...inp, appearance: 'none' }} value={exchange}
            onChange={e => setExchange(e.target.value as Exchange)}>
            {(['NSE', 'BSE', 'NYSE', 'NASDAQ'] as Exchange[]).map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <button onClick={handleAdd} disabled={adding || !symbol.trim()}
          style={{ height: 38, padding: '0 18px', borderRadius: 8, background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: adding || !symbol.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: adding || !symbol.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
          {adding ? 'Adding…' : '+ Add'}
        </button>
        {msg && <div style={{ width: '100%', fontSize: 12, color: 'var(--red)' }}>{msg}</div>}
      </div>

      {/* Watchlist */}
      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading…</div>
      ) : !items.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 32 }}>
          No stocks yet. Add a symbol above.
        </div>
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Symbol', 'Price', 'Change', 'Alerts', ''].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--bdr)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const up         = (item.change_pct ?? 0) >= 0;
                const isSelected = selected?.id === item.id;
                const itemAlerts = alerts.filter(a => a.symbol === item.symbol && a.exchange === item.exchange);
                const activeAlerts = itemAlerts.filter(a => !a.triggered);
                const isSettingAlert = alertStock === item.id;

                return (
                  <>
                    <tr key={item.id}
                      onClick={() => { setSelected(isSelected ? null : item); setAlertStock(null); }}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(23,64,245,0.05)' : 'transparent' }}>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{item.symbol}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{item.exchange}</div>
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', fontSize: 14, fontWeight: 600 }}>
                        {item.price != null ? fmtPrice(item.price, item.exchange) : <span style={{ color: 'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', fontSize: 13, fontWeight: 700, color: item.change_pct != null ? (up ? 'var(--grn)' : 'var(--red)') : 'var(--dim2)' }}>
                        {item.change_pct != null ? `${up ? '+' : ''}${item.change_pct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)' }}>
                        {activeAlerts.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {activeAlerts.map(a => (
                              <span key={a.id} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: a.condition === 'above' ? 'rgba(0,212,160,0.12)' : 'rgba(255,59,92,0.12)', color: a.condition === 'above' ? 'var(--grn)' : 'var(--red)', border: `1px solid ${a.condition === 'above' ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.3)'}` }}>
                                {a.condition === 'above' ? '▲' : '▼'} {fmtPrice(a.target_price, item.exchange)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--dim2)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', borderBottom: isSelected ? 'none' : '1px solid rgba(28,46,74,0.4)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={e => { e.stopPropagation(); setAlertStock(isSettingAlert ? null : item.id); setSelected(item); setAlertPrice(''); }}
                          title="Set price alert"
                          style={{ background: 'none', border: 'none', color: isSettingAlert ? 'var(--ylw)' : 'var(--dim2)', cursor: 'pointer', fontSize: 15, padding: '0 4px', fontFamily: 'inherit' }}>🔔</button>
                        <button onClick={e => { e.stopPropagation(); handleRemove(item.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--dim2)', cursor: 'pointer', fontSize: 16, padding: '0 4px', fontFamily: 'inherit' }}>×</button>
                      </td>
                    </tr>

                    {/* Expanded row: alert form + chart + signals */}
                    {isSelected && (
                      <tr key={item.id + '-detail'}>
                        <td colSpan={5} style={{ padding: '0 10px 16px', borderBottom: '1px solid rgba(28,46,74,0.4)' }}>

                          {/* Alert form */}
                          {isSettingAlert && (
                            <div style={{ background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginTop: 10, marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Set Price Alert — {item.symbol}</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ minWidth: 100 }}>
                                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CONDITION</div>
                                  <select style={{ ...inp, width: 'auto', height: 34, padding: '0 8px', appearance: 'none' }}
                                    value={alertCondition} onChange={e => setAlertCond(e.target.value as Condition)}>
                                    <option value="above">▲ Above</option>
                                    <option value="below">▼ Below</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1, minWidth: 120 }}>
                                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>TARGET PRICE</div>
                                  <input style={{ ...inp, height: 34 }} type="number" placeholder={item.price != null ? item.price.toFixed(0) : 'e.g. 3000'}
                                    value={alertPrice} onChange={e => setAlertPrice(e.target.value)} />
                                </div>
                                <button onClick={() => handleSaveAlert(item)} disabled={savingAlert || !alertPrice}
                                  style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--grn)', border: 'none', color: '#000', fontSize: 12, fontWeight: 800, cursor: savingAlert || !alertPrice ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingAlert || !alertPrice ? 0.5 : 1 }}>
                                  {savingAlert ? 'Saving…' : 'Save Alert'}
                                </button>
                                <button onClick={() => setAlertStock(null)}
                                  style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'none', border: '1px solid var(--bdr)', color: 'var(--dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* Active alerts for this stock */}
                          {itemAlerts.length > 0 && (
                            <div style={{ marginTop: 10, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Alerts</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {itemAlerts.map(a => (
                                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: a.triggered ? 'rgba(255,184,0,0.1)' : a.condition === 'above' ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border: `1px solid ${a.triggered ? 'rgba(255,184,0,0.3)' : a.condition === 'above' ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}`, color: a.triggered ? '#FFB800' : a.condition === 'above' ? 'var(--grn)' : 'var(--red)' }}>
                                    {a.triggered ? '✓' : a.condition === 'above' ? '▲' : '▼'} {fmtPrice(a.target_price, item.exchange)}
                                    {a.triggered && a.triggered_price != null && <span style={{ color: 'var(--dim)', fontWeight: 400 }}>→ hit {fmtPrice(a.triggered_price, item.exchange)}</span>}
                                    <button onClick={() => handleDeleteAlert(a.id)} style={{ background: 'none', border: 'none', color: 'var(--dim2)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick technicals */}
                          {detail && !detailLoading && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
                              {[
                                { label: 'RSI 14', val: detail.rsi14 != null ? detail.rsi14.toFixed(1) : '—', color: detail.rsi14 != null ? (detail.rsi14 < 35 ? 'var(--grn)' : detail.rsi14 > 70 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' },
                                { label: 'EMA 20', val: detail.ema20 != null ? fmtPrice(detail.ema20, item.exchange) : '—', color: 'var(--txt)' },
                                { label: 'EMA 50', val: detail.ema50 != null ? fmtPrice(detail.ema50, item.exchange) : '—', color: 'var(--txt)' },
                              ].map(m => (
                                <div key={m.label} style={{ background: 'var(--surf2)', borderRadius: 8, padding: '7px 12px', minWidth: 80 }}>
                                  <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700 }}>{m.label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.val}</div>
                                </div>
                              ))}
                              {detail.name && <div style={{ background: 'var(--surf2)', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 120 }}>
                                <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700 }}>NAME</div>
                                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.name}</div>
                              </div>}
                            </div>
                          )}
                          {detailLoading && <div style={{ fontSize: 12, color: 'var(--dim)', margin: '10px 0' }}>Loading technicals…</div>}

                          {/* Signal bullets */}
                          {detail?.signals?.slice(0, 3).map((s, i) => {
                            const bull = /ABOVE|BULLISH|OVERSOLD/i.test(s);
                            const bear = /BELOW|BEARISH|OVERBOUGHT/i.test(s);
                            return <div key={i} style={{ fontSize: 11, color: bull ? 'var(--grn)' : bear ? 'var(--red)' : 'var(--dim)', marginBottom: 3 }}>{bull ? '▲' : bear ? '▼' : '·'} {s}</div>;
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
        Prices checked on page load · 15-min delayed · Not SEBI registered · DYOR
      </div>
    </div>
  );
}
