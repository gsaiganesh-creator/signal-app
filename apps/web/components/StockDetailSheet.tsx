'use client';
import { useEffect, useState, useCallback } from 'react';

interface Detail {
  name?: string; price?: number; change_pct?: number; prev_close?: number;
  rsi14?: number; ema20?: number; ema50?: number; ema200?: number; macd?: number;
  high_52w?: number; low_52w?: number; from_52h?: number; vol_ratio?: number;
  bb_upper?: number; bb_lower?: number; bb_pct?: number;
  stop_loss?: number; target1?: number; target2?: number; entry_low?: number; entry_high?: number;
  signals?: string[];
  trailing_pe?: number; price_to_book?: number; ev_ebitda?: number;
  roe?: number; net_margin?: number; debt_to_equity?: number;
  revenue_growth?: number; dividend_yield?: number; market_cap?: number;
  analyst_consensus?: string; analyst_target?: number; upside_to_target?: number;
  next_earnings_date?: string; days_to_earnings?: number;
}

interface Props {
  symbol: string;
  exchange?: string;
  onClose: () => void;
}

function Bar({ val, max, color }: { val: number; max: number; color: string }) {
  return (
    <div style={{ height:4, background:'var(--bdr)', borderRadius:2, overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(100, Math.abs(val) / max * 100)}%`, background:color, borderRadius:2 }}/>
    </div>
  );
}

export function StockDetailSheet({ symbol, exchange = 'NSE', onClose }: Props) {
  const [data,    setData]    = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const isIndia = exchange === 'NSE' || exchange === 'BSE';
  const fmtP = (n: number) => isIndia
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 100 ? 2 : 0 })}`
    : `$${n.toFixed(2)}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/stock-detail?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`);
      if (r.ok) { setData(await r.json()); }
      else setError(true);
    } catch { setError(true); }
    setLoading(false);
  }, [symbol, exchange]);

  useEffect(() => { load(); }, [load]);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const chgColor = data?.change_pct == null ? 'var(--dim)' : data.change_pct >= 0 ? 'var(--grn)' : 'var(--red)';

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:900,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:20,
          width:'min(460px,95vw)', maxHeight:'90vh', display:'flex', flexDirection:'column',
          overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.65)' }}>

        {/* Header */}
        <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid var(--bdr)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>{symbol}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                {data?.name ?? symbol} · {exchange}
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8,
                width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', color:'var(--dim)', fontSize:15, flexShrink:0 }}>✕</button>
          </div>
          {loading ? (
            <div style={{ height:36, background:'var(--surf2)', borderRadius:8, width:180 }}/>
          ) : data?.price != null ? (
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8 }}>{fmtP(data.price)}</div>
              {data.change_pct != null && (
                <div style={{ fontSize:14, fontWeight:700, color:chgColor }}>{fmtPct(data.change_pct)}</div>
              )}
            </div>
          ) : null}
        </div>

        {/* Body — scrollable */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 18px' }}>
          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[80,120,60,100].map((w,i) => (
                <div key={i} style={{ height:12, width:`${w}%`, background:'var(--surf2)', borderRadius:6 }}/>
              ))}
            </div>
          )}
          {error && (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--dim)', fontSize:12 }}>
              Could not load data for {symbol}
            </div>
          )}
          {!loading && !error && data && (
            <>
              {/* Technicals */}
              <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.7, marginBottom:10 }}>Technicals</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'RSI 14', val:data.rsi14?.toFixed(1), color: data.rsi14 == null ? 'var(--dim)' : data.rsi14 < 40 ? 'var(--grn)' : data.rsi14 > 65 ? 'var(--red)' : 'var(--ylw)' },
                  { label:'EMA 20', val:data.ema20 != null ? fmtP(data.ema20) : null },
                  { label:'EMA 50', val:data.ema50 != null ? fmtP(data.ema50) : null },
                  { label:'EMA 200', val:data.ema200 != null ? fmtP(data.ema200) : null },
                  { label:'52W High', val:data.high_52w != null ? fmtP(data.high_52w) : null },
                  { label:'52W Low', val:data.low_52w != null ? fmtP(data.low_52w) : null },
                  { label:'Vol Ratio', val:data.vol_ratio != null ? `${data.vol_ratio.toFixed(1)}×` : null, color: data.vol_ratio != null ? (data.vol_ratio >= 1.5 ? 'var(--grn)' : 'var(--dim)') : 'var(--dim)' },
                  { label:'BB %B', val:data.bb_pct != null ? `${(data.bb_pct * 100).toFixed(0)}%` : null },
                ].map(row => (
                  <div key={row.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'8px 12px' }}>
                    <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{row.label}</div>
                    <div style={{ fontSize:14, fontWeight:800, color: row.color ?? 'var(--txt)' }}>{row.val ?? '—'}</div>
                  </div>
                ))}
              </div>

              {/* Entry / targets */}
              {(data.entry_low || data.stop_loss || data.target1) && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.7, marginBottom:10 }}>Levels</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                    {[
                      { label:'Stop Loss', val:data.stop_loss, color:'var(--red)' },
                      { label:'Entry', val:data.entry_low ?? data.entry_high, color:'var(--ylw)' },
                      { label:'Target 1', val:data.target1, color:'var(--grn)' },
                      { label:'Target 2', val:data.target2, color:'#00D4A0' },
                    ].map(r => (
                      <div key={r.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'8px 10px', borderTop:`2px solid ${r.color}` }}>
                        <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, letterSpacing:0.4, marginBottom:3 }}>{r.label}</div>
                        <div style={{ fontSize:12, fontWeight:800, color:r.color }}>{r.val != null ? fmtP(r.val) : '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Signals */}
              {data.signals && data.signals.length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.7, marginBottom:8 }}>Scan Results</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                    {data.signals.map((s, i) => {
                      const bull = /ABOVE|BULLISH|OVERSOLD/i.test(s);
                      const bear = /BELOW|BEARISH|OVERBOUGHT/i.test(s);
                      const col  = bull ? 'var(--grn)' : bear ? 'var(--red)' : 'var(--ylw)';
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 10px', background:'var(--surf2)', borderRadius:8, borderLeft:`3px solid ${col}` }}>
                          <span style={{ fontSize:11, color:col, fontWeight:700 }}>{bull ? '▲' : bear ? '▼' : '•'}</span>
                          <span style={{ fontSize:11, color:'var(--txt)', lineHeight:1.5 }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Fundamentals */}
              {(data.trailing_pe || data.roe || data.debt_to_equity) && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.7, marginBottom:10 }}>Fundamentals</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                    {[
                      { label:'P/E', val:data.trailing_pe?.toFixed(1) },
                      { label:'P/B', val:data.price_to_book?.toFixed(2) },
                      { label:'ROE', val:data.roe != null ? `${(data.roe*100).toFixed(1)}%` : null, color: data.roe != null ? (data.roe > 0.15 ? 'var(--grn)' : 'var(--dim)') : 'var(--dim)' },
                      { label:'Net Margin', val:data.net_margin != null ? `${(data.net_margin*100).toFixed(1)}%` : null },
                      { label:'Rev Growth', val:data.revenue_growth != null ? `${(data.revenue_growth*100).toFixed(1)}%` : null, color: data.revenue_growth != null ? (data.revenue_growth > 0 ? 'var(--grn)' : 'var(--red)') : 'var(--dim)' },
                      { label:'D/E', val:data.debt_to_equity?.toFixed(2), color: data.debt_to_equity != null ? (data.debt_to_equity > 1 ? 'var(--red)' : 'var(--grn)') : 'var(--dim)' },
                      { label:'Analyst', val:data.analyst_consensus ?? null },
                      { label:'Upside', val:data.upside_to_target != null ? `${data.upside_to_target.toFixed(1)}%` : null, color: data.upside_to_target != null ? (data.upside_to_target > 0 ? 'var(--grn)' : 'var(--red)') : 'var(--dim)' },
                    ].filter(r => r.val).map(row => (
                      <div key={row.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'8px 12px' }}>
                        <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{row.label}</div>
                        <div style={{ fontSize:14, fontWeight:800, color: row.color ?? 'var(--txt)' }}>{row.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {data.days_to_earnings != null && data.days_to_earnings >= 0 && (
                <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.1),transparent)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:10, padding:'9px 12px', marginBottom:14, fontSize:11 }}>
                  ⏰ Earnings in <strong style={{ color:'var(--ylw)' }}>{data.days_to_earnings}d</strong>
                  {data.next_earnings_date ? ` · ${new Date(data.next_earnings_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}` : ''}
                </div>
              )}

              <div style={{ fontSize:9, color:'var(--dim2)', marginTop:4 }}>
                ⚠️ NOT SEBI REGISTERED · Algorithmic scan output — not investment advice · DYOR
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
