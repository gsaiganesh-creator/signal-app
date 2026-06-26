'use client';
import { useState, useEffect } from 'react';

// ─── Curated ETF list (Yahoo Finance .NS tickers) ────────────────────────────
const ETFS = [
  { sym:'NIFTYBEES.NS',  name:'NIFTYBEES',       full:'Nippon India ETF Nifty 50 BeES', cat:'Index',     exp:'0.04%', aum:'₹23,000 Cr', why:'Cheapest Nifty 50 ETF — tracks index with minimal tracking error.' },
  { sym:'JUNIORBEES.NS', name:'JUNIORBEES',       full:'Nippon India ETF Junior BeES',   cat:'Index',     exp:'0.19%', aum:'₹4,200 Cr',  why:'Next 50 companies after Nifty — higher growth potential.' },
  { sym:'MID150BEES.NS', name:'MID150BEES',       full:'Nippon India Nifty Midcap 150',  cat:'Midcap',    exp:'0.30%', aum:'₹2,800 Cr',  why:'Broad midcap exposure — diversified across 150 stocks.' },
  { sym:'BANKBEES.NS',   name:'BANKBEES',         full:'Nippon India ETF Bank BeES',     cat:'Sectoral',  exp:'0.22%', aum:'₹8,000 Cr',  why:'Nifty Bank index — best for bullish banking sector view.' },
  { sym:'ITBEES.NS',     name:'ITBEES',           full:'Nippon India ETF Nifty IT',      cat:'Sectoral',  exp:'0.15%', aum:'₹1,400 Cr',  why:'Nifty IT index — concentrated bet on Indian IT exports.' },
  { sym:'GOLDBEES.NS',   name:'GOLDBEES',         full:'Nippon India ETF Gold BeES',     cat:'Gold',      exp:'0.79%', aum:'₹11,000 Cr', why:'Purest gold exposure without storage risk. Tracks MCX gold.' },
  { sym:'LIQUIDBEES.NS', name:'LIQUIDBEES',       full:'Nippon India ETF Liquid BeES',   cat:'Debt',      exp:'0.69%', aum:'₹7,500 Cr',  why:'Liquid fund in ETF form. Better than savings account for idle cash.' },
  { sym:'SETFNIF50.NS',  name:'SETF Nifty 50',   full:'SBI ETF Nifty 50',               cat:'Index',     exp:'0.07%', aum:'₹1,92,000 Cr',why:'EPFO-backed, largest AUM Nifty 50 ETF. Very liquid.' },
];

// ─── Curated MF list (static — AMFI data) ───────────────────────────────────
const MFS = [
  { name:'Parag Parikh Flexi Cap',        amc:'PPFAS',          cat:'Flexi Cap',  type:'Active',  rating:'★★★★★', min:'₹500',  exp:'0.63%', cagr5:'22.1%', why:'Most unique portfolio: Indian + global stocks (Google, Meta). Lowest churn, tax-efficient.' },
  { name:'Mirae Asset Large Cap',          amc:'Mirae Asset',    cat:'Large Cap',  type:'Active',  rating:'★★★★★', min:'₹1,000', exp:'0.57%', cagr5:'14.8%', why:'Consistent large cap performer. Follows growth-at-reasonable-price philosophy.' },
  { name:'SBI Small Cap Fund',             amc:'SBI MF',         cat:'Small Cap',  type:'Active',  rating:'★★★★★', min:'₹500',  exp:'0.72%', cagr5:'29.3%', why:'Category king in small cap. Long track record, disciplined AMC.' },
  { name:'Nippon India Mid Cap 150',       amc:'Nippon India',   cat:'Mid Cap',    type:'Index',   rating:'★★★★',  min:'₹100',  exp:'0.30%', cagr5:'25.4%', why:'Passive mid cap index — low cost, no fund manager risk.' },
  { name:'UTI Nifty 50 Index Fund',        amc:'UTI MF',         cat:'Index',      type:'Index',   rating:'★★★★★', min:'₹500',  exp:'0.18%', cagr5:'15.2%', why:'Best index fund for Nifty 50. Lowest tracking error in category.' },
  { name:'Quant Small Cap Fund',           amc:'Quant MF',       cat:'Small Cap',  type:'Active',  rating:'★★★★',  min:'₹1,000', exp:'0.62%', cagr5:'36.7%', why:'Quant-driven model — highest returns in small cap over 5Y (higher risk).' },
  { name:'Mirae Asset Tax Saver (ELSS)',   amc:'Mirae Asset',    cat:'ELSS',       type:'Active',  rating:'★★★★★', min:'₹500',  exp:'0.54%', cagr5:'17.6%', why:'Best ELSS for 80C. 3-year lock-in but lowest expense in category.' },
  { name:'HDFC Top 100 Fund',              amc:'HDFC MF',        cat:'Large Cap',  type:'Active',  rating:'★★★★',  min:'₹100',  exp:'1.14%', cagr5:'13.2%', why:'Institutional quality large cap fund. Undervalued-stock focus.' },
  { name:'Axis Small Cap Fund',            amc:'Axis MF',        cat:'Small Cap',  type:'Active',  rating:'★★★★',  min:'₹500',  exp:'0.55%', cagr5:'24.8%', why:'Quality-first small cap — avoids low-quality businesses.' },
  { name:'Kotak Emerging Equity',          amc:'Kotak MF',       cat:'Mid Cap',    type:'Active',  rating:'★★★★',  min:'₹100',  exp:'0.43%', cagr5:'21.9%', why:'Consistent mid cap performer. Focuses on sector leaders with growth runway.' },
];

const CAT_COLORS: Record<string, string> = {
  'Index':'rgba(23,64,245,0.12)',   'Midcap':'rgba(139,92,246,0.12)',
  'Sectoral':'rgba(255,92,26,0.12)','Gold':'rgba(255,184,0,0.15)',
  'Debt':'rgba(0,212,160,0.1)',     'Flexi Cap':'rgba(0,212,160,0.1)',
  'Large Cap':'rgba(23,64,245,0.1)','Small Cap':'rgba(255,59,92,0.1)',
  'Mid Cap':'rgba(139,92,246,0.1)', 'ELSS':'rgba(255,184,0,0.12)',
};

// ─── My Holdings (localStorage) ──────────────────────────────────────────────
interface Holding {
  id: string; kind: 'etf' | 'mf';
  label: string; units: number; buyPrice: number;
  currentPrice?: number; fetchedAt?: number;
}

function rec(ret: number): { label: string; color: string; bg: string } {
  if (ret >= 15)  return { label:'KEEP 💪 Strong returns',           color:'var(--grn)', bg:'rgba(0,212,160,0.1)' };
  if (ret >= 8)   return { label:'HOLD ✅ Beating inflation',         color:'var(--grn)', bg:'rgba(0,212,160,0.07)' };
  if (ret >= 0)   return { label:'REVIEW 🔍 Underperforming Nifty',   color:'var(--ylw)', bg:'rgba(255,184,0,0.1)' };
  if (ret >= -15) return { label:'REVIEW ⚠️ Negative — monitor',      color:'var(--org)', bg:'rgba(255,92,26,0.1)' };
  return                  { label:'EXIT ⛔ Significant loss — reconsider', color:'var(--red)', bg:'rgba(255,59,92,0.1)' };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ETFMFPage() {
  const [tab, setTab] = useState<'etf'|'mf'|'compare'|'holdings'>('etf');

  // Best ETFs — live prices
  const [etfPrices, setEtfPrices] = useState<Record<string, { price: number; chg: number }>>({});
  const [etfLoading, setEtfLoading] = useState(true);

  // My Holdings
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addKind, setAddKind] = useState<'etf'|'mf'>('etf');
  const [addLabel, setAddLabel] = useState('');
  const [addUnits, setAddUnits] = useState('');
  const [addBuy, setAddBuy] = useState('');
  const [addCurrent, setAddCurrent] = useState('');

  // Load holdings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('signal_etfmf_holdings');
      if (raw) setHoldings(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function saveHoldings(h: Holding[]) {
    setHoldings(h);
    localStorage.setItem('signal_etfmf_holdings', JSON.stringify(h));
  }

  // Fetch live ETF prices from /api/prices
  useEffect(() => {
    if (tab !== 'etf') return;
    setEtfLoading(true);
    Promise.allSettled(
      ETFS.map(async e => {
        const r = await fetch(`/api/prices?symbol=${encodeURIComponent(e.sym)}`);
        const d = await r.json();
        return { sym: e.sym, price: d.price, chg: d.change_pct };
      })
    ).then(results => {
      const map: Record<string, { price: number; chg: number }> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map[ETFS[i].sym] = r.value;
      });
      setEtfPrices(map);
      setEtfLoading(false);
    });
  }, [tab]);

  function addHolding() {
    if (!addLabel.trim() || !addUnits || !addBuy) return;
    const h: Holding = {
      id: Date.now().toString(), kind: addKind,
      label: addLabel.trim(), units: +addUnits, buyPrice: +addBuy,
      currentPrice: addCurrent ? +addCurrent : undefined,
    };
    saveHoldings([...holdings, h]);
    setAddLabel(''); setAddUnits(''); setAddBuy(''); setAddCurrent('');
    setShowAdd(false);
  }

  function removeHolding(id: string) { saveHoldings(holdings.filter(h => h.id !== id)); }

  const inp: React.CSSProperties = {
    width:'100%', height:42, borderRadius:9, background:'var(--surf2)',
    border:'1px solid rgba(79,111,250,0.22)', color:'var(--txt)', fontSize:13,
    padding:'0 12px', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.07),rgba(139,92,246,0.05))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:20, padding:'clamp(18px,4vw,32px) clamp(16px,4vw,36px)', marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>ETF &amp; Mutual Funds</div>
        <div style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:900, letterSpacing:-0.5, marginBottom:8 }}>
          Passive or Active?<br/><span style={{ color:'var(--bluL)' }}>We help you pick the right one.</span>
        </div>
        <p style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:520 }}>
          Curated best ETFs and mutual funds for India investors. Add your existing holdings to get keep/review/exit insights based on actual returns.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {(['etf','mf','compare','holdings'] as const).map(t => {
          const labels: Record<string, string> = { etf:'📈 Best ETFs', mf:'🏦 Best MFs', compare:'ETF vs MF', holdings:`💼 My Holdings (${holdings.length})` };
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{ height:38, padding:'0 18px', borderRadius:10, border:`1px solid ${tab===t ? 'var(--blu)' : 'var(--bdr)'}`, background: tab===t ? 'rgba(23,64,245,0.12)' : 'var(--surf)', color: tab===t ? 'var(--bluL)' : 'var(--dim)', fontSize:13, fontWeight: tab===t ? 700 : 500, cursor:'pointer', fontFamily:'inherit' }}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: BEST ETFs ══ */}
      {tab === 'etf' && (
        <>
          <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Live prices from NSE · Expense ratios and AUM indicative · Buy at or below NAV (0% premium)</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {ETFS.map(e => {
              const live = etfPrices[e.sym];
              const chgPos = (live?.chg ?? 0) >= 0;
              return (
                <div key={e.sym} style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background: CAT_COLORS[e.cat] ?? 'rgba(23,64,245,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>
                      {e.name.slice(0,3).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800 }}>{e.name}</div>
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{e.full}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background: CAT_COLORS[e.cat] ?? 'rgba(23,64,245,0.1)', color:'var(--txt)', flexShrink:0 }}>{e.cat}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      {etfLoading ? (
                        <div style={{ width:80, height:22, borderRadius:6, background:'var(--surf2)', animation:'pulse 1.5s infinite' }}/>
                      ) : (
                        <div style={{ fontSize:20, fontWeight:900 }}>₹{live?.price != null ? live.price.toLocaleString('en-IN', { maximumFractionDigits:2 }) : '—'}</div>
                      )}
                      {!etfLoading && live && (
                        <div style={{ fontSize:12, fontWeight:700, color: chgPos ? 'var(--grn)' : 'var(--red)', marginTop:2 }}>
                          {chgPos ? '🟢' : '🔴'} {chgPos ? '+' : ''}{live.chg?.toFixed(2)}% today
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:'right', fontSize:12, color:'var(--dim)' }}>
                      <div>Exp: <strong style={{ color:'var(--txt)' }}>{e.exp}</strong></div>
                      <div style={{ marginTop:3 }}>AUM: <strong style={{ color:'var(--txt)' }}>{e.aum}</strong></div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55, borderTop:'1px solid var(--bdr)', paddingTop:10 }}>{e.why}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>⚠️ ETF prices live from NSE via Yahoo Finance · Expense ratios and AUM are approximate · NOT SEBI advice · DYOR</div>
        </>
      )}

      {/* ══ TAB: BEST MFs ══ */}
      {tab === 'mf' && (
        <>
          <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Direct Growth plans only · 5Y CAGR figures indicative, source: AMFI/Value Research · Sorted by category</div>
          {(['Index','Large Cap','Mid Cap','Small Cap','Flexi Cap','ELSS'] as const).map(cat => {
            const funds = MFS.filter(m => m.cat === cat);
            if (!funds.length) return null;
            return (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--dim)', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>{cat}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {funds.map(m => (
                    <div key={m.name} style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:13, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background: CAT_COLORS[m.cat] ?? 'rgba(23,64,245,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>
                        {m.amc.slice(0,3).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:800 }}>{m.name}</span>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid rgba(79,111,250,0.22)' }}>{m.type}</span>
                          <span style={{ fontSize:12, color:'var(--ylw)' }}>{m.rating}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6 }}>{m.amc} · Min SIP {m.min} · Exp {m.exp}</div>
                        <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55 }}>{m.why}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:900, color:'var(--grn)' }}>{m.cagr5}</div>
                        <div style={{ fontSize:10, color:'var(--dim)' }}>5Y CAGR</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:8 }}>⚠️ 5Y CAGR is past performance — not a guarantee of future returns · NOT SEBI advice · DYOR</div>
        </>
      )}

      {/* ══ TAB: ETF vs MF ══ */}
      {tab === 'compare' && (
        <>
          {/* Decision guide */}
          <div style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:16, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Choose your path</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { title:'ETF is for you if…', color:'var(--bluL)', bg:'rgba(23,64,245,0.06)', bdr:'rgba(23,64,245,0.2)', points:[
                  'You have a Demat account (Zerodha/Groww/Upstox)',
                  'You want the absolute lowest cost (0.04%–0.30%)',
                  'You want to buy/sell during market hours like a stock',
                  'You don\'t trust active fund managers to beat index',
                  'You\'re investing for 10+ years (index compounding)',
                ]},
                { title:'MF is for you if…', color:'var(--pur)', bg:'rgba(139,92,246,0.06)', bdr:'rgba(139,92,246,0.2)', points:[
                  'You want SIP auto-debit without logging in every month',
                  'You don\'t have a Demat account (MF doesn\'t need one)',
                  'You want active management (mid/small cap especially)',
                  'You want tax-saving (ELSS = 80C deduction up to ₹1.5L)',
                  'You want fractional units (invest ₹500 in any fund)',
                ]},
              ].map(side => (
                <div key={side.title} style={{ background:side.bg, border:`1px solid ${side.bdr}`, borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:side.color, marginBottom:12 }}>{side.title}</div>
                  {side.points.map((p, i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>
                      <span style={{ color:side.color, flexShrink:0 }}>✓</span> {p}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--bdr)', fontSize:14, fontWeight:700 }}>Side-by-side comparison</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  {['Feature','ETF','Mutual Fund'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, fontSize:11, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--bdr)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Demat needed', '✅ Yes (mandatory)', '❌ No'],
                  ['Min investment', '1 unit (₹200–₹5,000)', '₹100 (most funds)'],
                  ['Expense ratio', '0.04%–0.79%', '0.18%–1.5% (active)'],
                  ['Trading hours', 'NSE 9:15–3:30 PM', 'End-of-day NAV'],
                  ['SIP auto-debit', '❌ Manual (broker)', '✅ Auto (AMC/BSE)'],
                  ['Tax (STCG < 1Y)', '20% (post Budget 2024)', '20% (equity)'],
                  ['Tax (LTCG > 1Y)', '12.5% above ₹1.25L gain', '12.5% above ₹1.25L gain'],
                  ['80C deduction', '❌ Not applicable', '✅ ELSS only (3Y lock)'],
                  ['Active management', '❌ Index only', '✅ Active options'],
                  ['Liquidity', '⚡ Instant (market hours)', '📅 T+2/T+3 settlement'],
                  ['Best for', 'Passive index investors', 'SIP + active allocation'],
                ].map(([f, e, m], i) => (
                  <tr key={f} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:'var(--dim)', fontWeight:600 }}>{f}</td>
                    <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:'var(--bluL)' }}>{e}</td>
                    <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:'var(--pur)' }}>{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verdict */}
          <div style={{ background:'rgba(0,212,160,0.06)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:800, marginBottom:8 }}>💡 Our recommendation for most investors</div>
            <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>
              Start with a <strong style={{ color:'var(--grn)' }}>UTI Nifty 50 Index Fund SIP</strong> (₹2,000–₹5,000/mo) if you don&apos;t have Demat.
              If you do, add <strong style={{ color:'var(--bluL)' }}>NIFTYBEES ETF</strong> for even lower cost.
              Layer on <strong style={{ color:'var(--pur)' }}>SBI Small Cap or Parag Parikh Flexi Cap</strong> once your core index position is established.
              Avoid sectoral ETFs until you have 3–5 years of market experience.
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: MY HOLDINGS ══ */}
      {tab === 'holdings' && (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div style={{ fontSize:13, color:'var(--dim)' }}>Track your ETF and MF investments. Get keep / review / exit recommendations.</div>
            <button onClick={() => setShowAdd(!showAdd)} style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAdd ? '✕ Cancel' : '+ Add Holding'}
            </button>
          </div>

          {showAdd && (
            <div style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Add ETF / MF Holding</div>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {(['etf','mf'] as const).map(k => (
                  <button key={k} onClick={() => setAddKind(k)}
                    style={{ height:36, padding:'0 16px', borderRadius:8, border:`1px solid ${addKind===k ? 'var(--blu)' : 'var(--bdr)'}`, background: addKind===k ? 'rgba(23,64,245,0.1)' : 'transparent', color: addKind===k ? 'var(--bluL)' : 'var(--dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {k === 'etf' ? '📈 ETF (NSE)' : '🏦 Mutual Fund'}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>{addKind==='etf' ? 'NSE Symbol (e.g. NIFTYBEES)' : 'Fund name'}</label>
                  <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder={addKind==='etf' ? 'NIFTYBEES' : 'SBI Small Cap Fund'} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>Units held</label>
                  <input type="number" value={addUnits} onChange={e => setAddUnits(e.target.value)} placeholder="100" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>{addKind==='etf' ? 'Avg buy price (₹)' : 'Avg buy NAV (₹)'}</label>
                  <input type="number" value={addBuy} onChange={e => setAddBuy(e.target.value)} placeholder="220.50" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>Current price/NAV (₹)</label>
                  <input type="number" value={addCurrent} onChange={e => setAddCurrent(e.target.value)} placeholder="265.00 (optional)" style={inp}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:10, marginBottom:12 }}>
                {addKind === 'etf'
                  ? 'ETF: leave current price blank — we\'ll fetch live price from NSE.'
                  : 'MF: enter current NAV from AMFI or your broker app.'}
              </div>
              <button onClick={addHolding} style={{ height:40, padding:'0 24px', borderRadius:10, background:'var(--grn)', border:'none', color:'#000', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                Add Holding
              </button>
            </div>
          )}

          {holdings.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No holdings yet</div>
              <div style={{ fontSize:13, color:'var(--dim)' }}>Add your ETF and MF holdings to get keep / review / exit recommendations.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {holdings.map(h => {
                const invested = h.units * h.buyPrice;
                const current = h.currentPrice ? h.units * h.currentPrice : null;
                const gain = current != null ? current - invested : null;
                const ret  = gain != null ? (gain / invested) * 100 : null;
                const r = ret != null ? rec(ret) : null;
                return (
                  <div key={h.id} style={{ background:'linear-gradient(145deg,rgba(17,36,80,0.72),rgba(8,14,42,0.82))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background: h.kind === 'etf' ? 'rgba(23,64,245,0.1)' : 'rgba(139,92,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>
                        {h.kind === 'etf' ? 'ETF' : 'MF'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:800, marginBottom:2 }}>{h.label}</div>
                        <div style={{ fontSize:12, color:'var(--dim)' }}>
                          {h.units} units · Avg {h.kind==='etf'?'price':'NAV'} ₹{h.buyPrice.toLocaleString('en-IN')}
                          {h.currentPrice && ` · Current ₹${h.currentPrice.toLocaleString('en-IN')}`}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8, marginTop:12 }}>
                          {[
                            { lbl:'Invested', val:`₹${invested.toLocaleString('en-IN', { maximumFractionDigits:0 })}`, c:'var(--txt)' },
                            ...(current != null ? [
                              { lbl:'Current value', val:`₹${current.toLocaleString('en-IN', { maximumFractionDigits:0 })}`, c:'var(--txt)' },
                              { lbl:'Gain / Loss', val:`${gain! >= 0 ? '+' : ''}₹${Math.round(gain!).toLocaleString('en-IN')}`, c: gain! >= 0 ? 'var(--grn)' : 'var(--red)' },
                              { lbl:'Return %', val:`${ret! >= 0 ? '+' : ''}${ret!.toFixed(1)}%`, c: ret! >= 0 ? 'var(--grn)' : 'var(--red)' },
                            ] : []),
                          ].map(s => (
                            <div key={s.lbl} style={{ background:'var(--surf2)', borderRadius:9, padding:'8px 12px' }}>
                              <div style={{ fontSize:10, color:'var(--dim)', marginBottom:3 }}>{s.lbl}</div>
                              <div style={{ fontSize:14, fontWeight:800, color:s.c }}>{s.val}</div>
                            </div>
                          ))}
                        </div>
                        {r && (
                          <div style={{ marginTop:10, padding:'8px 14px', borderRadius:9, background:r.bg, border:`1px solid ${r.color}40` }}>
                            <span style={{ fontSize:12, fontWeight:700, color:r.color }}>{r.label}</span>
                          </div>
                        )}
                        {!h.currentPrice && (
                          <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>
                            ⚠️ No current price entered. Edit to add current {h.kind==='etf'?'market price':'NAV'} for return calculation.
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeHolding(h.id)}
                        style={{ width:28, height:28, borderRadius:7, background:'transparent', border:'1px solid rgba(79,111,250,0.22)', color:'var(--dim)', cursor:'pointer', fontSize:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
            ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Keep/Review/Exit is based on absolute return only, not risk-adjusted · Holdings stored locally in your browser · DYOR
          </div>
        </>
      )}
    </>
  );
}
