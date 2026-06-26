'use client';
import { useState } from 'react';

const SECTORS = [
  { name:'IT',       pct:'+4.1%', idx:'NIFTY IT · 38,120',    stocks:'TCS, INFY, WIPRO, LTIM, HCLTECH — 5 BUY signals',  fill:82, signal:'BUY',  count:5 },
  { name:'AUTO',     pct:'+2.8%', idx:'NIFTY Auto · 21,480',   stocks:'TATAMOTORS, M&M, MARUTI — 3 BUY signals',          fill:56, signal:'BUY',  count:3 },
  { name:'PHARMA',   pct:'+1.4%', idx:'NIFTY Pharma · 19,240', stocks:'SUNPHARMA, DRREDDY — 2 BUY signals',              fill:28, signal:'BUY',  count:2 },
  { name:'ENERGY',   pct:'+0.9%', idx:'NIFTY Energy · 34,120', stocks:'RELIANCE, ONGC, BPCL — 1 BUY signal',             fill:18, signal:'BUY',  count:1 },
  { name:'FMCG',     pct:'+0.3%', idx:'NIFTY FMCG · 52,840',   stocks:'HINDUNILVR, NESTLEIND — 0 signals (HOLD)',        fill:6,  signal:'HOLD', count:0 },
  { name:'BANKING',  pct:'-0.8%', idx:'BANK NIFTY · 53,240',   stocks:'HDFCBANK, ICICIBANK — 1 SELL signal',            fill:16, signal:'SELL', count:1 },
  { name:'METAL',    pct:'-2.1%', idx:'NIFTY Metal · 8,240',   stocks:'TATASTEEL, JSWSTEEL — 2 SELL signals',           fill:42, signal:'SELL', count:2 },
  { name:'REALTY',   pct:'-1.4%', idx:'NIFTY Realty · 1,020',  stocks:'DLF, GODREJPROP — 1 SELL signal',                fill:28, signal:'SELL', count:1 },
  { name:'CONSUMER', pct:'-0.5%', idx:'NIFTY India Consumption', stocks:'TITAN, JUBLFOOD — Watch list',                  fill:10, signal:'HOLD', count:0 },
];

function sectorColor(signal: string) {
  if (signal === 'BUY')  return { bg:'rgba(0,212,160,0.12)', bdr:'rgba(0,212,160,0.25)', txt:'var(--grn)', fill:'var(--grn)' };
  if (signal === 'SELL') return { bg:'rgba(255,59,92,0.1)',  bdr:'rgba(255,59,92,0.22)', txt:'var(--red)', fill:'var(--red)' };
  return                        { bg:'rgba(255,184,0,0.07)', bdr:'rgba(255,184,0,0.18)', txt:'var(--ylw)', fill:'var(--ylw)' };
}

const PERIODS = ['1D','5D','1M','3M','1Y'];

export default function SectorHeatmapPage() {
  const [period, setPeriod] = useState('5D');

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Sector Heatmap</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>NIFTY sectoral indices · performance &amp; signal density</div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ height:30, padding:'0 14px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              background: period===p ? 'var(--surf2)' : 'transparent',
              border: period===p ? '1px solid var(--dim)' : '1px solid var(--bdr)',
              color: period===p ? 'var(--txt)' : 'var(--dim)' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {SECTORS.map(s => {
          const c = sectorColor(s.signal);
          return (
            <div key={s.name} style={{ background:c.bg, border:`1px solid ${c.bdr}`, borderRadius:16, padding:22, cursor:'pointer', transition:'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
              <div style={{ fontSize:12, fontWeight:700, opacity:0.75, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5, color:c.txt }}>{s.name}</div>
              <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, marginBottom:4, color:c.txt }}>{s.pct}</div>
              <div style={{ fontSize:12, opacity:0.6, marginBottom:10 }}>{s.idx}</div>
              <div style={{ fontSize:11, opacity:0.65, lineHeight:1.6 }}>{s.stocks}</div>
              <div style={{ height:4, borderRadius:2, overflow:'hidden', background:'rgba(255,255,255,0.1)', marginTop:10 }}>
                <div style={{ height:'100%', borderRadius:2, width:`${s.fill}%`, background:c.fill }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signal density bar chart */}
      <div style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Signal Density by Sector · Today</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SECTORS.filter(s => s.count > 0).map(s => {
            const c = sectorColor(s.signal);
            const w = Math.round((s.count / 5) * 100);
            return (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:12, fontWeight:600, width:80 }}>{s.name}</span>
                <div style={{ flex:1, height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${w}%`, background:c.fill, borderRadius:4 }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:c.txt, width:70, textAlign:'right' }}>{s.count} {s.signal}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:16, padding:12, background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:10 }}>
          <div style={{ fontSize:12, color:'var(--bluL)', lineHeight:1.6 }}>
            📊 <strong>SIGNAL ML insight:</strong> IT sector showing strongest momentum — EMA crossovers + high delivery % + FII buying. Rotate into IT-heavy signals this week. Avoid Metal and Banking until macro headwinds ease.
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Sector data for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
