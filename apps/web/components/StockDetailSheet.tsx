'use client';
import { useEffect, useState, useCallback } from 'react';
import { StockNews } from './StockNews';

interface Detail {
  name?: string;
  price?: number; change_pct?: number; prev_close?: number;
  rsi14?: number; ema20?: number; ema50?: number; ema200?: number;
  macd?: number; atr14?: number;
  high_52w?: number; low_52w?: number; from_52h?: number; vol_ratio?: number;
  bb_upper?: number; bb_lower?: number; bb_mid?: number; bb_pct?: number;
  stop_loss?: number; target1?: number; target2?: number;
  entry_low?: number; entry_high?: number;
  signals?: string[];
  // Valuation
  trailing_pe?: number; forward_pe?: number; price_to_book?: number;
  ev_ebitda?: number; price_to_sales?: number; beta?: number; market_cap?: number;
  // Growth & Profitability
  revenue_growth?: number; earnings_growth?: number;
  gross_margin?: number; operating_margin?: number; net_margin?: number;
  roe?: number; debt_to_equity?: number; current_ratio?: number;
  // Analyst
  analyst_count?: number; analyst_consensus?: string;
  analyst_target?: number; analyst_target_high?: number; analyst_target_low?: number;
  upside_to_target?: number;
  // Dividends & Short
  dividend_yield?: number; payout_ratio?: number; ex_div_date?: string;
  short_pct_float?: number; short_ratio?: number;
  // Earnings
  next_earnings_date?: string; days_to_earnings?: number;
  // India shareholding
  insider_pct?: number; institution_pct?: number; public_pct?: number;
}

export interface HoldingContext {
  qty: number;
  avgPrice: number;
  currency: 'INR' | 'USD';
  portfolioName?: string;
  usdInr?: number | null;
  mlBadge?: { label: string; color: string; bg: string; border: string; desc: string } | null;
  mlSignal?: string | null;
  isEtf?: boolean;
  onDelete?: () => void;
}

interface Props {
  symbol: string;
  exchange?: string;
  onClose: () => void;
  holding?: HoldingContext;
}

export function StockDetailSheet({ symbol, exchange = 'NSE', onClose, holding }: Props) {
  const [data,    setData]    = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const isIndia = exchange === 'NSE' || exchange === 'BSE';
  const cur = holding?.currency ?? (isIndia ? 'INR' : 'USD');

  const fmtP = useCallback((n: number) => cur === 'INR'
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 100 ? 2 : 0 })}`
    : `$${n.toFixed(2)}`, [cur]);

  const pct = (n: number, mul = true) => `${mul ? (n * 100).toFixed(1) : n.toFixed(1)}%`;

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch(`/api/stock-detail?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`);
      if (r.ok) setData(await r.json());
      else setError(true);
    } catch { setError(true); }
    setLoading(false);
  }, [symbol, exchange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // P&L from live price
  const livePrice = data?.price ?? null;
  const plAbs = (holding && livePrice != null && holding.avgPrice > 0.01)
    ? (livePrice - holding.avgPrice) * holding.qty : null;
  const plPct = (holding && plAbs != null && holding.avgPrice > 0.01)
    ? (livePrice! - holding.avgPrice) / holding.avgPrice * 100 : null;
  const plPos = plAbs == null || plAbs >= 0;

  const chgColor = data?.change_pct == null ? 'var(--dim)'
    : data.change_pct >= 0 ? 'var(--grn)' : 'var(--red)';

  function Stat({ label, val, sub, color }: { label: string; val: string; sub?: string; color?: string }) {
    return (
      <div style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:9, padding:'9px 12px' }}>
        <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, letterSpacing:0.4, textTransform:'uppercase' as const, marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:800, color: color ?? 'var(--txt)' }}>{val}</div>
        {sub && <div style={{ fontSize:9.5, color:'var(--dim)', marginTop:1 }}>{sub}</div>}
      </div>
    );
  }

  function SecHead({ title }: { title: string }) {
    return (
      <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase' as const,
        letterSpacing:1, marginBottom:8, marginTop:4 }}>{title}</div>
    );
  }

  // Merged signals: ML signal + API signals
  const allSignals: Array<{ text: string; bull: boolean; bear: boolean }> = [];
  if (holding?.mlSignal && !holding.isEtf) {
    const isBull = holding.mlSignal.includes('BUY');
    const isBear = holding.mlSignal.includes('SELL');
    allSignals.push({ text: `ML: ${holding.mlSignal}`, bull: isBull, bear: isBear });
  }
  for (const s of data?.signals ?? []) {
    const bull = /ABOVE|BULLISH|OVERSOLD/i.test(s);
    const bear = /BELOW|BEARISH|OVERBOUGHT/i.test(s);
    allSignals.push({ text: s, bull, bear });
  }

  function sigColor(s: { bull: boolean; bear: boolean }) {
    return s.bull ? 'var(--grn)' : s.bear ? 'var(--red)' : 'var(--ylw)';
  }
  function sigBg(s: { bull: boolean; bear: boolean }) {
    return s.bull ? 'rgba(0,212,160,0.07)' : s.bear ? 'rgba(255,59,92,0.07)' : 'rgba(255,184,0,0.07)';
  }

  const consensusColor = (c: string) =>
    c === 'buy' || c === 'strong_buy' ? 'var(--grn)'
    : c === 'sell' || c === 'strong_sell' ? 'var(--red)'
    : 'var(--ylw)';

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:900,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:20,
          width:'min(520px,95vw)', maxHeight:'90vh', display:'flex', flexDirection:'column',
          overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.65)' }}>

        {/* ─── HEADER ─── */}
        <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid var(--bdr)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>{symbol}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                {data?.name ?? symbol} · {holding?.portfolioName ?? exchange}
                {holding ? ` · ${holding.qty.toLocaleString('en-IN')} units` : ''}
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8,
                width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', color:'var(--dim)', fontSize:15, flexShrink:0 }}>✕</button>
          </div>

          {/* Price row */}
          {loading ? (
            <div style={{ height:36, background:'var(--surf2)', borderRadius:8, width:180 }}/>
          ) : data?.price != null ? (
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom: holding?.mlBadge ? 10 : 0 }}>
              <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8 }}>{fmtP(data.price)}</div>
              {data.change_pct != null && (
                <div style={{ fontSize:14, fontWeight:700, color:chgColor }}>
                  {data.change_pct >= 0 ? '+' : ''}{data.change_pct.toFixed(2)}% today
                </div>
              )}
            </div>
          ) : null}

          {/* ML badge */}
          {holding?.mlBadge && !holding.isEtf && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px',
              borderRadius:20, background:holding.mlBadge.bg, border:`1px solid ${holding.mlBadge.border}` }}>
              <span style={{ fontSize:11, fontWeight:800, color:holding.mlBadge.color }}>{holding.mlBadge.label}</span>
              <span style={{ fontSize:10, color:'var(--dim)' }}>{holding.mlBadge.desc}</span>
            </div>
          )}
        </div>

        {/* ─── SCROLLABLE BODY ─── */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* ── Position section (only when holding provided) ── */}
          {holding && (
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--bdr)' }}>
              <SecHead title="Portfolio Position" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                <Stat label="Avg Cost" val={fmtP(holding.avgPrice)} />
                <Stat label="Invested"
                  val={cur === 'USD'
                    ? `$${(holding.avgPrice * holding.qty).toFixed(0)}`
                    : `₹${(holding.avgPrice * holding.qty).toLocaleString('en-IN', { maximumFractionDigits:0 })}`}
                  sub={cur === 'USD' && holding.usdInr
                    ? `≈ ₹${(holding.avgPrice * holding.qty * holding.usdInr).toLocaleString('en-IN', { maximumFractionDigits:0 })}` : undefined} />
                <Stat label="Current Value"
                  val={livePrice != null
                    ? cur === 'USD'
                      ? `$${(livePrice * holding.qty).toFixed(0)}`
                      : `₹${(livePrice * holding.qty).toLocaleString('en-IN', { maximumFractionDigits:0 })}`
                    : '—'}
                  sub={cur === 'USD' && livePrice != null && holding.usdInr
                    ? `≈ ₹${(livePrice * holding.qty * holding.usdInr).toLocaleString('en-IN', { maximumFractionDigits:0 })}` : undefined} />
              </div>

              {/* P&L banner */}
              {plAbs != null && (
                <div style={{ background: plPos ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)',
                  border:`1px solid ${plPos ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`,
                  borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>UNREALISED P&amp;L</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                      {cur === 'USD'
                        ? `${plPos ? '+' : '-'}$${Math.abs(plAbs).toFixed(0)}`
                        : `${plPos ? '+' : '-'}₹${Math.abs(plAbs).toLocaleString('en-IN', { maximumFractionDigits:0 })}`}
                    </div>
                    {cur === 'USD' && holding.usdInr && (
                      <div style={{ fontSize:10, color:'var(--dim)' }}>
                        ≈ {plPos ? '+' : '-'}₹{(Math.abs(plAbs) * holding.usdInr).toLocaleString('en-IN', { maximumFractionDigits:0 })}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>RETURN</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                      {plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ padding:'14px 18px 18px' }}>

            {/* Loading skeleton */}
            {loading && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[80,120,60,100].map((w,i) => (
                  <div key={i} style={{ height:12, width:`${w}%`, background:'var(--surf2)', borderRadius:6 }}/>
                ))}
              </div>
            )}

            {error && (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--dim)', fontSize:12 }}>
                Could not load data for {symbol}. <button onClick={load} style={{ background:'none', border:'none', color:'var(--bluL)', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Retry</button>
              </div>
            )}

            {!loading && !error && data && (
              <>
                {/* ── Signals ── */}
                {allSignals.length > 0 && (
                  <>
                    <SecHead title="Scan Results" />
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                      {allSignals.map((s, i) => {
                        const col = sigColor(s);
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8,
                            padding:'7px 10px', background:sigBg(s), borderRadius:8, borderLeft:`3px solid ${col}` }}>
                            <span style={{ fontSize:11, color:col, fontWeight:700, flexShrink:0 }}>
                              {s.bull ? '▲' : s.bear ? '▼' : '•'}
                            </span>
                            <span style={{ fontSize:11, color:'var(--txt)', lineHeight:1.5 }}>{s.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Technicals ── */}
                <SecHead title="Technicals" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                  {data.rsi14    != null && <Stat label="RSI 14"    val={data.rsi14.toFixed(1)}
                    color={data.rsi14 < 35 ? 'var(--grn)' : data.rsi14 > 70 ? 'var(--red)' : 'var(--ylw)'} />}
                  {data.macd     != null && <Stat label="MACD"      val={data.macd.toFixed(2)}
                    color={data.macd >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                  {data.atr14    != null && <Stat label="ATR 14"    val={fmtP(data.atr14)}
                    sub={livePrice ? `${(data.atr14 / livePrice * 100).toFixed(1)}% of price` : undefined} />}
                  {data.bb_pct   != null && <Stat label="BB %B"     val={`${(data.bb_pct * 100).toFixed(0)}%`} sub="0=lower 100=upper" />}
                  {data.vol_ratio != null && <Stat label="Vol Ratio" val={`${data.vol_ratio.toFixed(1)}×`}
                    color={data.vol_ratio > 1.5 ? 'var(--grn)' : 'var(--txt)'} />}
                  {data.from_52h != null && <Stat label="vs 52W Hi"  val={`${data.from_52h.toFixed(1)}%`}
                    color={data.from_52h > -5 ? 'var(--grn)' : data.from_52h < -25 ? 'var(--red)' : 'var(--dim)'} />}
                  {data.ema20  != null && <Stat label="EMA 20"  val={fmtP(data.ema20)}
                    color={livePrice != null ? (livePrice > data.ema20 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)'} />}
                  {data.ema50  != null && <Stat label="EMA 50"  val={fmtP(data.ema50)}
                    color={livePrice != null ? (livePrice > data.ema50 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)'} />}
                  {data.ema200 != null && <Stat label="EMA 200" val={fmtP(data.ema200)}
                    color={livePrice != null ? (livePrice > data.ema200 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)'} />}
                </div>

                {/* ── Price Levels ── */}
                {(data.stop_loss != null || data.target1 != null || data.entry_low != null) && (
                  <>
                    <SecHead title="Price Levels" />
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                      {[
                        { label:'Stop Loss', val:data.stop_loss,             color:'var(--red)' },
                        { label:'Entry',     val:data.entry_low ?? data.entry_high, color:'var(--ylw)' },
                        { label:'Target 1',  val:data.target1,               color:'var(--grn)' },
                        { label:'Target 2',  val:data.target2,               color:'#00D4A0'    },
                      ].map(r => (
                        <div key={r.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'8px 10px',
                          borderTop:`2px solid ${r.color}` }}>
                          <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, letterSpacing:0.4, marginBottom:3 }}>{r.label}</div>
                          <div style={{ fontSize:12, fontWeight:800, color:r.color }}>
                            {r.val != null ? fmtP(r.val) : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Valuation ── */}
                {(data.trailing_pe != null || data.ev_ebitda != null || data.market_cap != null) && (
                  <>
                    <SecHead title="Valuation" />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {data.trailing_pe    != null && <Stat label="P/E TTM"    val={`${data.trailing_pe.toFixed(1)}×`}
                        color={data.trailing_pe < 20 ? 'var(--grn)' : data.trailing_pe > 40 ? 'var(--red)' : 'var(--txt)'} />}
                      {data.forward_pe     != null && <Stat label="Forward P/E" val={`${data.forward_pe.toFixed(1)}×`} />}
                      {data.price_to_book  != null && <Stat label="P/B"         val={`${data.price_to_book.toFixed(2)}×`} />}
                      {data.ev_ebitda      != null && <Stat label="EV/EBITDA"   val={`${data.ev_ebitda.toFixed(1)}×`} />}
                      {data.price_to_sales != null && <Stat label="P/S"         val={`${data.price_to_sales.toFixed(2)}×`} />}
                      {data.beta           != null && <Stat label="Beta"         val={data.beta.toFixed(2)}
                        sub={cur === 'USD' ? 'vs S&P 500' : 'vs Nifty'} />}
                      {data.market_cap != null && <Stat label="Market Cap" val={
                        cur === 'USD'
                          ? data.market_cap >= 1e12 ? `$${(data.market_cap/1e12).toFixed(2)}T` : `$${(data.market_cap/1e9).toFixed(1)}B`
                          : data.market_cap >= 1e11 ? `₹${(data.market_cap/1e7).toFixed(0)}Cr`
                            : data.market_cap >= 1e9 ? `₹${(data.market_cap/1e7).toFixed(0)}Cr` : `₹${data.market_cap.toLocaleString('en-IN',{maximumFractionDigits:0})}`
                      } />}
                    </div>
                  </>
                )}

                {/* ── Growth & Profitability ── */}
                {(data.revenue_growth != null || data.net_margin != null || data.roe != null) && (
                  <>
                    <SecHead title="Growth & Profitability" />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {data.revenue_growth   != null && <Stat label="Rev Growth"   val={pct(data.revenue_growth)}
                        color={data.revenue_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                      {data.earnings_growth  != null && <Stat label="EPS Growth"   val={pct(data.earnings_growth)}
                        color={data.earnings_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                      {data.gross_margin     != null && <Stat label="Gross Margin" val={pct(data.gross_margin)} />}
                      {data.operating_margin != null && <Stat label="Op. Margin"   val={pct(data.operating_margin)} />}
                      {data.net_margin       != null && <Stat label="Net Margin"   val={pct(data.net_margin)}
                        color={data.net_margin > 0.15 ? 'var(--grn)' : 'var(--txt)'} />}
                      {data.roe              != null && <Stat label="ROE"          val={pct(data.roe)}
                        color={data.roe > 0.15 ? 'var(--grn)' : 'var(--txt)'} />}
                      {data.debt_to_equity   != null && <Stat label="D/E Ratio"   val={data.debt_to_equity.toFixed(2)}
                        color={data.debt_to_equity > 2 ? 'var(--red)' : data.debt_to_equity < 0.5 ? 'var(--grn)' : 'var(--txt)'} />}
                    </div>
                  </>
                )}

                {/* ── Analyst & Earnings ── */}
                {(data.analyst_target != null || data.next_earnings_date) && (
                  <>
                    <SecHead title="Analyst & Earnings" />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {data.analyst_consensus && (
                        <Stat label="Consensus" val={data.analyst_consensus.replace('_',' ').toUpperCase()}
                          color={consensusColor(data.analyst_consensus)} />
                      )}
                      {data.analyst_target != null && (
                        <Stat label="Avg Target" val={fmtP(data.analyst_target)}
                          sub={data.analyst_count ? `${data.analyst_count} analysts` : undefined} />
                      )}
                      {data.upside_to_target != null && (
                        <Stat label="Upside" val={`${data.upside_to_target >= 0 ? '+' : ''}${data.upside_to_target.toFixed(1)}%`}
                          color={data.upside_to_target >= 10 ? 'var(--grn)' : data.upside_to_target < -5 ? 'var(--red)' : 'var(--ylw)'} />
                      )}
                      {data.next_earnings_date && (
                        <Stat label="Next Earnings"
                          val={new Date(data.next_earnings_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                          sub={data.days_to_earnings != null ? `${data.days_to_earnings}d away` : undefined}
                          color={data.days_to_earnings != null && data.days_to_earnings <= 14 ? 'var(--ylw)' : 'var(--txt)'} />
                      )}
                    </div>
                  </>
                )}

                {/* ── Dividend & Short Interest ── */}
                {(data.dividend_yield != null || data.short_pct_float != null) && (
                  <>
                    <SecHead title="Dividend & Short Interest" />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {data.dividend_yield  != null && <Stat label="Div Yield"    val={pct(data.dividend_yield)}   color="var(--grn)" />}
                      {data.payout_ratio    != null && <Stat label="Payout Ratio" val={pct(data.payout_ratio)} />}
                      {data.ex_div_date               && <Stat label="Ex-Div Date"  val={data.ex_div_date} />}
                      {data.short_pct_float != null && <Stat label="Short Float"  val={pct(data.short_pct_float)}
                        color={data.short_pct_float > 0.15 ? 'var(--ylw)' : 'var(--txt)'} />}
                      {data.short_ratio     != null && <Stat label="Days to Cover" val={`${data.short_ratio.toFixed(1)}d`} />}
                    </div>
                  </>
                )}

                {/* ── Shareholding Pattern (India) ── */}
                {(data.insider_pct != null || data.institution_pct != null) && (
                  <>
                    <SecHead title="Shareholding Pattern" />
                    <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
                      {[
                        { label:'Promoter / Insider', pct: data.insider_pct,     color:'var(--bluL)' },
                        { label:'Institutions',        pct: data.institution_pct, color:'var(--grn)'  },
                        { label:'Public',              pct: data.public_pct,      color:'var(--dim)'  },
                      ].filter(r => r.pct != null).map(row => (
                        <div key={row.label}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                            <span style={{ color:'var(--dim)' }}>{row.label}</span>
                            <span style={{ fontWeight:700, color:row.color }}>{row.pct}%</span>
                          </div>
                          <div style={{ height:5, background:'var(--bdr)', borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${Math.min(100, row.pct ?? 0)}%`, background:row.color, borderRadius:3 }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Earnings countdown ── */}
                {data.days_to_earnings != null && data.days_to_earnings >= 0 && data.days_to_earnings <= 30 && (
                  <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.1),transparent)',
                    border:'1px solid rgba(255,184,0,0.25)', borderRadius:10, padding:'9px 12px',
                    marginBottom:14, fontSize:11 }}>
                    ⏰ Earnings in <strong style={{ color:'var(--ylw)' }}>{data.days_to_earnings}d</strong>
                    {data.next_earnings_date
                      ? ` · ${new Date(data.next_earnings_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}` : ''}
                  </div>
                )}
              </>
            )}

            {/* ── Latest News ── */}
            <div style={{ marginTop: (!loading && !error) ? 4 : 0 }}>
              <SecHead title="Latest News" />
              <StockNews symbol={symbol} exchange={exchange} name={data?.name ?? undefined} />
            </div>

            {/* ── Disclaimer ── */}
            <div style={{ fontSize:9, color:'var(--dim2)', marginTop:12, lineHeight:1.6 }}>
              {isIndia
                ? '⚠️ NOT SEBI REGISTERED · Prices from Yahoo Finance · Algorithmic scan output — not investment advice · DYOR'
                : '⚠️ NOT SEC REGISTERED · Prices delayed 15-20 min · Algorithmic scan — not investment advice · DYOR'}
            </div>

            {/* ── Delete button ── */}
            {holding?.onDelete && (
              <button onClick={holding.onDelete}
                style={{ width:'100%', height:38, borderRadius:9, background:'rgba(255,59,92,0.08)',
                  border:'1px solid rgba(255,59,92,0.25)', color:'var(--red)', fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', marginTop:12 }}>
                🗑️ Remove from Portfolio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
