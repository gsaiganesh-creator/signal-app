'use client';
import { useState, useEffect } from 'react';

const INDIA_SECTORS = [
  { name:'IT',      ticker:'^CNXIT',     idx:'NIFTY IT',      stocks:'TCS · INFY · WIPRO · LTIM · HCLTECH',                key:'it' },
  { name:'BANKING', ticker:'^NSEBANK',   idx:'BANK NIFTY',    stocks:'HDFCBANK · ICICIBANK · KOTAKBANK · AXISBANK',         key:'bank' },
  { name:'AUTO',    ticker:'^CNXAUTO',   idx:'NIFTY AUTO',    stocks:'TATAMOTORS · M&M · MARUTI · BAJAJ-AUTO · EICHERMOT', key:'auto' },
  { name:'PHARMA',  ticker:'^CNXPHARMA', idx:'NIFTY PHARMA',  stocks:'SUNPHARMA · DRREDDY · CIPLA · DIVISLAB · LUPIN',     key:'pharma' },
  { name:'ENERGY',  ticker:'^CNXENERGY', idx:'NIFTY ENERGY',  stocks:'RELIANCE · ONGC · BPCL · IOC · GAIL',               key:'energy' },
  { name:'FMCG',    ticker:'^CNXFMCG',   idx:'NIFTY FMCG',   stocks:'HINDUNILVR · NESTLEIND · ITC · BRITANNIA · DABUR',   key:'fmcg' },
  { name:'METAL',   ticker:'^CNXMETAL',  idx:'NIFTY METAL',   stocks:'TATASTEEL · JSWSTEEL · HINDALCO · VEDL · NMDC',      key:'metal' },
  { name:'REALTY',  ticker:'^CNXREALTY', idx:'NIFTY REALTY',  stocks:'DLF · GODREJPROP · OBEROIRLTY · PRESTIGE · SOBHA',   key:'realty' },
  { name:'INFRA',   ticker:'^CNXINFRA',  idx:'NIFTY INFRA',   stocks:'LT · ADANIPORTS · POWERGRID · NTPC · BEL',           key:'infra' },
];

// US sectors — no direct GICS index tickers on Yahoo like NSE has, so these use
// the Select Sector SPDR ETFs (XLK/XLF/etc.) as the standard proxy — same convention
// already used for the MCX commodity-price proxy elsewhere in the app.
const US_SECTORS = [
  { name:'TECH',      ticker:'XLK',   idx:'SPDR Technology (XLK)',              stocks:'AAPL · MSFT · NVDA · AVGO · CRM',        key:'us-tech' },
  { name:'FINANCIAL', ticker:'XLF',   idx:'SPDR Financial (XLF)',               stocks:'BRK.B · JPM · V · MA · BAC',             key:'us-fin' },
  { name:'HEALTHCARE',ticker:'XLV',   idx:'SPDR Health Care (XLV)',             stocks:'LLY · UNH · JNJ · ABBV · MRK',           key:'us-health' },
  { name:'DISCRETIONARY', ticker:'XLY', idx:'SPDR Consumer Discretionary (XLY)',stocks:'AMZN · TSLA · HD · MCD · NKE',           key:'us-disc' },
  { name:'COMM SVCS', ticker:'XLC',   idx:'SPDR Communication Svcs (XLC)',      stocks:'GOOGL · META · NFLX · DIS · TMUS',       key:'us-comm' },
  { name:'INDUSTRIALS', ticker:'XLI', idx:'SPDR Industrials (XLI)',             stocks:'GE · CAT · RTX · UNP · HON',             key:'us-ind' },
  { name:'ENERGY',    ticker:'XLE',   idx:'SPDR Energy (XLE)',                  stocks:'XOM · CVX · COP · WMB · EOG',            key:'us-energy' },
  { name:'STAPLES',   ticker:'XLP',   idx:'SPDR Consumer Staples (XLP)',        stocks:'WMT · COST · PG · KO · PEP',             key:'us-staples' },
  { name:'UTILITIES', ticker:'XLU',   idx:'SPDR Utilities (XLU)',               stocks:'NEE · SO · DUK · CEG · AEP',             key:'us-util' },
  { name:'REAL ESTATE', ticker:'XLRE', idx:'SPDR Real Estate (XLRE)',           stocks:'PLD · AMT · EQIX · WELL · SPG',          key:'us-re' },
  { name:'MATERIALS', ticker:'XLB',   idx:'SPDR Materials (XLB)',               stocks:'LIN · SHW · FCX · ECL · NEM',            key:'us-mat' },
];

interface LiveData {
  price: number | null;
  change_pct: number | null;
  prev_close: number | null;
}

function sectorColor(chg: number | null) {
  if (chg == null) return { bg:'rgba(122,139,170,0.07)', bdr:'rgba(122,139,170,0.18)', txt:'var(--dim)', fill:'var(--dim2)' };
  if (chg >= 2)   return { bg:'rgba(0,212,160,0.15)',  bdr:'rgba(0,212,160,0.35)',  txt:'var(--grn)', fill:'var(--grn)' };
  if (chg > 0)    return { bg:'rgba(0,212,160,0.08)',  bdr:'rgba(0,212,160,0.22)',  txt:'var(--grn)', fill:'var(--grn)' };
  if (chg > -2)   return { bg:'rgba(255,59,92,0.08)',  bdr:'rgba(255,59,92,0.22)',  txt:'var(--red)', fill:'var(--red)' };
  return                 { bg:'rgba(255,59,92,0.15)',  bdr:'rgba(255,59,92,0.35)',  txt:'var(--red)', fill:'var(--red)' };
}

function signalLabel(chg: number | null) {
  if (chg == null) return '—';
  if (chg >= 1.5) return '🟢 Strong';
  if (chg >= 0.5) return '🟢 Bullish';
  if (chg >= 0)   return '🟡 Neutral+';
  if (chg >= -0.5) return '🟡 Neutral−';
  if (chg >= -1.5) return '🔴 Bearish';
  return '🔴 Weak';
}

function fillPct(chg: number | null) {
  if (chg == null) return 5;
  return Math.min(100, Math.max(5, Math.abs(chg) * 20));
}

const PERIODS = ['1D', '5D', '1M', '3M', '1Y'];
const PERIOD_RANGE: Record<string, string> = { '1D':'1d', '5D':'5d', '1M':'1mo', '3M':'3mo', '1Y':'1y' };

export default function SectorHeatmapPage() {
  const [market, setMarket] = useState<'india' | 'us'>('india');
  const [period, setPeriod] = useState('1D');
  const [live, setLive]     = useState<Record<string, LiveData>>({});
  const [loading, setLoading] = useState(true);

  const SECTORS = market === 'india' ? INDIA_SECTORS : US_SECTORS;

  useEffect(() => {
    setLoading(true);
    const tickers = SECTORS.map(s => s.ticker).join(',');
    fetch(`/api/sector-data?tickers=${encodeURIComponent(tickers)}&range=${PERIOD_RANGE[period] ?? '1d'}`)
      .then(r => r.json())
      .then(d => { setLive(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [market, period]);

  // Sort: biggest movers first (abs change)
  const sorted = [...SECTORS].sort((a, b) => {
    const ca = live[a.ticker]?.change_pct ?? 0;
    const cb = live[b.ticker]?.change_pct ?? 0;
    return Math.abs(cb) - Math.abs(ca);
  });

  const leaders = sorted.filter(s => (live[s.ticker]?.change_pct ?? 0) > 0).slice(0, 3);
  const laggards = sorted.filter(s => (live[s.ticker]?.change_pct ?? 0) < 0).slice(0, 3);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Sector Heatmap</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
            {market === 'india' ? 'NSE sectoral indices' : 'US sector ETFs (SPDR Select Sector)'} · live prices from Yahoo Finance
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!loading && <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span>}
          {loading && <span style={{ fontSize:11, color:'var(--dim)' }}>loading…</span>}
        </div>
      </div>

      {/* India / US toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {(['india','us'] as const).map(m => (
          <button key={m} onClick={() => setMarket(m)}
            style={{ height:34, padding:'0 18px', borderRadius:8, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
              background: market===m ? 'rgba(255,184,0,0.15)' : 'transparent',
              border: market===m ? '1px solid var(--ylw)' : '1px solid var(--bdr)',
              color: market===m ? 'var(--ylw)' : 'var(--dim)' }}>
            {m === 'india' ? '🇮🇳 India' : '🇺🇸 US'}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ height:32, padding:'0 16px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              background: period===p ? 'rgba(23,64,245,0.15)' : 'transparent',
              border: period===p ? '1px solid var(--bluL)' : '1px solid var(--bdr)',
              color: period===p ? 'var(--bluL)' : 'var(--dim)' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {sorted.map(s => {
          const d   = live[s.ticker];
          const chg = d?.change_pct ?? null;
          const c   = sectorColor(chg);
          return (
            <div key={s.key} className="hover-lift" style={{ background:c.bg, border:`1px solid ${c.bdr}`, borderRadius:16, padding:20, cursor:'pointer' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:0.8, color:c.txt }}>{s.name}</span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:c.bg, border:`1px solid ${c.bdr}`, color:c.txt }}>
                  {signalLabel(chg)}
                </span>
              </div>
              {/* Price & change */}
              {loading ? (
                <div style={{ width:80, height:32, borderRadius:6, background:'var(--surf2)', marginBottom:6 }}/>
              ) : (
                <>
                  <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1, color:c.txt, lineHeight:1 }}>
                    {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>
                    {s.idx}{d?.price != null ? ` · ${market === 'us' ? '$' : ''}${d.price.toLocaleString(market === 'us' ? 'en-US' : 'en-IN', { maximumFractionDigits: market === 'us' ? 2 : 0 })}` : ''}
                  </div>
                </>
              )}
              {/* Stocks */}
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:8, lineHeight:1.6 }}>{s.stocks}</div>
              {/* Fill bar */}
              <div style={{ height:3, borderRadius:2, overflow:'hidden', background:'rgba(255,255,255,0.08)', marginTop:10 }}>
                <div style={{ height:'100%', borderRadius:2, width:`${fillPct(chg)}%`, background:c.fill, transition:'width 0.4s ease' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaders / Laggards */}
      {!loading && (leaders.length > 0 || laggards.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),var(--card-bg))', border:'1px solid rgba(0,212,160,0.22)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:10 }}>🟢 Top Gainers · {period}</div>
            {leaders.map(s => {
              const chg = live[s.ticker]?.change_pct ?? 0;
              return (
                <div key={s.key} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(0,212,160,0.12)' }}>
                  <span style={{ fontWeight:700 }}>{s.name}</span>
                  <span style={{ color:'var(--grn)', fontWeight:800 }}>+{chg.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
          <div style={{ background:'linear-gradient(135deg,rgba(255,59,92,0.08),var(--card-bg))', border:'1px solid rgba(255,59,92,0.22)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:10 }}>🔴 Top Losers · {period}</div>
            {laggards.map(s => {
              const chg = live[s.ticker]?.change_pct ?? 0;
              return (
                <div key={s.key} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(255,59,92,0.12)' }}>
                  <span style={{ fontWeight:700 }}>{s.name}</span>
                  <span style={{ color:'var(--red)', fontWeight:800 }}>{chg.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:8 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>{market === 'us' ? 'NOT SEC REGISTERED' : 'NOT SEBI REGISTERED'}</strong> · Sector data informational only · Prices from Yahoo Finance · Not investment advice · DYOR
      </div>
    </>
  );
}
