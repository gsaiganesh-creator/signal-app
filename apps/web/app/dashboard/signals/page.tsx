'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Types ─────────────────────────────────────────────────────────────────────
interface MLSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string;
  confidence: number; score: number;
}
interface TADetail {
  symbol: string; name: string; price: number; change_pct: number;
  ema5: number; ema20: number; ema50: number; sma200: number | null;
  rsi: number; macd: number; macd_signal: number;
  bb_upper: number; bb_lower: number;
  support_1: number; support_2: number;
  resistance_1: number; resistance_2: number;
  entry_lo: number; entry_hi: number;
  target_1: number; target_2: number; stop: number;
  w52_high: number; w52_low: number; pct_from_52h: number;
  vol_ratio: number; bias: string;
  signals: { type: string; reason: string }[];
}
type Num = number | null;
interface USDetail {
  symbol: string; name: string; price: Num; change_pct: Num;
  ema20: Num; ema50: Num; ema200: Num; rsi14: Num; macd: Num;
  bb_upper: Num; bb_lower: Num; bb_pct: Num;
  high_52w: Num; low_52w: Num; from_52h: Num;
  vol_ratio: Num; stop_loss: Num; target1: Num; target2: Num;
  signals: string[];
  trailing_pe: Num; forward_pe: Num; ev_ebitda: Num; price_to_sales: Num; beta: Num;
  revenue_growth: Num; earnings_growth: Num;
  gross_margin: Num; operating_margin: Num; net_margin: Num; roe: Num;
  debt_to_equity: Num; current_ratio: Num;
  dividend_yield: Num; payout_ratio: Num; ex_div_date: string | null;
  market_cap: Num;
  analyst_count: Num; analyst_consensus: string | null; analyst_target: Num;
  analyst_target_high: Num; analyst_target_low: Num; upside_to_target: Num;
  next_earnings_date: string | null; days_to_earnings: Num;
  short_pct_float: Num; short_ratio: Num;
}
interface USSignal extends USDetail {
  zone: 'Strong Momentum' | 'Building' | 'Sideways' | 'Weak / Declining' | 'N/A';
  supertrend_value: Num;
  supertrend_dir:   1 | -1 | null;
}

// ── Curated US scan universe ──────────────────────────────────────────────────
const US_UNIVERSE = [
  'NVDA','MSFT','META','GOOGL','AMZN','AAPL','TSLA','AMD','NFLX',
  'JPM','V','MA','GS','BAC','BLK',
  'QQQ','SPY','SOXX','ARKK',
  'PLTR','COIN','APP','UBER','SNOW',
  'JNJ','UNH','ABBV',
  'XOM','CVX',
];

// ── India helpers ─────────────────────────────────────────────────────────────
async function fetchMLSignals(): Promise<MLSignal[]> {
  try {
    const r = await fetch('/api/ml/signals?limit=20', { next: { revalidate: 0 } });
    if (!r.ok) return [];
    const d = await r.json();
    return d.signals ?? [];
  } catch { return []; }
}
async function fetchTA(symbol: string): Promise<TADetail | null> {
  try {
    const r = await fetch(`/api/ml/signals/${encodeURIComponent(symbol)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ── US helpers ────────────────────────────────────────────────────────────────
function scoreUSZone(signals: string[]): USSignal['zone'] {
  const s = signals.join(' ').toLowerCase();
  const buy = (s.match(/bullish|above.*ema|positive.*macd|oversold|momentum|analyst.*target|upside/g) || []).length;
  const sel = (s.match(/bearish|below.*ema|negative.*macd|overbought|exit|short interest/g) || []).length;
  if (buy > sel + 1) return 'Strong Momentum';
  if (sel > buy + 1) return 'Weak / Declining';
  if (buy > 0 || sel > 0) return 'Building';
  return 'Sideways';
}
async function fetchUSUniverse(extra: string[]): Promise<USSignal[]> {
  const syms = [...new Set([...extra, ...US_UNIVERSE])];
  const results = await Promise.allSettled(
    syms.map(s =>
      fetch(`/api/stock-detail?symbol=${s}&exchange=NYSE`, { signal: AbortSignal.timeout(14000) })
        .then(r => r.ok ? r.json() as Promise<USDetail> : null)
        .catch(() => null)
    )
  );
  return results
    .map((r, i) => {
      if (r.status !== 'fulfilled' || !r.value) return null;
      const d = r.value;
      if (!d.price) return null;
      return { ...d, symbol: syms[i], zone: scoreUSZone(d.signals ?? []) } as USSignal;
    })
    .filter(Boolean) as USSignal[];
}

// ── Scan logging ──────────────────────────────────────────────────────────────
const ZONE_FROM_CAT: Record<string, string> = {
  buy: 'Strong Momentum', accumulate: 'Building', hold: 'Sideways', sell: 'Weak / Declining',
};
function scoreSig(s: MLSignal): 'buy' | 'accumulate' | 'hold' | 'sell' {
  const sig = (s.signal ?? '').toUpperCase();
  if (sig.includes('SELL') || sig.includes('BEARISH')) return 'sell';
  if (s.rsi > 72 && s.chg < 0) return 'sell';
  if (s.confidence >= 72) return 'buy';
  if (s.confidence >= 58) return 'accumulate';
  if (s.rsi > 65) return 'hold';
  return 'accumulate';
}
async function logScansAsync(sigs: MLSignal[]) {
  try {
    await fetch('/api/scan-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: sigs.map(s => ({
          symbol: s.symbol.replace('.NS', '').replace('.BO', ''),
          exchange: 'NSE',
          scan_score: ZONE_FROM_CAT[scoreSig(s)],
          price_at: s.cmp, rsi14: s.rsi, confidence: s.confidence,
        })),
      }),
    });
  } catch { /* fire-and-forget */ }
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function confColor(c: number) {
  if (c >= 80) return 'var(--grn)';
  if (c >= 65) return 'var(--bluL)';
  return 'var(--ylw)';
}
function chgColor(v: number) { return v >= 0 ? 'var(--grn)' : 'var(--red)'; }
function sectorColor(s: string) {
  const MAP: Record<string, string> = {
    Defense: 'rgba(255,59,92,0.1)', IT: 'rgba(139,92,246,0.1)', Banking: 'rgba(23,64,245,0.1)',
    Energy: 'rgba(255,92,26,0.1)', Auto: 'rgba(0,212,160,0.1)', Finance: 'rgba(0,212,160,0.1)',
    Semiconductor_Electronics: 'rgba(255,184,0,0.1)', FMCG: 'rgba(255,184,0,0.1)',
  };
  const key = Object.keys(MAP).find(k => s.includes(k)) ?? '';
  return MAP[key] ?? 'rgba(23,64,245,0.08)';
}
const ZONE_STYLE = {
  'Strong Momentum':  { color:'var(--grn)',  bg:'rgba(0,212,160,0.12)',  bdr:'rgba(0,212,160,0.28)',  grad:'linear-gradient(135deg,rgba(0,212,160,0.13),rgba(0,212,160,0.03))'  },
  'Building':         { color:'var(--bluL)', bg:'rgba(79,111,250,0.12)', bdr:'rgba(79,111,250,0.28)', grad:'linear-gradient(135deg,rgba(79,111,250,0.12),rgba(79,111,250,0.03))' },
  'Sideways':         { color:'var(--ylw)',  bg:'rgba(255,184,0,0.12)',  bdr:'rgba(255,184,0,0.28)',  grad:'linear-gradient(135deg,rgba(255,184,0,0.10),rgba(255,184,0,0.02))'   },
  'Weak / Declining': { color:'var(--red)',  bg:'rgba(255,59,92,0.12)',  bdr:'rgba(255,59,92,0.28)',  grad:'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.02))'   },
  'N/A':              { color:'var(--dim)',  bg:'rgba(122,139,170,0.08)',bdr:'rgba(122,139,170,0.2)', grad:'linear-gradient(135deg,rgba(122,139,170,0.06),transparent)'           },
};
function zs(z: USSignal['zone']) { return ZONE_STYLE[z] ?? ZONE_STYLE['N/A']; }

// ── India Detail Drawer ───────────────────────────────────────────────────────
function DetailDrawer({ sig, onClose }: { sig: MLSignal; onClose: () => void }) {
  const [ta, setTA] = useState<TADetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchTA(sig.symbol).then(d => { setTA(d); setLoading(false); });
  }, [sig.symbol]);
  const rr = ta
    ? ((ta.target_1 - ta.entry_hi) / (ta.entry_hi - ta.stop)).toFixed(1)
    : ((sig.target - sig.cmp) / (sig.cmp - sig.sl)).toFixed(1);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(480px,100vw)', background:'var(--card-bg)', borderLeft:'1px solid var(--bdr)', zIndex:301, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', position:'sticky', top:0, zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.4 }}>{sig.symbol.replace('.NS','')}</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{sig.name} · NSE</div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:24, fontWeight:900 }}>₹{sig.cmp.toLocaleString('en-IN', { maximumFractionDigits:2 })}</span>
            <span style={{ fontSize:14, fontWeight:700, color:chgColor(sig.chg) }}>{sig.chg >= 0 ? '+' : ''}{sig.chg.toFixed(2)}%</span>
            <span style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background: sig.confidence >= 75 ? 'rgba(0,212,160,0.15)' : 'rgba(23,64,245,0.12)', border:'1px solid', borderColor: sig.confidence >= 75 ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)', fontSize:12, fontWeight:800, color: confColor(sig.confidence) }}>
              🤖 {sig.confidence}% momentum score
            </span>
          </div>
        </div>
        <div style={{ padding:'20px 24px', flex:1 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--grn)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>ML Technical Scan · Strong Momentum</div>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3, marginBottom:4 }}>Entry ₹{sig.entry_low}–{sig.entry_high}</div>
              <div style={{ fontSize:12, color:'var(--dim)' }}>Target ₹{sig.target} · SL ₹{sig.sl}</div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:32, fontWeight:900, color:'var(--grn)', lineHeight:1 }}>{rr}×</div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:4 }}>Risk : Reward</div>
            </div>
          </div>
          {loading && <div style={{ textAlign:'center', padding:'40px', color:'var(--dim)' }}><div style={{ fontSize:24, marginBottom:8 }}>⏳</div>Loading technical analysis…</div>}
          {!loading && ta && (
            <>
              {ta.signals.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Signals Fired</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {ta.signals.map((s, i) => {
                      const bull = ['BUY','STRONG BUY','BULLISH','GOLDEN CROSS','ABOVE 200 SMA','VOLUME SPIKE'].includes(s.type);
                      const bear = ['SELL','STRONG SELL','BEARISH','DEATH CROSS','BELOW 200 SMA'].includes(s.type);
                      const c = bull ? 'var(--grn)' : bear ? 'var(--red)' : 'var(--ylw)';
                      const bg = bull ? 'rgba(0,212,160,0.07)' : bear ? 'rgba(255,59,92,0.07)' : 'rgba(255,184,0,0.07)';
                      return (
                        <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 14px', borderRadius:10, background:bg, border:`1px solid ${c.replace(')',',0.2)')}` }}>
                          <span style={{ fontSize:10, fontWeight:800, color:c, flexShrink:0, marginTop:1, whiteSpace:'nowrap' }}>{s.type}</span>
                          <span style={{ fontSize:12, color:'var(--dim)' }}>{s.reason}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Key Indicators</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { l:'RSI (14)', v:`${ta.rsi}`, c: ta.rsi < 40 ? 'var(--grn)' : ta.rsi > 65 ? 'var(--red)' : 'var(--txt)' },
                    { l:'Vol Ratio', v:`${ta.vol_ratio}×`, c: ta.vol_ratio >= 2 ? 'var(--grn)' : 'var(--txt)' },
                    { l:'EMA 20', v:`₹${ta.ema20.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--txt)' },
                    { l:'EMA 50', v:`₹${ta.ema50.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--txt)' },
                    { l:'MACD', v:`${ta.macd > 0 ? '+' : ''}${ta.macd.toFixed(2)}`, c: ta.macd > ta.macd_signal ? 'var(--grn)' : 'var(--red)' },
                    { l:'52W High', v:`₹${ta.w52_high.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--dim)' },
                    { l:'52W Low', v:`₹${ta.w52_low.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--dim)' },
                    { l:'From 52H', v:`${ta.pct_from_52h.toFixed(1)}%`, c: ta.pct_from_52h > -10 ? 'var(--org)' : 'var(--grn)' },
                  ].map(row => (
                    <div key={row.l} style={{ background:'var(--surf2)', borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:3 }}>{row.l}</div>
                      <div style={{ fontSize:15, fontWeight:800, color:row.c }}>{row.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Price Map</div>
                {[
                  { l:'🔴 Stop Loss', v:`₹${ta.stop}`, c:'var(--red)' },
                  { l:'🟢 Entry Zone', v:`₹${ta.entry_lo}–${ta.entry_hi}`, c:'var(--grn)' },
                  { l:'🟡 Resistance 1', v:`₹${ta.resistance_1}`, c:'var(--ylw)' },
                  { l:'🎯 Target 1', v:`₹${ta.target_1}`, c:'var(--grn)' },
                  { l:'🎯 Target 2', v:`₹${ta.target_2}`, c:'var(--grn)' },
                  { l:'🔷 BB Upper', v:`₹${ta.bb_upper}`, c:'var(--pur)' },
                ].map(row => (
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--bdr)' }}>
                    <span style={{ fontSize:12, color:'var(--dim)' }}>{row.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--surf2)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8 }}>Bollinger Band Position</div>
                {(() => {
                  const range = ta.bb_upper - ta.bb_lower;
                  const pos = range > 0 ? Math.min(100, Math.max(0, (ta.price - ta.bb_lower) / range * 100)) : 50;
                  return (
                    <>
                      <div style={{ position:'relative', height:6, background:'var(--bdr)', borderRadius:3 }}>
                        <div style={{ position:'absolute', left:0, width:`${pos}%`, height:'100%', background: pos < 30 ? 'var(--grn)' : pos > 70 ? 'var(--red)' : 'var(--bluL)', borderRadius:3, transition:'width 0.4s' }}/>
                        <div style={{ position:'absolute', left:`${pos}%`, top:-3, width:12, height:12, borderRadius:'50%', background:'#fff', border:'2px solid var(--bluL)', transform:'translateX(-50%)' }}/>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:'var(--dim)' }}>
                        <span>Lower ₹{ta.bb_lower}</span>
                        <span style={{ fontWeight:700, color: pos < 30 ? 'var(--grn)' : pos > 70 ? 'var(--red)' : 'var(--bluL)' }}>{pos.toFixed(0)}%</span>
                        <span>Upper ₹{ta.bb_upper}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
          {!loading && !ta && (
            <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'16px', fontSize:13, color:'var(--dim)' }}>
              ⚠️ Full technical analysis unavailable. ML API may be offline.
            </div>
          )}
        </div>
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', background:'var(--surf2)' }}>
          <div style={{ fontSize:10, color:'var(--dim2)', marginBottom:8 }}>⚠️ NOT SEBI REGISTERED · ML signals are probabilistic · Not financial advice · DYOR</div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ flex:1, height:40, borderRadius:10, background:'var(--grn)', border:'none', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🧪 Paper Trade</button>
            <button style={{ flex:1, height:40, borderRadius:10, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>📋 Add to Watchlist</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── US Detail Drawer ──────────────────────────────────────────────────────────
function USDetailDrawer({ sig, onClose }: { sig: USSignal; onClose: () => void }) {
  const z = zs(sig.zone);
  function fmt(n: Num, suffix = '', prefix = '') { return n != null ? `${prefix}${n}${suffix}` : '—'; }
  function Stat({ label, val, sub, color }: { label:string; val:string; sub?:string; color?:string }) {
    return (
      <div style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:9, padding:'9px 12px' }}>
        <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, letterSpacing:0.4, marginBottom:3 }}>{label.toUpperCase()}</div>
        <div style={{ fontSize:13, fontWeight:800, color: color ?? 'var(--txt)' }}>{val}</div>
        {sub && <div style={{ fontSize:9.5, color:'var(--dim)', marginTop:1 }}>{sub}</div>}
      </div>
    );
  }
  function Section({ title }: { title:string }) {
    return <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:4 }}>{title}</div>;
  }
  const cc = (c: string | null) => c === 'buy' || c === 'strong_buy' ? 'var(--grn)' : c === 'sell' || c === 'strong_sell' ? 'var(--red)' : 'var(--ylw)';
  const cmp = sig.price ?? 0;
  const chg = sig.change_pct ?? 0;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(520px,100vw)', background:'var(--card-bg)', borderLeft:'1px solid var(--bdr)', zIndex:301, overflowY:'auto', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', position:'sticky', top:0, zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.4 }}>{sig.symbol}</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{sig.name ?? sig.symbol} · NYSE/NASDAQ</div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:24, fontWeight:900 }}>{cmp ? `$${cmp.toFixed(2)}` : '—'}</span>
            {chg !== 0 && <span style={{ fontSize:14, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}% today</span>}
            <span style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background:z.bg, border:`1px solid ${z.bdr}`, fontSize:11, fontWeight:800, color:z.color }}>
              {sig.zone}
            </span>
          </div>
        </div>

        <div style={{ padding:'20px 24px', flex:1 }}>
          {/* Analyst banner */}
          {sig.analyst_consensus && (
            <div style={{ background:'linear-gradient(135deg,rgba(79,111,250,0.08),rgba(23,64,245,0.03))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:'16px 20px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:'var(--bluL)', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>
                  Wall St. Consensus · {sig.analyst_count ?? '—'} analysts
                </div>
                <div style={{ fontSize:16, fontWeight:800 }}>{sig.analyst_consensus?.replace('_',' ').toUpperCase() ?? '—'}</div>
                {sig.analyst_target && <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>Avg target ${sig.analyst_target} · range ${sig.analyst_target_low}–${sig.analyst_target_high}</div>}
              </div>
              {sig.upside_to_target != null && (
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:28, fontWeight:900, color: sig.upside_to_target >= 10 ? 'var(--grn)' : sig.upside_to_target < -5 ? 'var(--red)' : 'var(--ylw)', lineHeight:1 }}>
                    {sig.upside_to_target >= 0 ? '+' : ''}{sig.upside_to_target}%
                  </div>
                  <div style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>upside to target</div>
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          {sig.signals.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <Section title="Technical Signals" />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sig.signals.map((s, i) => {
                  const isBull = s.toLowerCase().includes('bullish') || s.toLowerCase().includes('above') || s.toLowerCase().includes('oversold') || s.toLowerCase().includes('upside');
                  const isBear = s.toLowerCase().includes('bearish') || s.toLowerCase().includes('below') || s.toLowerCase().includes('overbought') || s.toLowerCase().includes('elevated short');
                  const c = isBull ? 'var(--grn)' : isBear ? 'var(--red)' : 'var(--ylw)';
                  const bg = isBull ? 'rgba(0,212,160,0.07)' : isBear ? 'rgba(255,59,92,0.07)' : 'rgba(255,184,0,0.07)';
                  return (
                    <div key={i} style={{ padding:'9px 13px', borderRadius:9, background:bg, border:`1px solid ${c.replace(')',',0.2)')}`, fontSize:12, color: c }}>
                      {s}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technicals */}
          <Section title="Technicals" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            {sig.rsi14   != null && <Stat label="RSI 14"   val={sig.rsi14.toString()} color={sig.rsi14 > 70 ? 'var(--red)' : sig.rsi14 < 35 ? 'var(--grn)' : 'var(--txt)'} />}
            {sig.macd    != null && <Stat label="MACD"     val={sig.macd.toString()}  color={sig.macd >= 0 ? 'var(--grn)' : 'var(--red)'} />}
            {sig.bb_pct  != null && <Stat label="BB %"     val={`${sig.bb_pct}%`} sub="0=lower 100=upper" />}
            {sig.vol_ratio != null && <Stat label="Vol Ratio" val={`${sig.vol_ratio}x`} color={sig.vol_ratio > 2 ? 'var(--ylw)' : 'var(--txt)'} />}
            {sig.from_52h != null && <Stat label="vs 52W High" val={`${sig.from_52h}%`} color={sig.from_52h > -5 ? 'var(--grn)' : 'var(--dim)'} />}
            {sig.ema20   != null && <Stat label="EMA 20"   val={`$${sig.ema20}`} color={cmp > sig.ema20 ? 'var(--grn)' : 'var(--red)'} />}
            {sig.ema50   != null && <Stat label="EMA 50"   val={`$${sig.ema50}`} color={cmp > sig.ema50 ? 'var(--grn)' : 'var(--red)'} />}
            {sig.ema200  != null && <Stat label="EMA 200"  val={`$${sig.ema200}`} color={cmp > sig.ema200 ? 'var(--grn)' : 'var(--red)'} />}
          </div>

          {/* Valuation */}
          {(sig.trailing_pe != null || sig.forward_pe != null || sig.market_cap != null || sig.beta != null) && (
            <>
              <Section title="Valuation" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                {sig.trailing_pe    != null && <Stat label="P/E (TTM)"   val={fmt(sig.trailing_pe)} />}
                {sig.forward_pe     != null && <Stat label="Forward P/E" val={fmt(sig.forward_pe)} />}
                {sig.ev_ebitda      != null && <Stat label="EV/EBITDA"   val={fmt(sig.ev_ebitda)} />}
                {sig.beta           != null && <Stat label="Beta"        val={fmt(sig.beta)} sub="vs S&P 500" />}
                {sig.market_cap     != null && <Stat label="Market Cap"  val={sig.market_cap >= 1e12 ? `$${(sig.market_cap/1e12).toFixed(2)}T` : `$${(sig.market_cap/1e9).toFixed(1)}B`} />}
                {sig.short_pct_float != null && <Stat label="Short Float" val={fmt(sig.short_pct_float, '%')} color={sig.short_pct_float > 20 ? 'var(--ylw)' : 'var(--txt)'} />}
              </div>
            </>
          )}

          {/* Growth */}
          {(sig.revenue_growth != null || sig.net_margin != null || sig.roe != null) && (
            <>
              <Section title="Growth & Profitability" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                {sig.revenue_growth  != null && <Stat label="Revenue Growth"  val={fmt(sig.revenue_growth, '%')}  color={sig.revenue_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                {sig.earnings_growth != null && <Stat label="Earnings Growth" val={fmt(sig.earnings_growth, '%')} color={sig.earnings_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                {sig.net_margin      != null && <Stat label="Net Margin"      val={fmt(sig.net_margin, '%')} />}
                {sig.roe             != null && <Stat label="ROE"             val={fmt(sig.roe, '%')} />}
                {sig.gross_margin    != null && <Stat label="Gross Margin"    val={fmt(sig.gross_margin, '%')} />}
                {sig.operating_margin != null && <Stat label="Op. Margin"     val={fmt(sig.operating_margin, '%')} />}
              </div>
            </>
          )}

          {/* Earnings */}
          {sig.next_earnings_date && (
            <>
              <Section title="Earnings" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                <Stat label="Next Earnings" val={sig.next_earnings_date}
                  sub={sig.days_to_earnings != null ? `${sig.days_to_earnings}d away` : undefined}
                  color={sig.days_to_earnings != null && sig.days_to_earnings <= 14 ? 'var(--ylw)' : 'var(--txt)'} />
                {sig.dividend_yield != null && <Stat label="Div Yield" val={fmt(sig.dividend_yield, '%')} color="var(--grn)" />}
              </div>
            </>
          )}

          {/* Price targets */}
          {(sig.stop_loss != null || sig.target1 != null || sig.supertrend_value != null) && (
            <>
              <Section title="Price Levels" />
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { l:'🔴 Stop Loss',  v: sig.stop_loss        ? `$${sig.stop_loss}` : '—', c:'var(--red)' },
                  ...(sig.supertrend_value != null ? [{
                    l: sig.supertrend_dir === 1 ? '🟢 Supertrend Support' : '🔴 Supertrend Resistance',
                    v: `$${sig.supertrend_value}`,
                    c: sig.supertrend_dir === 1 ? 'var(--grn)' : 'var(--red)',
                  }] : []),
                  { l:'🎯 Target 1',   v: sig.target1          ? `$${sig.target1}` : '—',   c:'var(--grn)' },
                  { l:'🎯 Target 2',   v: sig.target2          ? `$${sig.target2}` : '—',   c:'var(--grn)' },
                ].map(row => (
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--bdr)' }}>
                    <span style={{ fontSize:12, color:'var(--dim)' }}>{row.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', background:'var(--surf2)' }}>
          <div style={{ fontSize:10, color:'var(--dim2)' }}>⚠️ NOT SEC REGISTERED · Signals are algorithmic estimates from public data · Not investment advice · DYOR</div>
        </div>
      </div>
    </>
  );
}

// ── Market Toggle ─────────────────────────────────────────────────────────────
function MarketToggle({ market, onChange }: { market: 'india' | 'us'; onChange: (m: 'india' | 'us') => void }) {
  return (
    <div style={{ display:'inline-flex', background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:3, gap:2 }}>
      {(['india','us'] as const).map(m => (
        <button key={m} onClick={() => onChange(m)}
          style={{ height:34, padding:'0 18px', borderRadius:9, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
            background: market === m ? (m === 'india' ? 'rgba(255,184,0,0.15)' : 'rgba(23,64,245,0.15)') : 'transparent',
            color: market === m ? (m === 'india' ? 'var(--ylw)' : 'var(--bluL)') : 'var(--dim)',
            boxShadow: market === m ? `0 0 0 1px ${m === 'india' ? 'rgba(255,184,0,0.35)' : 'rgba(79,111,250,0.35)'}` : 'none',
          }}>
          {m === 'india' ? '🇮🇳 India (NSE)' : '🇺🇸 US (NYSE/NASDAQ)'}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SignalsPage() {
  const { symbols: portfolioSymbols, portfolios, session } = usePortfolio();
  const [market, setMarket] = useState<'india' | 'us'>('india');

  // India state
  const [mlSignals, setMlSignals] = useState<MLSignal[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError,   setMlError]   = useState(false);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<MLSignal | null>(null);
  const [showAdv,   setShowAdv]   = useState(false);
  const [advSector, setAdvSector] = useState('');
  const [advMinRsi, setAdvMinRsi] = useState('');
  const [advMaxRsi, setAdvMaxRsi] = useState('');
  const [advMinConf,setAdvMinConf]= useState('');
  const [advMaxEma, setAdvMaxEma] = useState(''); // max abs % from EMA20

  // US state
  const [usSignals,    setUsSignals]    = useState<USSignal[]>([]);
  const [usLoading,    setUsLoading]    = useState(false);
  const [usLoaded,     setUsLoaded]     = useState(false);
  const [usFilter,     setUsFilter]     = useState('all');
  const [usSearch,     setUsSearch]     = useState('');
  const [selectedUS,   setSelectedUS]   = useState<USSignal | null>(null);
  const [usPortSyms,   setUsPortSyms]   = useState<string[]>([]);

  // India search
  const [searchResults, setSearchResults] = useState<{ symbol:string; ticker:string; name:string; exchange:string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const searchRef = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch US portfolio symbols
  useEffect(() => {
    if (!session || !portfolios.length) return;
    const ids = portfolios.map(p => p.id).join(',');
    fetch(`${SUPA_URL}/rest/v1/holdings?select=symbol&portfolio_id=in.(${ids})&exchange=in.(NYSE,NASDAQ,AMEX)`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.ok ? r.json() as Promise<{ symbol: string }[]> : [])
      .then(rows => setUsPortSyms(rows.map(r => r.symbol)))
      .catch(() => {});
  }, [session, portfolios]);

  function onSearchChange(val: string) {
    setSearch(val);
    if (searchRef[0]) clearTimeout(searchRef[0]);
    if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    setSearchLoading(true);
    searchRef[0] = setTimeout(async () => {
      try {
        const r = await fetch(`/api/stock-search?q=${encodeURIComponent(val)}`);
        const d = await r.json() as { results: { symbol:string; ticker:string; name:string; exchange:string }[] };
        setSearchResults(d.results ?? []);
        setShowDropdown(true);
      } catch { /**/ }
      setSearchLoading(false);
    }, 300);
  }

  async function analyseStock(item: { symbol:string; ticker:string; name:string; exchange:string }) {
    setShowDropdown(false); setSearch(item.name);
    const r = await fetch(`/api/stock-detail?symbol=${item.ticker}&exchange=${item.exchange}`);
    if (!r.ok) return;
    const d = await r.json();
    const synthetic: MLSignal = {
      symbol: item.ticker, name: item.name, sector: 'Custom',
      cmp: d.price ?? 0, chg: d.change_pct ?? 0,
      rsi: d.rsi14 ?? 50, ema20: d.ema20 ?? 0,
      ema_dist_pct: d.ema20 ? +((d.price - d.ema20) / d.ema20 * 100).toFixed(1) : 0,
      entry_low: d.entry_low ?? 0, entry_high: d.entry_high ?? 0,
      target: d.target1 ?? 0, sl: d.stop_loss ?? 0,
      signal: d.signals?.[0] ?? 'ANALYSIS',
      confidence: d.rsi14 ? Math.min(99, Math.round(50 + Math.abs(50 - d.rsi14))) : 60,
      score: 0,
    };
    setSelected(synthetic);
  }

  const loadIndia = useCallback(async () => {
    setMlLoading(true); setMlError(false);
    const sigs = await fetchMLSignals();
    if (sigs.length === 0) setMlError(true);
    setMlSignals(sigs);
    setMlLoading(false);
    if (sigs.length > 0) void logScansAsync(sigs);
  }, []);

  const loadUS = useCallback(async () => {
    if (usLoaded) return;
    setUsLoading(true);
    const sigs = await fetchUSUniverse(usPortSyms);
    setUsSignals(sigs);
    setUsLoading(false);
    setUsLoaded(true);
  }, [usPortSyms, usLoaded]);

  useEffect(() => { loadIndia(); }, [loadIndia]);
  useEffect(() => { localStorage.setItem('signal_visited_signals', '1'); }, []);
  useEffect(() => { if (market === 'us') loadUS(); }, [market, loadUS]);

  // India derived
  const hasPortfolio  = portfolioSymbols.length > 0;
  const portfolioCnt  = mlSignals.filter(s => portfolioSymbols.includes(s.symbol.replace('.NS',''))).length;
  const buyCnt        = mlSignals.filter(s => scoreSig(s) === 'buy').length;
  const accumulateCnt = mlSignals.filter(s => scoreSig(s) === 'accumulate').length;
  const holdCnt       = mlSignals.filter(s => scoreSig(s) === 'hold').length;
  const sellCnt       = mlSignals.filter(s => scoreSig(s) === 'sell').length;
  const FILTERS = [
    { key:'all',        label:`All (${mlSignals.length})` },
    ...(hasPortfolio ? [{ key:'portfolio', label:`💼 My Portfolio (${portfolioCnt})` }] : []),
    { key:'buy',        label:`🟢 Strong (${buyCnt})` },
    { key:'accumulate', label:`📈 Building (${accumulateCnt})` },
    { key:'hold',       label:`⏸ Sideways (${holdCnt})` },
    { key:'sell',       label:`🔴 Weak (${sellCnt})` },
    { key:'high',       label:'🔥 80%+' },
  ];
  const sectors = Array.from(new Set(mlSignals.map(s => s.sector).filter(Boolean))).sort();
  const advActive = !!(advSector || advMinRsi || advMaxRsi || advMinConf || advMaxEma);

  const shown = mlSignals
    .filter(s => {
      if (filter === 'portfolio')  return portfolioSymbols.includes(s.symbol.replace('.NS',''));
      if (filter === 'buy')        return scoreSig(s) === 'buy';
      if (filter === 'accumulate') return scoreSig(s) === 'accumulate';
      if (filter === 'hold')       return scoreSig(s) === 'hold';
      if (filter === 'sell')       return scoreSig(s) === 'sell';
      if (filter === 'high')       return s.confidence >= 80;
      return true;
    })
    .filter(s => !search || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()) || s.sector.toLowerCase().includes(search.toLowerCase()))
    .filter(s => !advSector  || s.sector === advSector)
    .filter(s => !advMinRsi  || s.rsi >= parseFloat(advMinRsi))
    .filter(s => !advMaxRsi  || s.rsi <= parseFloat(advMaxRsi))
    .filter(s => !advMinConf || s.confidence >= parseFloat(advMinConf))
    .filter(s => !advMaxEma  || Math.abs(s.ema_dist_pct) <= parseFloat(advMaxEma));

  // US derived
  const usPortSet   = new Set(usPortSyms);
  const usPortInSig = usSignals.filter(s => usPortSet.has(s.symbol)).length;
  const US_ZONE_COUNTS = {
    'Strong Momentum':  usSignals.filter(s => s.zone === 'Strong Momentum').length,
    'Building':         usSignals.filter(s => s.zone === 'Building').length,
    'Sideways':         usSignals.filter(s => s.zone === 'Sideways').length,
    'Weak / Declining': usSignals.filter(s => s.zone === 'Weak / Declining').length,
  };
  const US_FILTERS = [
    { key:'all',              label:`All (${usSignals.length})` },
    ...(usPortSyms.length ? [{ key:'portfolio', label:`💼 My US Holdings (${usPortInSig})` }] : []),
    { key:'Strong Momentum',  label:`🟢 Strong (${US_ZONE_COUNTS['Strong Momentum']})` },
    { key:'Building',         label:`📈 Building (${US_ZONE_COUNTS['Building']})` },
    { key:'Sideways',         label:`⏸ Sideways (${US_ZONE_COUNTS['Sideways']})` },
    { key:'Weak / Declining', label:`🔴 Weak (${US_ZONE_COUNTS['Weak / Declining']})` },
  ];
  const shownUS = usSignals
    .filter(s => {
      if (usFilter === 'portfolio') return usPortSet.has(s.symbol);
      if (usFilter === 'all') return true;
      return s.zone === usFilter;
    })
    .filter(s => !usSearch || s.symbol.toLowerCase().includes(usSearch.toLowerCase()) || (s.name ?? '').toLowerCase().includes(usSearch.toLowerCase()));

  return (
    <>
      {/* Header row — title + market toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color: market === 'india' ? 'var(--ylw)' : 'var(--bluL)', textTransform:'uppercase', marginBottom:4 }}>
            {market === 'india' ? 'ML Technical Scan · NSE Screener' : 'Technical Scan · NYSE / NASDAQ'}
          </div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>
            {market === 'india' ? '🇮🇳 India Signals' : '🇺🇸 US Signals'}
          </div>
        </div>
        <MarketToggle market={market} onChange={m => setMarket(m)} />
      </div>

      {/* Disclaimer */}
      <div style={{ background:'rgba(255,184,0,0.07)', border:'1px solid rgba(255,184,0,0.22)', borderRadius:12, padding:'10px 15px', marginBottom:16, display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:14, flexShrink:0 }}>🛠️</span>
        <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.65 }}>
          <strong style={{ color:'var(--ylw)' }}>Technical screening tool — not financial advice.</strong>{' '}
          Momentum zones computed from RSI, EMA, volume and {market === 'india' ? 'sector strength' : 'analyst consensus'}. Shows where price is technically — not what to do.{' '}
          {market === 'india' ? 'NOT SEBI registered.' : 'NOT SEC registered.'} DYOR.
        </div>
      </div>

      {/* ── INDIA CONTENT ────────────────────────────────────────────────── */}
      {market === 'india' && (
        <>
          {/* Zone KPIs */}
          {!mlLoading && mlSignals.length > 0 && (
            <div className="g4" style={{ display:'grid', gap:12, marginBottom:18 }}>
              {[
                { label:'Strong Momentum', cnt:buyCnt,        grad:'linear-gradient(135deg,rgba(0,212,160,0.13),rgba(0,212,160,0.03))',  bdr:'rgba(0,212,160,0.30)',  color:'var(--grn)' },
                { label:'Building',        cnt:accumulateCnt, grad:'linear-gradient(135deg,rgba(79,111,250,0.12),rgba(79,111,250,0.03))', bdr:'rgba(79,111,250,0.28)', color:'var(--bluL)' },
                { label:'Sideways',        cnt:holdCnt,       grad:'linear-gradient(135deg,rgba(255,184,0,0.10),rgba(255,184,0,0.02))',   bdr:'rgba(255,184,0,0.27)',  color:'var(--ylw)' },
                { label:'Weak / Declining',cnt:sellCnt,       grad:'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.02))',   bdr:'rgba(255,59,92,0.25)',  color:'var(--red)' },
              ].map(m => (
                <div key={m.label} style={{ background:m.grad, border:`1px solid ${m.bdr}`, borderRadius:16, padding:'14px 18px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
                  <div style={{ fontSize:9.5, fontWeight:800, color:m.color, letterSpacing:1.5, textTransform:'uppercase', marginBottom:5 }}>{m.label}</div>
                  <div style={{ fontSize:30, fontWeight:900, letterSpacing:-1, color:m.color }}>{m.cnt}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>signals</div>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="signals-filters" style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:'1 1 200px', maxWidth:320 }}>
              <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, opacity:0.5 }}>{searchLoading ? '⏳' : '🔍'}</span>
              <input value={search} onChange={e => onSearchChange(e.target.value)}
                onFocus={() => searchResults.length && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Search any NSE stock…"
                style={{ width:'100%', height:36, paddingLeft:34, paddingRight:10, borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--txt)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}/>
              {showDropdown && searchResults.length > 0 && (
                <div style={{ position:'absolute', top:40, left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:10, zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,0.3)', overflow:'hidden' }}>
                  {searchResults.map(item => (
                    <button key={item.ticker} onMouseDown={() => analyseStock(item)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 13px', background:'none', border:'none', borderBottom:'1px solid var(--bdr)', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize:11, fontWeight:800, background:'rgba(23,64,245,0.12)', color:'var(--bluL)', borderRadius:5, padding:'2px 6px', flexShrink:0 }}>{item.symbol}</span>
                      <span style={{ fontSize:12, color:'var(--txt)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                      <span style={{ fontSize:10, color:'var(--dim)', marginLeft:'auto', flexShrink:0 }}>{item.exchange}</span>
                    </button>
                  ))}
                  <div style={{ padding:'7px 13px', fontSize:11, color:'var(--dim)' }}>Select to analyse →</div>
                </div>
              )}
            </div>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ height:36, padding:'0 14px', borderRadius:9, border:`1px solid ${filter===f.key ? 'var(--grn)' : 'var(--bdr)'}`, background: filter===f.key ? 'rgba(0,212,160,0.12)' : 'var(--surf)', color: filter===f.key ? 'var(--grn)' : 'var(--dim)', fontSize:12, fontWeight: filter===f.key ? 700 : 500, cursor:'pointer', fontFamily:'inherit' }}>
                {f.label}
              </button>
            ))}
            <button onClick={loadIndia} style={{ height:36, padding:'0 14px', borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🔄</button>
            <button onClick={() => setShowAdv(v => !v)}
              style={{ height:36, padding:'0 14px', borderRadius:9, border:`1px solid ${advActive ? 'var(--pur)' : 'var(--bdr)'}`, background: advActive ? 'rgba(139,92,246,0.12)' : 'var(--surf)', color: advActive ? 'var(--pur)' : 'var(--dim)', fontSize:12, fontWeight: advActive ? 700 : 500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              ⚙ Filters{advActive ? ' •' : ''}
            </button>
          </div>

          {/* Advanced filter panel */}
          {showAdv && (
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', marginBottom:14, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
              {/* Sector */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Sector</div>
                <select value={advSector} onChange={e => setAdvSector(e.target.value)}
                  style={{ width:'100%', height:34, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit' }}>
                  <option value=''>All</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* RSI Min */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>RSI Min</div>
                <input type='number' min={0} max={100} value={advMinRsi} onChange={e => setAdvMinRsi(e.target.value)}
                  placeholder='e.g. 40'
                  style={{ width:'100%', height:34, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              {/* RSI Max */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>RSI Max</div>
                <input type='number' min={0} max={100} value={advMaxRsi} onChange={e => setAdvMaxRsi(e.target.value)}
                  placeholder='e.g. 65'
                  style={{ width:'100%', height:34, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              {/* Min confidence */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Min Confidence %</div>
                <input type='number' min={0} max={100} value={advMinConf} onChange={e => setAdvMinConf(e.target.value)}
                  placeholder='e.g. 70'
                  style={{ width:'100%', height:34, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              {/* Near EMA20 */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Near EMA20 (±%)</div>
                <input type='number' min={0} value={advMaxEma} onChange={e => setAdvMaxEma(e.target.value)}
                  placeholder='e.g. 5'
                  style={{ width:'100%', height:34, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              {/* Clear */}
              {advActive && (
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <button onClick={() => { setAdvSector(''); setAdvMinRsi(''); setAdvMaxRsi(''); setAdvMinConf(''); setAdvMaxEma(''); }}
                    style={{ height:34, width:'100%', borderRadius:7, background:'rgba(255,59,92,0.1)', border:'1px solid rgba(255,59,92,0.3)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    ✕ Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {mlLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height:88, borderRadius:14, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>)}
            </div>
          )}

          {!mlLoading && mlError && (
            <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:14, padding:'20px 24px' }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>⚠️ ML Signals unavailable</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
                Live ML signals require the backend API to be running. Use the Portfolio page to track holdings and P&L.
              </div>
            </div>
          )}

          {!mlLoading && shown.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {shown.map(sig => {
                const inPortfolio = portfolioSymbols.includes(sig.symbol.replace('.NS',''));
                const rr = ((sig.target - sig.cmp) / (sig.cmp - sig.sl)).toFixed(1);
                const secBg = sectorColor(sig.sector);
                return (
                  <div key={sig.symbol} onClick={() => setSelected(sig)}
                    style={{ background:`linear-gradient(160deg,${secBg},var(--card-bg))`, border:'1px solid var(--card-bdr)', borderRadius:16, padding:'15px 18px', cursor:'pointer', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(0,212,160,0.4)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--card-bdr)'; }}>
                    <div style={{ width:50, height:50, borderRadius:12, background:secBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'var(--txt)', flexShrink:0, border:'1px solid rgba(255,255,255,0.06)' }}>
                      {sig.symbol.replace('.NS','').slice(0,4)}
                    </div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:800 }}>{sig.symbol.replace('.NS','')}</span>
                        {inPortfolio && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)' }}>IN PORTFOLIO</span>}
                        {(() => {
                          const cat = scoreSig(sig);
                          const cfg = { buy:{ label:'Strong Momentum', bg:'rgba(0,212,160,0.12)', color:'var(--grn)', border:'rgba(0,212,160,0.25)' }, accumulate:{ label:'Building', bg:'rgba(79,111,250,0.12)', color:'var(--bluL)', border:'rgba(79,111,250,0.25)' }, hold:{ label:'Sideways', bg:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'rgba(255,184,0,0.25)' }, sell:{ label:'Weak / Declining', bg:'rgba(255,59,92,0.12)', color:'var(--red)', border:'rgba(255,59,92,0.25)' } }[cat];
                          return <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>;
                        })()}
                        <span style={{ marginLeft:'auto', fontSize:11, color:'var(--dim)' }}>{sig.sector.replace(/_/g,' ')}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>{sig.name}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {[`RSI ${sig.rsi}`, `EMA ${sig.ema_dist_pct > 0 ? '+' : ''}${sig.ema_dist_pct}%`, `${sig.chg >= 0 ? '+' : ''}${sig.chg.toFixed(1)}%`].map(t => (
                          <span key={t} style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:900 }}>₹{sig.cmp.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>T₹{sig.target.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                      <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end' }}>
                        <div style={{ width:52, height:4, borderRadius:2, background:'var(--bdr)' }}>
                          <div style={{ width:`${sig.confidence}%`, height:'100%', borderRadius:2, background:confColor(sig.confidence) }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:confColor(sig.confidence) }}>{sig.confidence}%</span>
                      </div>
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>R/R {rr}×</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!mlLoading && !mlError && shown.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No results for this filter</div>
              <button onClick={() => { setFilter('all'); setSearch(''); }} style={{ height:34, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Show All</button>
            </div>
          )}
        </>
      )}

      {/* ── US CONTENT ───────────────────────────────────────────────────── */}
      {market === 'us' && (
        <>
          {/* Zone KPIs */}
          {!usLoading && usSignals.length > 0 && (
            <div className="g4" style={{ display:'grid', gap:12, marginBottom:18 }}>
              {(['Strong Momentum','Building','Sideways','Weak / Declining'] as const).map(zone => {
                const st = ZONE_STYLE[zone];
                return (
                  <div key={zone} style={{ background:st.grad, border:`1px solid ${st.bdr}`, borderRadius:16, padding:'14px 18px' }}>
                    <div style={{ fontSize:9.5, fontWeight:800, color:st.color, letterSpacing:1.5, textTransform:'uppercase', marginBottom:5 }}>{zone}</div>
                    <div style={{ fontSize:30, fontWeight:900, color:st.color }}>{US_ZONE_COUNTS[zone]}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>stocks</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* US Controls */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <input value={usSearch} onChange={e => setUsSearch(e.target.value)}
              placeholder="Filter by symbol or name…"
              style={{ height:36, padding:'0 12px', borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--txt)', fontSize:13, fontFamily:'inherit', flex:'1 1 200px', maxWidth:280 }}/>
            {US_FILTERS.map(f => (
              <button key={f.key} onClick={() => setUsFilter(f.key)}
                style={{ height:36, padding:'0 14px', borderRadius:9, border:`1px solid ${usFilter===f.key ? 'var(--bluL)' : 'var(--bdr)'}`, background: usFilter===f.key ? 'rgba(79,111,250,0.12)' : 'var(--surf)', color: usFilter===f.key ? 'var(--bluL)' : 'var(--dim)', fontSize:12, fontWeight: usFilter===f.key ? 700 : 500, cursor:'pointer', fontFamily:'inherit' }}>
                {f.label}
              </button>
            ))}
            <button onClick={() => { setUsLoaded(false); loadUS(); }} style={{ height:36, padding:'0 14px', borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🔄</button>
          </div>

          {usLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height:80, borderRadius:14, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>)}
            </div>
          )}

          {!usLoading && shownUS.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {shownUS.map(sig => {
                const st = zs(sig.zone);
                const inPort = usPortSet.has(sig.symbol);
                const cmp = sig.price ?? 0;
                const chg = sig.change_pct ?? 0;
                return (
                  <div key={sig.symbol} onClick={() => setSelectedUS(sig)}
                    style={{ background:`linear-gradient(160deg,${st.grad},var(--card-bg))`, border:'1px solid var(--card-bdr)', borderRadius:16, padding:'14px 18px', cursor:'pointer', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = st.bdr; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-bdr)'; }}>

                    <div style={{ width:50, height:50, borderRadius:12, background:st.bg, border:`1px solid ${st.bdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:st.color, flexShrink:0 }}>
                      {sig.symbol.slice(0,4)}
                    </div>

                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:800 }}>{sig.symbol}</span>
                        {inPort && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)' }}>IN PORTFOLIO</span>}
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:st.bg, color:st.color, border:`1px solid ${st.bdr}` }}>{sig.zone}</span>
                        {sig.analyst_consensus && (
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'rgba(79,111,250,0.1)', color:'var(--bluL)', border:'1px solid rgba(79,111,250,0.25)' }}>
                            {sig.analyst_consensus.replace('_',' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>{sig.name ?? sig.symbol}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {sig.rsi14 != null && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)' }}>RSI {sig.rsi14}</span>}
                        {sig.upside_to_target != null && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surf2)', color: sig.upside_to_target >= 10 ? 'var(--grn)' : 'var(--dim)', border:'1px solid var(--card-bdr)' }}>Target +{sig.upside_to_target}%</span>}
                        {sig.market_cap != null && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)' }}>{sig.market_cap >= 1e12 ? `$${(sig.market_cap/1e12).toFixed(1)}T` : `$${(sig.market_cap/1e9).toFixed(0)}B`}</span>}
                        <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'var(--surf2)', color: chg >= 0 ? 'var(--grn)' : 'var(--red)', border:'1px solid var(--card-bdr)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:900 }}>{cmp ? `$${cmp.toFixed(2)}` : '—'}</div>
                      {sig.analyst_target != null && <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>T ${sig.analyst_target}</div>}
                      {sig.rsi14 != null && (
                        <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end' }}>
                          <div style={{ width:52, height:4, borderRadius:2, background:'var(--bdr)' }}>
                            <div style={{ width:`${Math.min(100, sig.rsi14)}%`, height:'100%', borderRadius:2, background: sig.rsi14 > 70 ? 'var(--red)' : sig.rsi14 < 35 ? 'var(--grn)' : 'var(--bluL)' }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color: sig.rsi14 > 70 ? 'var(--red)' : sig.rsi14 < 35 ? 'var(--grn)' : 'var(--dim)' }}>{sig.rsi14}</span>
                        </div>
                      )}
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>RSI</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!usLoading && !usLoaded && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🇺🇸</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Loading US market scan…</div>
            </div>
          )}

          {!usLoading && usLoaded && shownUS.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No results</div>
              <button onClick={() => { setUsFilter('all'); setUsSearch(''); }} style={{ height:34, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Show All</button>
            </div>
          )}

          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
            Scanning {US_UNIVERSE.length} curated stocks {usPortSyms.length > 0 ? `+ ${usPortSyms.length} from your portfolio` : ''} · Prices from Yahoo Finance (15-20 min delay) · NOT SEC REGISTERED · Not investment advice · DYOR
          </div>
        </>
      )}

      {selected  && <DetailDrawer   sig={selected}   onClose={() => setSelected(null)}  />}
      {selectedUS && <USDetailDrawer sig={selectedUS} onClose={() => setSelectedUS(null)} />}
    </>
  );
}
