'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Fetch helpers ─────────────────────────────────────────────────────────────
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

// ── Colour helpers ────────────────────────────────────────────────────────────
function confColor(c: number) {
  if (c >= 80) return 'var(--grn)';
  if (c >= 65) return 'var(--bluL)';
  return 'var(--ylw)';
}
function chgColor(v: number) { return v >= 0 ? 'var(--grn)' : 'var(--red)'; }
function sectorColor(s: string) {
  const MAP: Record<string,string> = {
    Defense:'rgba(255,59,92,0.1)',IT:'rgba(139,92,246,0.1)',Banking:'rgba(23,64,245,0.1)',
    Energy:'rgba(255,92,26,0.1)',Auto:'rgba(0,212,160,0.1)',Finance:'rgba(0,212,160,0.1)',
    Semiconductor_Electronics:'rgba(255,184,0,0.1)',FMCG:'rgba(255,184,0,0.1)',
  };
  const key = Object.keys(MAP).find(k => s.includes(k)) ?? '';
  return MAP[key] ?? 'rgba(23,64,245,0.08)';
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
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
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, backdropFilter:'blur(2px)' }}/>

      {/* Drawer */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(480px,100vw)', background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', borderLeft:'1px solid var(--bdr)', zIndex:301, overflowY:'auto', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', position:'sticky', top:0, zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.4 }}>{sig.symbol.replace('.NS','')}</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{sig.name} · NSE</div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:24, fontWeight:900 }}>₹{sig.cmp.toLocaleString('en-IN', { maximumFractionDigits:2 })}</span>
            <span style={{ fontSize:14, fontWeight:700, color:chgColor(sig.chg) }}>{sig.chg >= 0 ? '+' : ''}{sig.chg.toFixed(2)}%</span>
            <span style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background: sig.confidence >= 75 ? 'rgba(0,212,160,0.15)' : 'rgba(23,64,245,0.12)', border:'1px solid', borderColor: sig.confidence >= 75 ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)', fontSize:12, fontWeight:800, color: confColor(sig.confidence) }}>
              🤖 {sig.confidence}% confidence
            </span>
          </div>
        </div>

        <div style={{ padding:'20px 24px', flex:1 }}>

          {/* Signal summary card — referral card style */}
          <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--grn)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>ML Swing Signal · BUY</div>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3, marginBottom:4 }}>Entry ₹{sig.entry_low}–{sig.entry_high}</div>
              <div style={{ fontSize:12, color:'var(--dim)' }}>Target ₹{sig.target} · SL ₹{sig.sl}</div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:32, fontWeight:900, color:'var(--grn)', lineHeight:1 }}>{rr}×</div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:4 }}>Risk : Reward</div>
            </div>
          </div>

          {loading && (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--dim)' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
              Loading technical analysis…
            </div>
          )}

          {!loading && ta && (
            <>
              {/* ML signals list */}
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

              {/* Key indicators */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Key Indicators</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { l:'RSI (14)',     v:`${ta.rsi}`, c: ta.rsi < 40 ? 'var(--grn)' : ta.rsi > 65 ? 'var(--red)' : 'var(--txt)' },
                    { l:'Vol Ratio',    v:`${ta.vol_ratio}×`, c: ta.vol_ratio >= 2 ? 'var(--grn)' : 'var(--txt)' },
                    { l:'EMA 20',       v:`₹${ta.ema20.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--txt)' },
                    { l:'EMA 50',       v:`₹${ta.ema50.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--txt)' },
                    { l:'MACD',         v:`${ta.macd > 0 ? '+' : ''}${ta.macd.toFixed(2)}`, c: ta.macd > ta.macd_signal ? 'var(--grn)' : 'var(--red)' },
                    { l:'52W High',     v:`₹${ta.w52_high.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:'var(--dim)' },
                    { l:'52W Low',      v:`₹${ta.w52_low.toLocaleString('en-IN',{maximumFractionDigits:0})}`,  c:'var(--dim)' },
                    { l:'From 52H',     v:`${ta.pct_from_52h.toFixed(1)}%`, c: ta.pct_from_52h > -10 ? 'var(--org)' : 'var(--grn)' },
                  ].map(row => (
                    <div key={row.l} style={{ background:'var(--surf2)', borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:3 }}>{row.l}</div>
                      <div style={{ fontSize:15, fontWeight:800, color:row.c }}>{row.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price levels */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Price Map</div>
                {[
                  { l:'🔴 Stop Loss',     v:`₹${ta.stop}`,      c:'var(--red)'  },
                  { l:'🟢 Entry Zone',    v:`₹${ta.entry_lo}–${ta.entry_hi}`, c:'var(--grn)' },
                  { l:'🟡 Resistance 1',  v:`₹${ta.resistance_1}`, c:'var(--ylw)' },
                  { l:'🎯 Target 1',      v:`₹${ta.target_1}`,  c:'var(--grn)'  },
                  { l:'🎯 Target 2',      v:`₹${ta.target_2}`,  c:'var(--grn)'  },
                  { l:'🔷 BB Upper',      v:`₹${ta.bb_upper}`,  c:'var(--pur)'  },
                ].map(row => (
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--bdr)' }}>
                    <span style={{ fontSize:12, color:'var(--dim)' }}>{row.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>

              {/* Bollinger bands visual */}
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
              ⚠️ Full technical analysis unavailable. ML API may be offline. Start it with:<br/>
              <code style={{ display:'block', marginTop:8, fontSize:12, color:'var(--grn)', background:'rgba(0,0,0,0.2)', padding:'8px', borderRadius:6 }}>cd signal-app/apps/api && uvicorn main:app --reload</code>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', background:'var(--surf2)' }}>
          <div style={{ fontSize:10, color:'var(--dim2)', marginBottom:8 }}>⚠️ NOT SEBI REGISTERED · ML signals are probabilistic · Not financial advice · DYOR</div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ flex:1, height:40, borderRadius:10, background:'var(--grn)', border:'none', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🧪 Paper Trade</button>
            <button style={{ flex:1, height:40, borderRadius:10, background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', color:'var(--txt)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>📋 Add to Watchlist</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SignalsPage() {
  const { symbols: portfolioSymbols } = usePortfolio();
  const [mlSignals, setMlSignals] = useState<MLSignal[]>([]);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MLSignal | null>(null);

  // Live stock search (all NSE stocks)
  const [searchResults, setSearchResults] = useState<{ symbol:string; ticker:string; name:string; exchange:string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useState<ReturnType<typeof setTimeout> | null>(null);

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

  // Analyse a searched stock — fetch via stock-detail and show in modal as synthetic signal
  async function analyseStock(item: { symbol:string; ticker:string; name:string; exchange:string }) {
    setShowDropdown(false); setSearch(item.name);
    const r = await fetch(`/api/stock-detail?symbol=${item.ticker}&exchange=${item.exchange}`);
    if (!r.ok) return;
    const d = await r.json();
    // Build a synthetic MLSignal from stock-detail data so modal can render it
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

  const load = useCallback(async () => {
    setMlLoading(true); setMlError(false);
    const sigs = await fetchMLSignals();
    if (sigs.length === 0) setMlError(true);
    setMlSignals(sigs);
    setMlLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { localStorage.setItem('signal_visited_signals', '1'); }, []);

  const hasPortfolio = portfolioSymbols.length > 0;
  const portfolioCnt = mlSignals.filter(s => portfolioSymbols.includes(s.symbol.replace('.NS',''))).length;

  // Derive signal category from confidence + RSI
  function sigCategory(s: MLSignal): 'buy' | 'accumulate' | 'hold' | 'sell' {
    const sig = (s.signal ?? '').toUpperCase();
    if (sig.includes('SELL') || sig.includes('BEARISH')) return 'sell';
    if (s.rsi > 72 && s.chg < 0) return 'sell';
    if (s.confidence >= 72) return 'buy';
    if (s.confidence >= 58) return 'accumulate';
    if (s.rsi > 65) return 'hold';
    return 'accumulate';
  }

  const buyCnt        = mlSignals.filter(s => sigCategory(s) === 'buy').length;
  const accumulateCnt = mlSignals.filter(s => sigCategory(s) === 'accumulate').length;
  const holdCnt       = mlSignals.filter(s => sigCategory(s) === 'hold').length;
  const sellCnt       = mlSignals.filter(s => sigCategory(s) === 'sell').length;

  const FILTERS = [
    { key:'all',        label:`All (${mlSignals.length})` },
    ...(hasPortfolio ? [{ key:'portfolio',  label:`💼 My Portfolio (${portfolioCnt})` }] : []),
    { key:'buy',        label:`🟢 Buy (${buyCnt})` },
    { key:'accumulate', label:`📈 Accumulate (${accumulateCnt})` },
    { key:'hold',       label:`⏸ Hold (${holdCnt})` },
    { key:'sell',       label:`🔴 Sell (${sellCnt})` },
    { key:'high',       label:'🔥 High Conf (80%+)' },
  ];

  const shown = mlSignals
    .filter(s => {
      if (filter === 'portfolio')  return portfolioSymbols.includes(s.symbol.replace('.NS',''));
      if (filter === 'buy')        return sigCategory(s) === 'buy';
      if (filter === 'accumulate') return sigCategory(s) === 'accumulate';
      if (filter === 'hold')       return sigCategory(s) === 'hold';
      if (filter === 'sell')       return sigCategory(s) === 'sell';
      if (filter === 'high')       return s.confidence >= 80;
      return true;
    })
    .filter(s => !search || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()) || s.sector.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Hero — referral card style */}
      <div className="signals-hero" style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.07),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.18)', borderRadius:20, padding:'28px 36px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--grn)', textTransform:'uppercase', marginBottom:8 }}>ML Scanner · Live Signals</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Signals from real<br/>
            <span style={{ color:'var(--grn)' }}>machine learning.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:440 }}>
            RSI + EMA scan across 200+ NSE stocks. Confidence scored by proximity to EMA, RSI zone, and sector momentum. Updated every hour during market hours.
          </div>
        </div>
        <div className="signals-hero-count" style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:52, fontWeight:900, color:'var(--grn)', lineHeight:1 }}>{mlSignals.length}</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>signals today</div>
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background: mlError ? 'var(--red)' : 'var(--grn)', display:'inline-block' }}/>
            <span style={{ fontSize:11, color:'var(--dim)' }}>{mlError ? 'ML API offline' : 'ML API live'}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="signals-filters" style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {/* Live stock search — all NSE/BSE listed stocks */}
        <div style={{ position:'relative', flex:'1 1 220px', maxWidth:340 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.5, zIndex:1 }}>
            {searchLoading ? '⏳' : '🔍'}
          </span>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => searchResults.length && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search any listed stock…"
            style={{ width:'100%', height:38, paddingLeft:36, paddingRight:12, borderRadius:10, border:'1px solid rgba(79,111,250,0.22)', background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', color:'var(--txt)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div style={{ position:'absolute', top:42, left:0, right:0, background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:10, zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,0.3)', overflow:'hidden' }}>
              {searchResults.map(item => (
                <button
                  key={item.ticker}
                  onMouseDown={() => analyseStock(item)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'none', border:'none', borderBottom:'1px solid var(--bdr)', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span style={{ fontSize:11, fontWeight:800, background:'rgba(23,64,245,0.12)', color:'var(--bluL)', borderRadius:5, padding:'2px 7px', flexShrink:0 }}>{item.symbol}</span>
                  <span style={{ fontSize:12, color:'var(--txt)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize:10, color:'var(--dim)', marginLeft:'auto', flexShrink:0 }}>{item.exchange}</span>
                </button>
              ))}
              <div style={{ padding:'8px 14px', fontSize:11, color:'var(--dim)' }}>Select to analyse →</div>
            </div>
          )}
        </div>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ height:38, padding:'0 16px', borderRadius:10, border:`1px solid ${filter===f.key ? 'var(--grn)' : 'var(--bdr)'}`, background: filter===f.key ? 'rgba(0,212,160,0.12)' : 'var(--surf)', color: filter===f.key ? 'var(--grn)' : 'var(--dim)', fontSize:13, fontWeight: filter===f.key ? 700 : 500, cursor:'pointer', fontFamily:'inherit' }}>
            {f.label}
          </button>
        ))}
        <button onClick={load} style={{ height:38, padding:'0 16px', borderRadius:10, border:'1px solid rgba(79,111,250,0.22)', background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {mlLoading && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height:90, borderRadius:14, background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>
          ))}
        </div>
      )}

      {/* API offline warning */}
      {!mlLoading && mlError && (
        <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:14, padding:'20px 24px', marginBottom:16 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>⚠️ ML Signals unavailable</div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
            Live ML signals require the backend API server to be running. This feature will be available once the API is deployed to the cloud.
          </div>
          <div style={{ marginTop:10, fontSize:12, color:'var(--dim2)' }}>
            In the meantime, use Portfolio tab to track your holdings and P&L.
          </div>
        </div>
      )}

      {/* Signal cards */}
      {!mlLoading && shown.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {shown.map(sig => {
            const inPortfolio = portfolioSymbols.includes(sig.symbol.replace('.NS',''));
            const rr = ((sig.target - sig.cmp) / (sig.cmp - sig.sl)).toFixed(1);
            const secBg = sectorColor(sig.sector);
            return (
              <div key={sig.symbol} onClick={() => setSelected(sig)}
                style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:'16px 20px', cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(0,212,160,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 16px rgba(0,212,160,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--bdr)'; (e.currentTarget as HTMLElement).style.boxShadow='none'; }}>

                {/* Left: symbol chip */}
                <div style={{ width:52, height:52, borderRadius:13, background:secBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'var(--txt)', flexShrink:0, border:'1px solid rgba(255,255,255,0.06)' }}>
                  {sig.symbol.replace('.NS','').slice(0,4)}
                </div>

                {/* Middle */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800 }}>{sig.symbol.replace('.NS','')}</span>
                    {inPortfolio && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)' }}>IN PORTFOLIO</span>}
                    {(() => {
                      const cat = sigCategory(sig);
                      const cfg = {
                        buy:        { label:'BUY',        bg:'rgba(0,212,160,0.12)',  color:'var(--grn)',  border:'rgba(0,212,160,0.25)'  },
                        accumulate: { label:'ACCUMULATE', bg:'rgba(79,111,250,0.12)', color:'var(--bluL)', border:'rgba(79,111,250,0.25)' },
                        hold:       { label:'HOLD',       bg:'rgba(255,184,0,0.12)',  color:'var(--ylw)',  border:'rgba(255,184,0,0.25)'  },
                        sell:       { label:'SELL',       bg:'rgba(255,59,92,0.12)',  color:'var(--red)',  border:'rgba(255,59,92,0.25)'  },
                      }[cat];
                      return <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>;
                    })()}
                    <span style={{ marginLeft:'auto', fontSize:11, color:'var(--dim)' }}>{sig.sector.replace(/_/g,' ')}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--dim)', marginBottom:6 }}>{sig.name}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[
                      `RSI ${sig.rsi}`,
                      `EMA dist ${sig.ema_dist_pct > 0 ? '+' : ''}${sig.ema_dist_pct}%`,
                      `Chg ${sig.chg >= 0 ? '+' : ''}${sig.chg.toFixed(1)}%`,
                    ].map(t => (
                      <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid rgba(79,111,250,0.22)' }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Right */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:900 }}>₹{sig.cmp.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>Target ₹{sig.target.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                    {/* Confidence bar */}
                    <div style={{ width:60, height:4, borderRadius:2, background:'var(--bdr)' }}>
                      <div style={{ width:`${sig.confidence}%`, height:'100%', borderRadius:2, background:confColor(sig.confidence) }}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:confColor(sig.confidence) }}>{sig.confidence}%</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>RR {rr}×</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!mlLoading && !mlError && shown.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No signals match this filter</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:16 }}>Try switching to <strong>All</strong> or <strong>In My Portfolio</strong> — the scan refreshes every hour.</div>
          <button onClick={() => { setFilter('all'); setSearch(''); }} style={{ height:36, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Show All Signals
          </button>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:20, textAlign:'center' }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML signals are for educational purposes only · Not financial advice · DYOR
      </div>

      {/* Detail drawer */}
      {selected && <DetailDrawer sig={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
