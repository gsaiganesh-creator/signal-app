'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StockChartWrapper } from '@/components/StockChartWrapper';

interface StockData {
  symbol: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  rsi14: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  high_52w: number | null;
  low_52w: number | null;
  from_52h: number | null;
  signals: string[];
  error?: string;
}

const POPULAR = ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','WIPRO','LT','BAJFINANCE','KOTAKBANK','TATAMOTORS','ASIANPAINT'];

function fmtP(n: number | null) { return n != null ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'; }
function fmtPct(n: number | null) { return n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—'; }

function rsiBar(rsi: number | null) {
  if (rsi == null) return null;
  const color = rsi < 30 ? 'var(--grn)' : rsi > 70 ? 'var(--red)' : 'var(--ylw)';
  const label = rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{rsi.toFixed(1)}</span>
        <span style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</span>
      </div>
      <div style={{ height: 6, background: 'var(--surf2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(rsi, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function EmaRow({ label, price, ema }: { label: string; price: number | null; ema: number | null }) {
  if (!ema) return <div style={{ fontSize: 12, color: 'var(--dim)' }}>{label}: —</div>;
  const above = price != null && price > ema;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--bdr)' }}>
      <span style={{ fontSize: 11, color: 'var(--dim)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtP(ema)}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: above ? 'var(--grn)' : 'var(--red)' }}>{above ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

function ScoreBar({ a, b, label, higherBetter = true }: { a: number | null; b: number | null; label: string; higherBetter?: boolean }) {
  if (a == null || b == null) return null;
  const aWins = higherBetter ? a > b : a < b;
  const bWins = higherBetter ? b > a : b < a;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bdr)' }}>
      <div style={{ flex: 1, textAlign: 'right', fontSize: 12, fontWeight: 700, color: aWins ? 'var(--grn)' : 'var(--txt)' }}>{typeof a === 'number' ? a.toFixed(1) : a}</div>
      <div style={{ width: 80, textAlign: 'center', fontSize: 10, color: 'var(--dim)', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: bWins ? 'var(--grn)' : 'var(--txt)' }}>{typeof b === 'number' ? b.toFixed(1) : b}</div>
    </div>
  );
}

function CompareContent() {
  const params = useSearchParams();
  const [symA, setSymA] = useState(params.get('a')?.toUpperCase() ?? 'RELIANCE');
  const [symB, setSymB] = useState(params.get('b')?.toUpperCase() ?? 'TCS');
  const [inputA, setInputA] = useState(symA);
  const [inputB, setInputB] = useState(symB);
  const [dataA, setDataA] = useState<StockData | null>(null);
  const [dataB, setDataB] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBoth = useCallback(async (a: string, b: string) => {
    setLoading(true);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const [ra, rb] = await Promise.all([
      fetch(`${base}/api/stock-detail?symbol=${encodeURIComponent(a)}&exchange=NSE`).then(r => r.json()),
      fetch(`${base}/api/stock-detail?symbol=${encodeURIComponent(b)}&exchange=NSE`).then(r => r.json()),
    ]);
    setDataA(ra as StockData);
    setDataB(rb as StockData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoth(symA, symB); }, [symA, symB, fetchBoth]);

  function compare() {
    const a = inputA.trim().toUpperCase();
    const b = inputB.trim().toUpperCase();
    if (!a || !b || a === b) return;
    setSymA(a); setSymB(b);
    window.history.replaceState(null, '', `/stocks/compare?a=${a}&b=${b}`);
  }

  const bullA = dataA?.signals.filter(s => /ABOVE|OVERSOLD/i.test(s)).length ?? 0;
  const bullB = dataB?.signals.filter(s => /ABOVE|OVERSOLD/i.test(s)).length ?? 0;

  return (
    <>
      {/* Search bar */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={inputA} onChange={e => setInputA(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && compare()}
            placeholder="Stock A (e.g. RELIANCE)"
            style={{ flex: 1, minWidth: 140, height: 40, borderRadius: 9, border: '1px solid var(--bdr)', background: 'var(--surf2)', color: 'var(--txt)', fontSize: 14, fontWeight: 700, padding: '0 12px', fontFamily: 'inherit', outline: 'none', textTransform: 'uppercase' }} />
          <span style={{ fontSize: 16, color: 'var(--dim)', fontWeight: 900 }}>VS</span>
          <input value={inputB} onChange={e => setInputB(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && compare()}
            placeholder="Stock B (e.g. TCS)"
            style={{ flex: 1, minWidth: 140, height: 40, borderRadius: 9, border: '1px solid var(--bdr)', background: 'var(--surf2)', color: 'var(--txt)', fontSize: 14, fontWeight: 700, padding: '0 12px', fontFamily: 'inherit', outline: 'none', textTransform: 'uppercase' }} />
          <button onClick={compare} disabled={loading}
            style={{ height: 40, padding: '0 20px', borderRadius: 9, background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            {loading ? '⏳' : 'Compare'}
          </button>
        </div>
        {/* Popular pairs */}
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--dim2)', alignSelf: 'center' }}>Try:</span>
          {[['RELIANCE','TCS'],['HDFCBANK','ICICIBANK'],['INFY','WIPRO'],['TATAMOTORS','MARUTI'],['SBIN','KOTAKBANK']].map(([a, b]) => (
            <button key={`${a}-${b}`} onClick={() => { setInputA(a); setInputB(b); setSymA(a); setSymB(b); window.history.replaceState(null,'',`/stocks/compare?a=${a}&b=${b}`); }}
              style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--surf2)', border: '1px solid var(--bdr)', color: 'var(--dim)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {a} vs {b}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dim)', fontSize: 14 }}>⏳ Fetching data…</div>
      )}

      {!loading && dataA && dataB && (
        <>
          {/* Hero comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginBottom: 16, alignItems: 'start' }}>
            {/* Stock A */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px' }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>NSE: {symA}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4, marginBottom: 2 }}>{symA}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>{dataA.name !== symA ? dataA.name : ''}</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1 }}>{fmtP(dataA.price)}</div>
              {dataA.change_pct != null && (
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: dataA.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {dataA.change_pct >= 0 ? '▲' : '▼'} {Math.abs(dataA.change_pct).toFixed(2)}% today
                </div>
              )}
              <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 8, background: bullA > 2 ? 'rgba(0,212,160,0.09)' : 'rgba(255,59,92,0.09)', border: `1px solid ${bullA > 2 ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: bullA > 2 ? 'var(--grn)' : 'var(--red)' }}>{bullA > 2 ? 'BULLISH' : 'BEARISH'}</span>
                <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 6 }}>{bullA}/4 signals</span>
              </div>
            </div>

            {/* VS badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surf2)', border: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'var(--dim)' }}>VS</div>
            </div>

            {/* Stock B */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px' }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>NSE: {symB}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4, marginBottom: 2 }}>{symB}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>{dataB.name !== symB ? dataB.name : ''}</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1 }}>{fmtP(dataB.price)}</div>
              {dataB.change_pct != null && (
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: dataB.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {dataB.change_pct >= 0 ? '▲' : '▼'} {Math.abs(dataB.change_pct).toFixed(2)}% today
                </div>
              )}
              <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 8, background: bullB > 2 ? 'rgba(0,212,160,0.09)' : 'rgba(255,59,92,0.09)', border: `1px solid ${bullB > 2 ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: bullB > 2 ? 'var(--grn)' : 'var(--red)' }}>{bullB > 2 ? 'BULLISH' : 'BEARISH'}</span>
                <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 6 }}>{bullB}/4 signals</span>
              </div>
            </div>
          </div>

          {/* Head-to-head scorecard */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: -0.2 }}>Head-to-Head</div>
            {/* Column headers */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--bluL)' }}>{symA}</div>
              <div style={{ width: 80, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, fontWeight: 800, color: 'var(--pur)' }}>{symB}</div>
            </div>
            <ScoreBar a={dataA.rsi14} b={dataB.rsi14} label="RSI 14" higherBetter={false} />
            <ScoreBar a={dataA.change_pct} b={dataB.change_pct} label="Today %" higherBetter={true} />
            <ScoreBar a={dataA.from_52h} b={dataB.from_52h} label="vs 52W High" higherBetter={true} />
            <ScoreBar a={bullA} b={bullB} label="Bull signals" higherBetter={true} />
            <ScoreBar
              a={dataA.price && dataA.ema50 ? ((dataA.price - dataA.ema50) / dataA.ema50 * 100) : null}
              b={dataB.price && dataB.ema50 ? ((dataB.price - dataB.ema50) / dataB.ema50 * 100) : null}
              label="vs EMA50 %" higherBetter={true} />
          </div>

          {/* RSI comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bluL)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{symA} — RSI</div>
              {rsiBar(dataA.rsi14)}
            </div>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pur)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{symB} — RSI</div>
              {rsiBar(dataB.rsi14)}
            </div>
          </div>

          {/* EMA levels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[{ sym: symA, d: dataA, c: 'var(--bluL)' }, { sym: symB, d: dataB, c: 'var(--pur)' }].map(({ sym, d, c }) => (
              <div key={sym} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{sym} — Moving Averages</div>
                <EmaRow label="EMA 20"  price={d.price} ema={d.ema20} />
                <EmaRow label="EMA 50"  price={d.price} ema={d.ema50} />
                <EmaRow label="EMA 200" price={d.price} ema={d.ema200} />
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>52W High</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtP(d.high_52w)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>52W Low</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtP(d.low_52w)}</span>
                </div>
                {d.from_52h != null && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: d.from_52h > -5 ? 'var(--ylw)' : 'var(--dim)' }}>
                    {fmtPct(d.from_52h)} from 52W high
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Side-by-side charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[{ sym: symA, d: dataA, c: 'var(--bluL)' }, { sym: symB, d: dataB, c: 'var(--pur)' }].map(({ sym, d, c }) => (
              <div key={sym} style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{sym}</div>
                <StockChartWrapper symbol={sym} exchange="NSE" ema20={d.ema20} ema50={d.ema50} />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background: 'linear-gradient(135deg,rgba(23,64,245,0.10),rgba(139,92,246,0.06))', border: '1px solid rgba(23,64,245,0.25)', borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>Track {symA} & {symB} in your portfolio</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 14 }}>Set price alerts, monitor P&L, get ML signals — free on SIGNAL</div>
            <Link href="/sign-in" style={{ height: 40, padding: '0 24px', borderRadius: 9, background: 'var(--blu)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Get started free →
            </Link>
          </div>
        </>
      )}

      {/* Explore more */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Compare popular pairs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {POPULAR.filter(s => s !== symA && s !== symB).slice(0, 8).map(s => (
            <Link key={s} href={`/stocks/compare?a=${symA}&b=${s}`}
              onClick={() => { setInputB(s); setSymB(s); }}
              style={{ padding: '5px 11px', borderRadius: 8, background: 'var(--surf2)', border: '1px solid var(--bdr)', fontSize: 11, fontWeight: 700, color: 'var(--txt)', textDecoration: 'none' }}>
              {symA} vs {s}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--dim2)', textAlign: 'center', marginTop: 20 }}>
        Prices 15-min delayed · Yahoo Finance · Not SEBI registered · Not investment advice · DYOR
      </div>
    </>
  );
}

export default function ComparePage() {
  return (
    <>
      {/* Public nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--bdr)', background:'var(--bg)', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--blu)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff' }}>S</div>
          <span style={{ fontSize:15, fontWeight:900, color:'var(--txt)', letterSpacing:-0.3 }}>SIGNAL</span>
        </Link>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/sign-in" style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>Sign in</Link>
          <Link href="/sign-in" style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>Get started free</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 60px' }}>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16, display: 'flex', gap: 6 }}>
          <Link href="/" style={{ color: 'var(--dim)', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/stocks" style={{ color: 'var(--dim)', textDecoration: 'none' }}>Stocks</Link>
          <span>/</span>
          <span style={{ color: 'var(--txt)' }}>Compare</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: -0.5 }}>Stock Comparison</h1>
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>Side-by-side RSI, EMA, price and ML signals for any two NSE stocks</div>
        </div>

        <Suspense fallback={<div style={{ textAlign:'center', padding:'40px 0', color:'var(--dim)' }}>Loading…</div>}>
          <CompareContent />
        </Suspense>
      </main>
    </>
  );
}
