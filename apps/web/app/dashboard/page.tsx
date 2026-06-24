'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import { useState, useEffect } from 'react';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { TreemapHeatmap } from '@/components/TreemapHeatmap';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Confirmed NSE ticker renames / common alias → canonical NSE symbol
const SYM_ALIAS: Record<string, string> = {
  // REC Ltd
  RECLIMITED:'RECLTD', RECLMITED:'RECLTD', RECLIMTED:'RECLTD', RECLTD:'RECLTD',
  // Bajaj Finance
  BAJAJFINANCE:'BAJFINANCE', BAJAJFIN:'BAJFINANCE',
  // Samvardhana Motherson
  MOTHERSUMI:'MOTHERSON',
  // Bharti Airtel (tower demerger)
  INFRATEL:'BHARTIARTL',
  // Wipro
  WIPROIT:'WIPRO',
  // HDFC twins post-merger
  HDFC:'HDFCBANK',
  // Adani aliases
  ADANITRANS:'ADANITRANS',
  // Tata group
  TATAMOTORS_DVR:'TATAMTRDVR',
  // MF/ETF common aliases
  NIFTYBEES:'NIFTYBEES', JUNIORBEES:'JUNIORBEES',
};

// Suffixes that appear in user-entered symbols but aren't part of NSE codes
const STRIP_SUFFIXES = [
  'LIMITED', 'LIMITE', 'LIMTED', 'LMITED', 'LIMIED',
  'LTD', 'LT', 'CORP', 'CORPORATION', 'INC',
  'INDUSTRIES', 'INDUSTRY', 'INDUSTRI',
  'ENTERPRISES', 'ENTERPRISE',
  'EQ', '-EQ', '-SM', '-BE', '-BL',
  'NS', '.NS', '.BO',
];

function normSym(raw: string): string {
  // 1. uppercase, remove spaces, dots outside suffix context, hyphens
  let s = raw.toUpperCase().trim().replace(/\s+/g, '').replace(/\.NS$|\.BO$/i, '');
  // 2. explicit alias check first (catches known renames / gross typos)
  if (SYM_ALIAS[s]) return SYM_ALIAS[s];
  // 3. strip trailing corporate suffixes iteratively
  let changed = true;
  while (changed) {
    changed = false;
    for (const sfx of STRIP_SUFFIXES) {
      if (s.endsWith(sfx) && s.length > sfx.length + 2) {
        s = s.slice(0, s.length - sfx.length).replace(/[-_\s]+$/, '');
        changed = true;
        break; // re-run loop with shorter string
      }
    }
  }
  // 4. alias check again after stripping (e.g. "RECLIMITED" → "REC" won't happen — min length guard)
  return SYM_ALIAS[s] ?? s;
}

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

const LARGE_CAP = new Set([
  'RELIANCE','INFY','TCS','HDFCBANK','ICICIBANK','SBIN','WIPRO','HINDUNILVR','ITC',
  'AXISBANK','KOTAKBANK','BAJFINANCE','BAJAJFINSV','MARUTI','TATAMOTORS','SUNPHARMA',
  'HCLTECH','TATASTEEL','ONGC','POWERGRID','NTPC','COALINDIA','BHARTIARTL','GAIL',
  'DIVISLAB','APOLLOHOSP','DMART','ZOMATO','JSWSTEEL','LTIM','TECHM','LT','ADANIPORTS',
  'ADANIENT','ADANIGREEN','NESTLEIND','BRITANNIA','DABUR','MARICO','ASIANPAINT',
  'PIDILITIND','COLPAL','GODREJCP','TITAN','ULTRACEMCO','SHREECEM','AMBUJACEM','ACC',
  'BEL','HAL','BHEL','SIEMENS','POLYCAB','PFC','RECLTD','HDFCLIFE','SBILIFE',
  'IOC','HINDPETRO','BPCL','DLF','IRCTC','BANKBARODA','PNB','INDUSINDBK','FEDERALBNK',
  'LICHSGFIN','VOLTAS','HAVELLS','BERGEPAINT','TATACONSUM','M&M','HEROMOTOCO',
  'BAJAJ-AUTO','EICHERMOT','MRF','TATAPOWER','ADANIPOWER','VEDL','HINDZINC','NMDC',
  'CHOLAFIN','MUTHOOTFIN','MANAPPURAM','HDFCAMC','JSWENERGY','TORNTPOWER','NHPC','RECLIMITED',
]);
const MID_CAP = new Set([
  'ABB','ACCELYA','ASHOKLEY','BEML','APOLLOTYRE','EXIDEIND','MCDOWELL-N','UBL',
  'PAGEIND','IRFC','IDFCFIRSTB','BANDHANBNK','YESBANK','RBLBANK','COFORGE','MPHASIS',
  'PERSISTENT','LTTS','KPITTECH','CIPLA','DRREDDY','LUPIN','ALKEM','GLENMARK',
  'AUROPHARMA','IPCALAB','TORNTPHARM','GODREJPROP','OBEROIRLTY','PRESTIGE','CANBK',
  'UNIONBANK','BANKINDIA','CGPOWER','CUMMINSIND','THERMAX','ADVENZYMES','CENTRALDEPOS',
  'CARERATINGS','CANARABANK','BDL','ANDHRSUGAR','HINDUSTANCOP','ABBOTINDIA','BIOCON',
  'LAURUSLABS','GRANULES','BOSCHLTD','NCC','RAMCOCEM',
]);
const ETF_SET = new Set([
  'NIFTYBEES','BANKBEES','GOLDBEES','SILVERBEES','LIQUIDBEES','JUNIORBEES',
  'PHARMABEES','PSUBNKBEES','CPSEETF','METALETF','ICICIHEALTHETF','MAFANG',
  'SETFNIF50','HDFCNIFTY','MOM50','MOM100','NV20BEES','UTINIFTETF',
]);

function capCat(sym: string): 'large' | 'mid' | 'small' | 'etf' {
  const s = sym.toUpperCase();
  if (s.endsWith('ETF') || s.endsWith('BEES') || ETF_SET.has(s)) return 'etf';
  if (LARGE_CAP.has(s)) return 'large';
  if (MID_CAP.has(s)) return 'mid';
  return 'small';
}

function heatColor(pct: number | null | undefined): string {
  if (pct == null) return 'rgba(255,255,255,0.04)';
  const c = Math.max(-5, Math.min(5, pct));
  if (c >= 0) {
    const i = c / 5;
    return `rgba(0,${Math.round(180 * i)},${Math.round(130 * i)},${0.18 + i * 0.45})`;
  }
  const i = Math.abs(c) / 5;
  return `rgba(255,${Math.round(59 + 90 * (1 - i))},${Math.round(80 * (1 - i))},${0.18 + i * 0.45})`;
}

interface PriceData { price: number | null; change_pct: number | null }

function DonutChart({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const R = 36; const C = 2 * Math.PI * R;
  let cum = 0;
  const slices = segments.map(d => { const dash = (d.value / total) * C; const s = { ...d, dash, offset: cum }; cum += dash; return s; });
  return (
    <svg viewBox="0 0 100 100" style={{ width:130, height:130, transform:'rotate(-90deg)', flexShrink:0 }}>
      {slices.map(s => <circle key={s.label} cx={50} cy={50} r={R} fill="none" stroke={s.color} strokeWidth="22" strokeDasharray={`${s.dash} ${C}`} strokeDashoffset={-s.offset} />)}
      <circle cx={50} cy={50} r={26} fill="var(--surf)" />
    </svg>
  );
}

function buildInsights(holdings: RawHolding[]): Array<{ icon: string; text: string; accent: string }> {
  const valid = holdings.filter(h => h.avg_price >= 1);
  if (!valid.length) return [];
  const total = valid.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const sorted = [...valid].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);
  const n = valid.length;
  const top1Pct = sorted[0] ? sorted[0].avg_price * sorted[0].qty / total * 100 : 0;
  const top3Pct = sorted.slice(0, 3).reduce((s, h) => s + h.avg_price * h.qty, 0) / total * 100;
  const ins: Array<{ icon: string; text: string; accent: string }> = [];

  if (n > 40)
    ins.push({ icon:'📊', accent:'var(--ylw)', text:`${n} holdings is broad-market territory. Beyond 30–35 stocks, diversification benefit plateaus while tracking difficulty compounds. Consider a quarterly consolidation — trim the weakest 10–15 by signal quality.` });
  else if (n >= 20)
    ins.push({ icon:'✅', accent:'var(--grn)', text:`${n} holdings sits in the professional sweet spot (20–40 names). You get meaningful diversification without over-diluting returns. Focus on quality of signals within this pool — not size.` });
  else
    ins.push({ icon:'⚡', accent:'var(--org)', text:`${n} holdings is a concentrated portfolio. This amplifies both upside and drawdown. Each position should carry a clear thesis and hard stop-loss. Re-examine on any Exit or Dead signal.` });

  if (top1Pct > 22)
    ins.push({ icon:'⚠️', accent:'var(--red)', text:`${sorted[0]?.symbol} is ${top1Pct.toFixed(0)}% of your capital — significant single-name concentration. A bad quarterly result or promoter event can swing your entire portfolio. Consider trimming to under 15% unless this is a deliberate structural bet.` });
  else if (top3Pct > 55)
    ins.push({ icon:'⚠️', accent:'var(--ylw)', text:`Top 3 holdings (${sorted.slice(0,3).map(h=>h.symbol).join(', ')}) = ${top3Pct.toFixed(0)}% of deployed capital. Cluster risk is elevated. If these share a sector, add cushion elsewhere or reduce size on the weakest performer.` });
  else
    ins.push({ icon:'✅', accent:'var(--grn)', text:`Allocation is well-balanced — largest holding ${sorted[0]?.symbol} at ${top1Pct.toFixed(0)}% stays within healthy limits. This allows the portfolio to absorb single-stock shocks without catastrophic P&L impact.` });

  const largePct = total > 0 ? sorted.filter(h => capCat(h.symbol) === 'large').reduce((s, h) => s + h.avg_price * h.qty, 0) / total * 100 : 0;
  const smallPct = total > 0 ? sorted.filter(h => capCat(h.symbol) === 'small').reduce((s, h) => s + h.avg_price * h.qty, 0) / total * 100 : 0;

  if (smallPct > 40)
    ins.push({ icon:'🔥', accent:'var(--org)', text:`${smallPct.toFixed(0)}% in small/micro caps. These outperform in bull phases but collapse 40–60% in corrections — and liquidity dries up fast. Ensure ≥30% in liquid large-caps as a portfolio shock absorber.` });
  else if (largePct > 70)
    ins.push({ icon:'📘', accent:'var(--bluL)', text:`${largePct.toFixed(0)}% large-cap tilt gives stability but may lag in mid/small-cap rallies. A 15–20% tactical allocation to quality mid-caps with strong earnings momentum can lift risk-adjusted returns.` });
  else
    ins.push({ icon:'✅', accent:'var(--grn)', text:`Cap distribution looks balanced. Large-cap anchors risk while mid/small adds growth beta. Keep reviewing cap-tier signals — mid-caps cycle in and out of momentum faster than large-caps.` });

  return ins;
}

function MarketOverview() {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Market Overview</div>
        <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><span className="live-dot"/>Live</span>
      </div>
      <div className="g2" style={{ display:'grid', gap:8 }}>
        {[
          { name:'NIFTY 50',   val:'24,812', chg:'+112 (+0.45%)', up:true  },
          { name:'SENSEX',     val:'81,540', chg:'+384 (+0.47%)', up:true  },
          { name:'BANK NIFTY', val:'53,240', chg:'-88 (-0.17%)',  up:false },
          { name:'NIFTY IT',   val:'38,120', chg:'+420 (+1.12%)', up:true  },
        ].map(m => (
          <div key={m.name} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'10px 13px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:2 }}>{m.name}</div>
            <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.5 }}>{m.val}</div>
            <div style={{ fontSize:11, fontWeight:700, marginTop:2, color: m.up ? 'var(--grn)' : 'var(--red)' }}>{m.up ? '▲' : '▼'} {m.chg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeEmpty({ name, email }: { name: string; email?: string }) {
  return (
    <>
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.25)', borderRadius:30, padding:'6px 14px', marginBottom:20 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--grn)' }}/>
        <span style={{ fontSize:12, color:'var(--grn)', fontWeight:600 }}>Signed in{email ? ` as ${email}` : ''}</span>
      </div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Welcome to SIGNAL. Upload your portfolio to unlock ML signals and P&L tracking.</div>
      </div>
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>📂 Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Add your holdings once — SIGNAL tracks P&L, signals and risk automatically.</div>
        <div className="g3" style={{ display:'grid', gap:16, marginBottom:28 }}>
          {[
            { n:'1', t:'Name your portfolio', d:'e.g. "Zerodha Long Term" or "Swing Trades"' },
            { n:'2', t:'Upload your holdings file', d:'Zerodha, Upstox, Groww, HDFC Sec, Angel One — auto-detected' },
            { n:'3', t:'Get ML signals instantly', d:'Every holding classified: Momentum · Swing · Exit Now' },
          ].map(s => (
            <div key={s.n} style={{ display:'flex', gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blu)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{s.t}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:2, lineHeight:1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/portfolio" style={{ height:42, padding:'0 28px', borderRadius:10, background:'var(--blu)', color:'#fff', fontSize:14, fontWeight:700, display:'inline-flex', alignItems:'center', gap:8 }}>
          📤 Upload Portfolio →
        </Link>
      </div>
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {[
          { icon:'🤖', t:'ML Signals', d:'BUY/SELL/HOLD on every holding. RSI + EMA + ML-classified.' },
          { icon:'📊', t:'Live P&L', d:'Unrealised gains, Momentum/Swing/Exit buckets — updated daily.' },
          { icon:'⚠️', t:'Risk Alerts', d:'Earnings flags, FII/DII impact, sector concentration.' },
        ].map(f => (
          <div key={f.t} style={card}>
            <div style={{ fontSize:22, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <MarketOverview />
    </>
  );
}

export default function DashboardPage() {
  const { user, session, portfolios, loading } = usePortfolio();
  const [prices, setPrices]           = useState<Record<string, PriceData>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [allIndiaRaw, setAllIndiaRaw] = useState<RawHolding[]>([]);
  const [usHoldings, setUsHoldings]   = useState<{ symbol:string; qty:number; avg_price:number }[]>([]);
  const [usPrices, setUsPrices]       = useState<Record<string, PriceData>>({});
  const [usdInr, setUsdInr]           = useState<number | null>(null);
  const [fxPos,   setFxPos]  = useState<{ id:string; currency:string; amount:number; avg_rate:number }[]>([]);
  const [cmPos,   setCmPos]  = useState<{ id:string; commodity:string; qty:number; unit:string; avg_price:number }[]>([]);
  const [fxPrices, setFxPrices] = useState<Record<string, PriceData>>({});
  const [cmPrices, setCmPrices] = useState<Record<string, PriceData>>({});

  // All India NSE/BSE holdings across EVERY portfolio
  useEffect(() => {
    if (!session || !portfolios.length) return;
    const ids = portfolios.map(p => p.id).join(',');
    fetch(
      `${SUPA_URL}/rest/v1/holdings?select=*&portfolio_id=in.(${ids})&exchange=in.(NSE,BSE)`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
    )
      .then(r => r.json())
      .then(rows => setAllIndiaRaw(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [session, portfolios]);

  // India prices — all merged symbols from all portfolios
  useEffect(() => {
    if (!allIndiaRaw.length) { setPrices({}); return; }
    const symSet = new Set(allIndiaRaw.map(h => normSym(h.symbol) + (h.exchange === 'NSE' ? '.NS' : '.BO')));
    const syms = Array.from(symSet).join(',');
    setPricesLoading(true);
    fetch(`/api/prices?symbols=${encodeURIComponent(syms)}`)
      .then(r => r.json())
      .then((data: Record<string, PriceData>) => {
        const m: Record<string, PriceData> = {};
        for (const [k, v] of Object.entries(data)) m[k.replace('.NS','').replace('.BO','')] = v;
        setPrices(m);
      })
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, [allIndiaRaw]);

  // US holdings — fetch all NYSE/NASDAQ across all portfolios
  useEffect(() => {
    if (!session || !portfolios.length) return;
    const ids = portfolios.map(p => p.id).join(',');
    fetch(`${SUPA_URL}/rest/v1/holdings?select=symbol,qty,avg_price&portfolio_id=in.(${ids})&exchange=in.(NYSE,NASDAQ)`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` }
    })
      .then(r => r.json())
      .then(rows => setUsHoldings(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [session, portfolios]);

  // US prices + USD/INR
  useEffect(() => {
    if (!usHoldings.length) { setUsPrices({}); return; }
    const syms = [...new Set(usHoldings.map(h => h.symbol)), 'USDINR=X'];
    fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`)
      .then(r => r.json())
      .then((data: Record<string, PriceData>) => {
        setUsPrices(data);
        if (data['USDINR=X']?.price) setUsdInr(data['USDINR=X'].price);
      })
      .catch(() => {});
  }, [usHoldings]);

  // Forex + commodity positions from localStorage (client-only)
  useEffect(() => {
    try { setFxPos(JSON.parse(localStorage.getItem('signal_forex_positions') ?? '[]')); } catch { /**/ }
    try { setCmPos(JSON.parse(localStorage.getItem('signal_commodity_positions') ?? '[]')); } catch { /**/ }
  }, []);

  // Forex live prices (same tickers used on forex page)
  useEffect(() => {
    if (!fxPos.length && !usdInr) return;
    const FX_TICKERS: Record<string, string> = {
      USD:'USDINR=X', EUR:'EURINR=X', GBP:'GBPINR=X', JPY:'JPYINR=X',
      AED:'AEDINR=X', SGD:'SGDINR=X', AUD:'AUDINR=X', CAD:'CADINR=X', CHF:'CHFINR=X',
    };
    const needed = fxPos.map(p => FX_TICKERS[p.currency]).filter(Boolean);
    if (!needed.length) return;
    fetch(`/api/prices?symbols=${encodeURIComponent([...new Set(needed)].join(','))}`)
      .then(r => r.json()).then(setFxPrices).catch(() => {});
  }, [fxPos]);

  // Commodity live prices
  useEffect(() => {
    if (!cmPos.length) return;
    const CM_TICKERS: Record<string, string> = {
      Gold:'GC=F', Silver:'SI=F', 'Crude Oil':'CL=F',
      'Natural Gas':'NG=F', Copper:'HG=F', Aluminium:'ALI=F',
    };
    const needed = cmPos.map(p => CM_TICKERS[p.commodity]).filter(Boolean);
    if (!needed.length) return;
    const usdInrSym = usdInr ? '' : 'USDINR=X';
    const syms = [...new Set([...needed, usdInrSym].filter(Boolean))];
    fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`)
      .then(r => r.json())
      .then((d: Record<string, PriceData>) => {
        setCmPrices(d);
        if (!usdInr && d['USDINR=X']?.price) setUsdInr(d['USDINR=X'].price);
      })
      .catch(() => {});
  }, [cmPos, usdInr]);

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Trader';

  if (loading || !user) {
    return (
      <div>
        <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
              <div style={{ width:80, height:11, background:'var(--surf2)', borderRadius:4, marginBottom:12 }}/>
              <div style={{ width:120, height:28, background:'var(--surf2)', borderRadius:6 }}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) return <WelcomeEmpty name={name} email={user.email} />;

  const fmtL = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(2)}L` : `₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}`;

  // Merge all India holdings by symbol (weighted avg across portfolios)
  const mergedMap = new Map<string, RawHolding>();
  for (const h of allIndiaRaw.filter(h => h.avg_price >= 1)) {
    const sym = normSym(h.symbol);
    const ex = mergedMap.get(sym);
    if (ex) {
      const tq = ex.qty + h.qty;
      mergedMap.set(sym, { ...ex, symbol: sym, qty: tq, avg_price: (ex.avg_price * ex.qty + h.avg_price * h.qty) / tq });
    } else { mergedMap.set(sym, { ...h, symbol: sym }); }
  }
  const mergedIndia = Array.from(mergedMap.values());
  const equityH = mergedIndia.filter(h => capCat(h.symbol) !== 'etf');
  const etfH    = mergedIndia.filter(h => capCat(h.symbol) === 'etf');

  function curVal(h: RawHolding) {
    const p = prices[h.symbol];
    if (p?.price == null) return h.avg_price * h.qty;
    const ratio = p.price / h.avg_price;
    return (ratio > 50 || ratio < 0.02) ? h.avg_price * h.qty : p.price * h.qty;
  }

  const equityInvested  = equityH.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const etfInvested     = etfH.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const invested        = equityInvested + etfInvested;
  const equityCurrent   = equityH.reduce((s, h) => s + curVal(h), 0);
  const etfCurrent      = etfH.reduce((s, h) => s + curVal(h), 0);
  const currentValue    = equityCurrent + etfCurrent;
  const totalPL         = currentValue - invested;
  const totalPLPct      = invested > 0 ? (totalPL / invested) * 100 : 0;
  const equityPL        = equityCurrent - equityInvested;
  const equityPLPct     = equityInvested > 0 ? (equityPL / equityInvested) * 100 : 0;
  const etfPL           = etfCurrent - etfInvested;
  const etfPLPct        = etfInvested > 0 ? (etfPL / etfInvested) * 100 : 0;
  const hasPrices       = Object.keys(prices).some(k => prices[k].price != null);

  // US portfolio totals
  const usInvestedUSD = usHoldings.reduce((s, h) => s + (h.avg_price > 0.01 ? h.avg_price * h.qty : 0), 0);
  const usCurrentUSD  = usHoldings.reduce((s, h) => { const p = usPrices[h.symbol]?.price; return p != null ? s + p * h.qty : s; }, 0);
  const usInrEquiv    = usdInr ? (usCurrentUSD > 0 ? usCurrentUSD : usInvestedUSD) * usdInr : usInvestedUSD > 0 ? usInvestedUSD * 84 : 0;
  const usPL          = usdInr && usCurrentUSD > 0 ? (usCurrentUSD - usInvestedUSD) * usdInr : null;
  const usPLPct       = usInvestedUSD > 0 && usCurrentUSD > 0 ? (usCurrentUSD - usInvestedUSD) / usInvestedUSD * 100 : null;
  const hasUSHoldings = usHoldings.length > 0;

  // Forex positions (INR invested = amount × avg_rate; current = amount × live_rate)
  const FX_TICKERS: Record<string, string> = {
    USD:'USDINR=X', EUR:'EURINR=X', GBP:'GBPINR=X', JPY:'JPYINR=X',
    AED:'AEDINR=X', SGD:'SGDINR=X', AUD:'AUDINR=X', CAD:'CADINR=X', CHF:'CHFINR=X',
  };
  const fxInvestedINR = fxPos.reduce((s, p) => {
    const scale = p.currency === 'JPY' ? 100 : 1;
    return s + (p.amount / scale) * p.avg_rate;
  }, 0);
  const fxCurrentINR = fxPos.reduce((s, p) => {
    const ticker = FX_TICKERS[p.currency];
    const liveRate = ticker ? (fxPrices[ticker]?.price ?? null) : null;
    const scale = p.currency === 'JPY' ? 100 : 1;
    if (!liveRate) return s + (p.amount / scale) * p.avg_rate;
    return s + (p.amount / scale) * liveRate;
  }, 0);
  const fxPL    = fxPos.length ? fxCurrentINR - fxInvestedINR : 0;
  const fxPLPct = fxInvestedINR > 0 ? (fxPL / fxInvestedINR) * 100 : 0;

  // Commodity positions (prices in USD → convert to INR)
  const CM_TICKERS: Record<string, string> = {
    Gold:'GC=F', Silver:'SI=F', 'Crude Oil':'CL=F',
    'Natural Gas':'NG=F', Copper:'HG=F', Aluminium:'ALI=F',
  };
  function cmCurrentPriceINR(commodity: string, avgPriceINR: number): number {
    const ticker = CM_TICKERS[commodity];
    if (!ticker || !usdInr) return avgPriceINR;
    const usdPrice = cmPrices[ticker]?.price;
    if (!usdPrice) return avgPriceINR;
    // MCX conversion (same as commodities page)
    const isGold = commodity === 'Gold';
    const isSilver = commodity === 'Silver';
    const isCopperOrAl = commodity === 'Copper' || commodity === 'Aluminium';
    if (isGold)      return usdPrice * usdInr / 31.1035 * 10;   // per 10g
    if (isSilver)    return usdPrice * usdInr / 31.1035 * 1000; // per kg
    if (isCopperOrAl) return usdPrice * usdInr * 2.20462;       // per kg
    return usdPrice * usdInr;                                    // crude/gas per barrel
  }
  const cmInvestedINR = cmPos.reduce((s, p) => s + p.avg_price * p.qty, 0);
  const cmCurrentINR  = cmPos.reduce((s, p) => s + cmCurrentPriceINR(p.commodity, p.avg_price) * p.qty, 0);
  const cmPL    = cmPos.length ? cmCurrentINR - cmInvestedINR : 0;
  const cmPLPct = cmInvestedINR > 0 ? (cmPL / cmInvestedINR) * 100 : 0;

  const combinedINR = invested + usInrEquiv + fxCurrentINR + cmCurrentINR;

  const capDist = { large:0, mid:0, small:0, etf:0 };
  for (const h of mergedIndia) capDist[capCat(h.symbol)] += h.avg_price * h.qty;
  const capTotal = Object.values(capDist).reduce((s, v) => s + v, 0);
  const capSegments = [
    { label:'Large Cap', value:capDist.large, color:'#4F6FFA' },
    { label:'Mid Cap',   value:capDist.mid,   color:'#00D4A0' },
    { label:'Small Cap', value:capDist.small, color:'#FF5C1A' },
    { label:'ETF / MF',  value:capDist.etf,   color:'#8B5CF6' },
  ].filter(s => s.value > 0);

  const insights  = buildInsights(mergedIndia);
  const heatTiles = [...mergedIndia].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}</div>
        </div>
        <Link href="/dashboard/portfolio" style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          📊 View Full P&L →
        </Link>
      </div>

      <OnboardingChecklist />

      {/* Consolidated summary — all portfolios merged */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:14 }}>
        {/* Equity */}
        <div style={card}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, marginBottom:6, textTransform:'uppercase' }}>Equity Stocks</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{equityH.length}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{fmtL(equityInvested)} invested</div>
          {hasPrices && equityInvested > 0 && (
            <div style={{ fontSize:12, fontWeight:700, marginTop:3, color: equityPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {equityPL >= 0 ? '+' : ''}{equityPLPct.toFixed(1)}%
            </div>
          )}
        </div>
        {/* ETF & MF */}
        <div style={{ ...card, borderColor: etfH.length > 0 ? 'rgba(139,92,246,0.3)' : 'var(--bdr)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--pur)', letterSpacing:0.5, marginBottom:6, textTransform:'uppercase' }}>ETF & MF</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{etfH.length}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{etfInvested > 0 ? fmtL(etfInvested) : '—'} invested</div>
          {hasPrices && etfInvested > 0 && (
            <div style={{ fontSize:12, fontWeight:700, marginTop:3, color: etfPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {etfPL >= 0 ? '+' : ''}{etfPLPct.toFixed(1)}%
            </div>
          )}
        </div>
        {/* Total Invested */}
        <div style={card}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, marginBottom:6, textTransform:'uppercase' }}>Total Invested</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{fmtL(invested)}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>
            {portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''} · India
          </div>
        </div>
        {/* Combined Return */}
        <div style={card}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, marginBottom:6, textTransform:'uppercase' }}>Combined Return</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1, color: hasPrices ? (totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
            {hasPrices ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>
            {hasPrices && totalPL !== 0 ? `${totalPL >= 0 ? '+' : ''}${fmtL(Math.abs(totalPL))}` : pricesLoading ? 'loading…' : '—'}
          </div>
        </div>
      </div>

      {/* ETF & MF breakdown */}
      {etfH.length > 0 && (
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>🏦 ETF & MF Holdings</div>
            <Link href="/dashboard/etf-mf" style={{ fontSize:11, color:'var(--bluL)', fontWeight:600 }}>ETF / MF page →</Link>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[...etfH].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty).map(h => {
              const p    = prices[h.symbol]?.price;
              const ratio = p != null ? p / h.avg_price : null;
              const plPct = (p != null && ratio != null && ratio > 0.02 && ratio < 50)
                ? (p - h.avg_price) / h.avg_price * 100 : null;
              return (
                <div key={h.symbol} style={{ background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'8px 14px', minWidth:110 }}>
                  <div style={{ fontSize:12, fontWeight:800, letterSpacing:0.3 }}>{h.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{fmtL(h.avg_price * h.qty)}</div>
                  {plPct != null ? (
                    <div style={{ fontSize:11, fontWeight:700, marginTop:2, color: plPct >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                    </div>
                  ) : <div style={{ fontSize:10, color:'var(--dim2)', marginTop:2 }}>—</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-asset summary blocks */}
      {(hasUSHoldings || fxPos.length > 0 || cmPos.length > 0) && (() => {
        type AssetBlock = { key:string; icon:string; label:string; invested:string; investedSub:string; pl:number|null; plPct:number|null; count:number; unit:string; href:string; accent:string; accentBdr:string };
        const blocks: AssetBlock[] = ([
          hasUSHoldings && {
            key:'us', icon:'🇺🇸', label:'US Stocks',
            invested: fmtL(usInrEquiv || usInvestedUSD * 84),
            investedSub: usInvestedUSD > 0 ? `$${usInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '',
            pl: usPL, plPct: usPLPct, count: usHoldings.length, unit: 'stocks',
            href:'/dashboard/us-portfolio',
            accent:'rgba(79,111,250,0.15)', accentBdr:'rgba(79,111,250,0.3)',
          },
          fxPos.length > 0 && {
            key:'fx', icon:'💱', label:'Forex',
            invested: fmtL(fxInvestedINR),
            investedSub: `${fxPos.length} currencies`,
            pl: fxPL, plPct: fxPLPct, count: fxPos.length, unit: 'positions',
            href:'/dashboard/forex',
            accent:'rgba(0,212,160,0.08)', accentBdr:'rgba(0,212,160,0.25)',
          },
          cmPos.length > 0 && {
            key:'cm', icon:'🥇', label:'Commodities',
            invested: fmtL(cmInvestedINR),
            investedSub: `${cmPos.length} positions`,
            pl: cmPL, plPct: cmPLPct, count: cmPos.length, unit: 'positions',
            href:'/dashboard/commodities',
            accent:'rgba(255,184,0,0.08)', accentBdr:'rgba(255,184,0,0.25)',
          },
        ] as (AssetBlock | false)[]).filter((b): b is AssetBlock => !!b);

        return (
          <div style={{ marginBottom:20 }}>
            {/* Combined net worth strip */}
            <div style={{ ...card, marginBottom:12, background:'linear-gradient(135deg,rgba(23,64,245,0.06),rgba(0,212,160,0.03))', border:'1px solid rgba(79,111,250,0.2)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1 }}>Combined Net Worth (INR)</div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:-1, color:'var(--grn)', marginTop:4 }}>{fmtL(combinedINR)}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                  India {fmtL(invested)} · US {fmtL(usInrEquiv)}
                  {fxPos.length > 0 ? ` · Forex ${fmtL(fxCurrentINR)}` : ''}
                  {cmPos.length > 0 ? ` · Cmdy ${fmtL(cmCurrentINR)}` : ''}
                </div>
              </div>
              {usdInr && <div style={{ fontSize:12, color:'var(--dim)', background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8, padding:'4px 10px' }}>USD/INR ₹{usdInr.toFixed(2)}</div>}
            </div>

            {/* Per-asset blocks */}
            <div className={`g${blocks.length === 1 ? '2' : blocks.length === 2 ? '2' : '3'}`} style={{ display:'grid', gap:12 }}>
              {blocks.map(b => (
                <Link key={b.key} href={b.href} style={{ textDecoration:'none' }}>
                  <div style={{ background:b.accent, border:`1px solid ${b.accentBdr}`, borderRadius:14, padding:'14px 16px', height:'100%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:18 }}>{b.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5 }}>{b.label}</span>
                    </div>
                    <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5 }}>{b.invested}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{b.investedSub} · {b.count} {b.unit}</div>
                    {b.pl != null && (
                      <div style={{ fontSize:13, fontWeight:700, marginTop:6, color: b.pl >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                        {b.pl >= 0 ? '+' : ''}{fmtL(Math.abs(b.pl))} ({b.plPct != null ? `${b.plPct >= 0 ? '+' : ''}${b.plPct.toFixed(1)}%` : '—'})
                      </div>
                    )}
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:6 }}>Tap to manage →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Analytics: treemap heatmap + cap donut */}
      <div className="g-analytics" style={{ display:'grid', gap:16, marginBottom:16, alignItems:'start' }}>
        {/* Treemap heatmap */}
        <div style={{ ...card, padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>Portfolio Heatmap</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                Tile size = portfolio weight · Color = daily change% · {pricesLoading ? 'loading…' : `${heatTiles.filter(h => prices[h.symbol]?.change_pct != null).length}/${heatTiles.length} live`}
              </div>
            </div>
          </div>
          <TreemapHeatmap
            height={420}
            items={heatTiles.map(h => ({
              symbol:    h.symbol,
              value:     h.avg_price * h.qty,
              changePct: prices[h.symbol]?.change_pct ?? null,
            }))}
          />
        </div>

        {/* Market cap donut */}
        <div style={card}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Market Cap Mix</div>
          {capSegments.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', padding:'20px 0' }}>—</div>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:14 }}>
                <DonutChart segments={capSegments} />
                <div style={{ fontSize:13, fontWeight:900, marginTop:-4 }}>{mergedIndia.length} holdings</div>
                <div style={{ fontSize:11, color:'var(--dim)' }}>{portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {capSegments.map(s => {
                  const pct = capTotal > 0 ? s.value / capTotal * 100 : 0;
                  return (
                    <div key={s.label}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }}/>
                          <span style={{ color:'var(--dim)' }}>{s.label}</span>
                        </div>
                        <span style={{ fontWeight:700 }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analyst commentary */}
      {insights.length > 0 && (
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(23,64,245,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>🎯</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>Portfolio Analysis</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>AI-generated · based on your current allocation</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'11px 14px', background:'var(--surf2)', borderRadius:10, borderLeft:`3px solid ${ins.accent}` }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{ins.icon}</span>
                <div style={{ fontSize:12.5, color:'var(--txt)', lineHeight:1.65 }}>{ins.text}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--dim2)', marginTop:10 }}>⚠️ NOT SEBI REGISTERED · Analysis for informational purposes only · DYOR</div>
        </div>
      )}

      <div className="g-side" style={{ display:'grid', gap:16 }}>
        <div>
          <MarketOverview />
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>FII / DII Flow</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>Today · sample</span>
            </div>
            {[
              { label:'FII (Foreign Inst.)', val:'-₹1,240 Cr', valC:'var(--red)', pct:35, barC:'var(--red)' },
              { label:'DII (Domestic Inst.)', val:'+₹2,180 Cr', valC:'var(--grn)', pct:68, barC:'var(--grn)' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ fontWeight:600 }}>{f.label}</span>
                  <span style={{ fontWeight:800, color:f.valC }}>{f.val}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${f.pct}%`, background:f.barC, borderRadius:3 }}/>
                </div>
              </div>
            ))}
            <Link href="/dashboard/fii-dii" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full FII/DII data →</Link>
          </div>
        </div>
        <div>
          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Quick Links</div>
            {[
              { href:'/dashboard/signals',      label:'📈 Live Signals',       sub:'BUY/SELL on 4000+ stocks' },
              { href:'/dashboard/portfolio',    label:'💼 My Portfolio',       sub:'P&L, ML signals, upload' },
              { href:'/dashboard/us-portfolio', label:'🇺🇸 US Portfolio',      sub:'Track US stocks in USD' },
              { href:'/dashboard/paper-trading',label:'🧪 Paper Trading',      sub:'Test strategies risk-free' },
              { href:'/dashboard/sectors',      label:'🔥 Sector Heatmap',     sub:'Which sectors are hot' },
              { href:'/dashboard/fii-dii',      label:'🌍 FII / DII Flow',     sub:'Institutional activity' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display:'flex', flexDirection:'column', padding:'10px 0', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--txt)' }}>{l.label}</span>
                <span style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>{l.sub}</span>
              </Link>
            ))}
          </div>
          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Sector Performance</div>
            {[
              { name:'IT',      val:'+4.1%', c:'var(--grn)' },
              { name:'Auto',    val:'+2.8%', c:'var(--grn)' },
              { name:'Banking', val:'-0.8%', c:'var(--red)' },
              { name:'Metal',   val:'-2.1%', c:'var(--red)' },
            ].map(s => (
              <div key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(28,46,74,0.3)' }}>
                <span style={{ color:'var(--dim)' }}>{s.name}</span>
                <span style={{ fontWeight:700, color:s.c }}>{s.val}</span>
              </div>
            ))}
            <Link href="/dashboard/sectors" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full heatmap →</Link>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Signals for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
