'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import { useState, useEffect } from 'react';
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

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' };
const colorCard = (grad: string, bdr: string): React.CSSProperties => ({
  background: grad, border:`1px solid ${bdr}`, borderRadius:16, padding:'18px 20px',
  backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)',
});

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
    ins.push({ icon:'📊', accent:'var(--ylw)', text:`${n} holdings. Academic research shows diversification benefit plateaus beyond 30–35 names, while tracking complexity compounds. This is an observation about portfolio size — not a direction to trade.` });
  else if (n >= 20)
    ins.push({ icon:'✅', accent:'var(--grn)', text:`${n} holdings. This range (20–40 names) is common in professionally managed equity portfolios. Concentration and quality of each position matters as much as count.` });
  else
    ins.push({ icon:'⚡', accent:'var(--org)', text:`${n} holdings is a concentrated portfolio. Historically, concentrated portfolios show higher variance — both gains and drawdowns are amplified. Individual position sizing becomes more significant at this count.` });

  if (top1Pct > 22)
    ins.push({ icon:'⚠️', accent:'var(--red)', text:`${sorted[0]?.symbol} is ${top1Pct.toFixed(0)}% of your capital — elevated single-name concentration. Single-stock events (earnings, regulatory, promoter) can have outsized P&L impact at this weight. Institutional portfolios typically cap any single name at 10–15%.` });
  else if (top3Pct > 55)
    ins.push({ icon:'⚠️', accent:'var(--ylw)', text:`Top 3 holdings (${sorted.slice(0,3).map(h=>h.symbol).join(', ')}) = ${top3Pct.toFixed(0)}% of deployed capital. If these share a sector or macro driver, that's cluster concentration — a sector-level event could move all three simultaneously.` });
  else
    ins.push({ icon:'✅', accent:'var(--grn)', text:`Allocation spread looks reasonable — largest holding ${sorted[0]?.symbol} at ${top1Pct.toFixed(0)}%. Single-stock concentration appears within typical risk parameters.` });

  const largePct = total > 0 ? sorted.filter(h => capCat(h.symbol) === 'large').reduce((s, h) => s + h.avg_price * h.qty, 0) / total * 100 : 0;
  const smallPct = total > 0 ? sorted.filter(h => capCat(h.symbol) === 'small').reduce((s, h) => s + h.avg_price * h.qty, 0) / total * 100 : 0;

  if (smallPct > 40)
    ins.push({ icon:'🔥', accent:'var(--org)', text:`${smallPct.toFixed(0)}% in small/micro caps. Small caps historically show higher beta — outperformance in bull markets, sharper drawdowns in corrections, and lower liquidity. This is a risk profile observation.` });
  else if (largePct > 70)
    ins.push({ icon:'📘', accent:'var(--bluL)', text:`${largePct.toFixed(0)}% large-cap tilt. Large caps tend to offer lower volatility and higher liquidity. Mid and small caps historically show higher growth rates but with higher variance. Your current mix leans defensive.` });
  else
    ins.push({ icon:'✅', accent:'var(--grn)', text:`Cap-tier distribution appears balanced across large, mid, and small. Each segment historically shows different volatility and growth characteristics — mixed allocation distributes these risks.` });

  return ins;
}

function MarketOverview() {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Market Overview</div>
        <span style={{ fontSize:10, color:'var(--dim)', fontWeight:600, padding:'2px 8px', background:'rgba(122,139,170,0.1)', borderRadius:6 }}>Sample · Not live</span>
      </div>
      <div className="g2" style={{ display:'grid', gap:8 }}>
        {[
          { name:'NIFTY 50',   val:'24,812', chg:'+112 (+0.45%)', up:true  },
          { name:'SENSEX',     val:'81,540', chg:'+384 (+0.47%)', up:true  },
          { name:'BANK NIFTY', val:'53,240', chg:'-88 (-0.17%)',  up:false },
          { name:'NIFTY IT',   val:'38,120', chg:'+420 (+1.12%)', up:true  },
        ].map(m => (
          <div key={m.name} style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, padding:'10px 13px' }}>
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
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Welcome to SIGNAL. Upload your portfolio to unlock technical scan results and P&L tracking.</div>
      </div>
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>📂 Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Add your holdings once — SIGNAL tracks P&L, scan results and risk metrics automatically.</div>
        <div className="g3" style={{ display:'grid', gap:16, marginBottom:28 }}>
          {[
            { n:'1', t:'Name your portfolio', d:'e.g. "Zerodha Long Term" or "Swing Trades"' },
            { n:'2', t:'Upload your holdings file', d:'Zerodha, Upstox, Groww, HDFC Sec, Angel One — auto-detected' },
            { n:'3', t:'Run ML Technical Scan instantly', d:'RSI, EMA, volume — every holding screened. You interpret the data.' },
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
          { icon:'🤖', t:'ML Technical Scan', d:'RSI, EMA, volume screener on every holding. Technical output — you decide.' },
          { icon:'📊', t:'Live P&L', d:'Unrealised gains, momentum zone distribution — updated daily.' },
          { icon:'⚠️', t:'Risk Metrics', d:'Earnings proximity flags, concentration risk, sector exposure.' },
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
            <div key={i} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'18px 20px' }}>
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Link href="/dashboard/portfolio"
            style={{ height:34, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, textDecoration:'none' }}>
            🇮🇳 India P&L →
          </Link>
          {hasUSHoldings && (
            <Link href="/dashboard/us-portfolio"
              style={{ height:34, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, textDecoration:'none' }}>
              🇺🇸 US P&L →
            </Link>
          )}
        </div>
      </div>


      {/* KPI strip — India + Net Worth + US all in one row */}
      <div className="g6" style={{ display:'grid', gap:12, marginBottom:14 }}>
        {/* Equity */}
        <div style={colorCard('linear-gradient(135deg,rgba(23,64,245,0.13),rgba(79,111,250,0.06))','rgba(79,111,250,0.28)')}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'rgba(79,111,250,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>📈</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--bluL)', letterSpacing:0.5, textTransform:'uppercase' }}>Equity Stocks</div>
          </div>
          <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}>{equityH.length}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:5 }}>{fmtL(equityInvested)} invested</div>
          {hasPrices && equityInvested > 0 && (
            <div style={{ fontSize:13, fontWeight:800, marginTop:4, color: equityPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {equityPL >= 0 ? '▲' : '▼'} {equityPL >= 0 ? '+' : ''}{equityPLPct.toFixed(1)}%
            </div>
          )}
        </div>
        {/* ETF & MF */}
        <div style={colorCard('linear-gradient(135deg,rgba(139,92,246,0.14),rgba(139,92,246,0.04))','rgba(139,92,246,0.3)')}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'rgba(139,92,246,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🏦</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--pur)', letterSpacing:0.5, textTransform:'uppercase' }}>ETF & MF</div>
          </div>
          <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}>{etfH.length}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:5 }}>{etfInvested > 0 ? fmtL(etfInvested) : '—'} invested</div>
          {hasPrices && etfInvested > 0 && (
            <div style={{ fontSize:13, fontWeight:800, marginTop:4, color: etfPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {etfPL >= 0 ? '▲' : '▼'} {etfPL >= 0 ? '+' : ''}{etfPLPct.toFixed(1)}%
            </div>
          )}
        </div>
        {/* Total Invested */}
        <div style={colorCard('linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,180,130,0.04))','rgba(0,212,160,0.28)')}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'rgba(0,212,160,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>💼</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--grn)', letterSpacing:0.5, textTransform:'uppercase' }}>Total Invested</div>
          </div>
          <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}>{fmtL(invested)}</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginTop:5 }}>
            {portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''} · India
          </div>
        </div>
        {/* Combined Return */}
        {(() => {
          const up = !hasPrices || totalPLPct >= 0;
          return (
            <div style={colorCard(
              up ? 'linear-gradient(135deg,rgba(0,212,160,0.14),rgba(0,212,160,0.04))' : 'linear-gradient(135deg,rgba(255,59,92,0.12),rgba(255,59,92,0.03))',
              up ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.28)'
            )}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:up?'rgba(0,212,160,0.18)':'rgba(255,59,92,0.14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{up?'🚀':'📉'}</div>
                <div style={{ fontSize:10, fontWeight:700, color:up?'var(--grn)':'var(--red)', letterSpacing:0.5, textTransform:'uppercase' }}>Combined Return</div>
              </div>
              <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, lineHeight:1, color: hasPrices ? (totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
                {hasPrices ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(1)}%` : '—'}
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:5 }}>
                {hasPrices && totalPL !== 0 ? `${totalPL >= 0 ? '+' : ''}${fmtL(Math.abs(totalPL))}` : pricesLoading ? 'loading…' : '—'}
              </div>
            </div>
          );
        })()}

        {/* Combined Net Worth */}
        <Link href="/dashboard/us-portfolio" style={{ textDecoration:'none' }}>
          <div style={{ ...colorCard('linear-gradient(135deg,rgba(0,212,160,0.16),rgba(23,64,245,0.07))','rgba(0,212,160,0.32)'), height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(0,212,160,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🌐</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--grn)', letterSpacing:0.5, textTransform:'uppercase' }}>Net Worth</div>
            </div>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--grn)' }}>{fmtL(combinedINR)}</div>
            <div style={{ fontSize:10, color:'var(--dim)', marginTop:5 }}>
              🇮🇳{fmtL(invested)} + 🇺🇸{fmtL(usInrEquiv)}
              {fxPos.length>0?` + 💱${fmtL(fxCurrentINR)}`:''}
            </div>
            {usdInr && <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>₹{usdInr.toFixed(1)} USD/INR</div>}
          </div>
        </Link>

        {/* US Stocks */}
        <Link href="/dashboard/us-portfolio" style={{ textDecoration:'none' }}>
          {hasUSHoldings ? (
            <div style={{ ...colorCard('linear-gradient(135deg,rgba(79,111,250,0.14),rgba(23,64,245,0.05))','rgba(79,111,250,0.30)'), height:'100%' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:'rgba(79,111,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🇺🇸</div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--bluL)', letterSpacing:0.5, textTransform:'uppercase' }}>US Stocks</div>
              </div>
              <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1, lineHeight:1 }}>{fmtL(usInrEquiv)}</div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:5 }}>{usHoldings.length} stocks · ${usInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})} invested</div>
              {usPLPct!=null && (
                <div style={{ fontSize:13, fontWeight:800, marginTop:4, color:usPLPct>=0?'var(--grn)':'var(--red)' }}>
                  {usPLPct>=0?'▲':'▼'} {usPLPct>=0?'+':''}{usPLPct.toFixed(1)}%
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...colorCard('linear-gradient(135deg,rgba(79,111,250,0.07),rgba(23,64,245,0.02))','rgba(79,111,250,0.2)'), height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', gap:8 }}>
              <div style={{ fontSize:22 }}>🇺🇸</div>
              <div style={{ fontSize:12, fontWeight:700 }}>US Portfolio</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>Add US stocks →</div>
            </div>
          )}
        </Link>
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


      {/* Forex + Commodities mini strip (only if positions exist) */}
      {(fxPos.length > 0 || cmPos.length > 0) && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {fxPos.length > 0 && (
            <Link href="/dashboard/forex" style={{ textDecoration:'none', flex:1, minWidth:200 }}>
              <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.09),rgba(0,212,160,0.02))', border:'1px solid rgba(0,212,160,0.24)', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20 }}>💱</span>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--grn)', textTransform:'uppercase', letterSpacing:0.5 }}>Forex</div>
                  <div style={{ fontSize:16, fontWeight:800 }}>{fmtL(fxCurrentINR)}</div>
                  <div style={{ fontSize:10, color:fxPL>=0?'var(--grn)':'var(--red)', fontWeight:700 }}>{fxPL>=0?'+':''}{fmtL(Math.abs(fxPL))} ({fxPLPct.toFixed(1)}%)</div>
                </div>
              </div>
            </Link>
          )}
          {cmPos.length > 0 && (
            <Link href="/dashboard/commodities" style={{ textDecoration:'none', flex:1, minWidth:200 }}>
              <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.09),rgba(255,184,0,0.02))', border:'1px solid rgba(255,184,0,0.24)', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20 }}>🥇</span>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ylw)', textTransform:'uppercase', letterSpacing:0.5 }}>Commodities</div>
                  <div style={{ fontSize:16, fontWeight:800 }}>{fmtL(cmCurrentINR)}</div>
                  <div style={{ fontSize:10, color:cmPL>=0?'var(--grn)':'var(--red)', fontWeight:700 }}>{cmPL>=0?'+':''}{fmtL(Math.abs(cmPL))} ({cmPLPct.toFixed(1)}%)</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Analytics: treemap heatmap + cap donut */}
      <div className="g-analytics" style={{ display:'grid', gap:16, marginBottom:16, alignItems:'start' }}>
        {/* Treemap heatmap */}
        <div style={{ ...card, padding:'16px', borderColor:'rgba(0,212,160,0.2)', background:'linear-gradient(160deg,rgba(0,212,160,0.05),var(--card-bg))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'rgba(0,212,160,0.14)', border:'1px solid rgba(0,212,160,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔥</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800 }}>Portfolio Heatmap</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>
                  Size = weight · Color = daily Δ · {pricesLoading ? 'loading…' : `${heatTiles.filter(h => prices[h.symbol]?.change_pct != null).length}/${heatTiles.length} live`}
                </div>
              </div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.25)', color:'var(--grn)' }}>● LIVE</span>
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
        <div style={{ ...card, marginBottom:16, borderColor:'rgba(255,92,26,0.22)', background:'linear-gradient(135deg,rgba(255,92,26,0.05),var(--card-bg))' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,rgba(255,92,26,0.18),rgba(255,184,0,0.12))', border:'1px solid rgba(255,92,26,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>🎯</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, letterSpacing:-0.2 }}>Portfolio Composition Metrics</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>Computed from your holdings · statistical observations only</div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(255,92,26,0.1)', border:'1px solid rgba(255,92,26,0.25)', color:'var(--org)' }}>Screener</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'11px 14px', background:'var(--surf2)', borderRadius:10, borderLeft:`3px solid ${ins.accent}` }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{ins.icon}</span>
                <div style={{ fontSize:12.5, color:'var(--txt)', lineHeight:1.65 }}>{ins.text}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--dim2)', marginTop:10 }}>⚠️ NOT SEBI REGISTERED · These are statistical observations on your holdings composition, not financial advice · DYOR</div>
        </div>
      )}

      {/* US Portfolio summary — always visible */}
      <div style={{ ...card, marginBottom:16, borderColor:'rgba(79,111,250,0.22)', background:'linear-gradient(135deg,rgba(79,111,250,0.06),var(--card-bg))' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:'rgba(79,111,250,0.14)', border:'1px solid rgba(79,111,250,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🇺🇸</div>
            <div style={{ fontSize:14, fontWeight:800, letterSpacing:-0.3 }}>US Portfolio</div>
          </div>
          <Link href="/dashboard/us-portfolio" style={{ fontSize:11, color:'var(--bluL)', fontWeight:600, textDecoration:'none' }}>
            {hasUSHoldings ? 'View full →' : 'Set up →'}
          </Link>
        </div>
        {hasUSHoldings ? (
          <>
            <div className="g4" style={{ display:'grid', gap:10, marginBottom:12 }}>
              {[
                { label:'Invested', val:`$${usInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `≈ ₹${(usInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--txt)' },
                { label:'Current', val: usCurrentUSD>0 ? `$${usCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: usdInr&&usCurrentUSD>0 ? `≈ ₹${(usCurrentUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', color:'var(--txt)' },
                { label:'P&L', val: usPL!=null ? `${usPL>=0?'+':'-'}₹${Math.abs(usPL).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—', sub: usPLPct!=null ? `${usPLPct>=0?'+':''}${usPLPct.toFixed(2)}%` : '', color: usPL!=null?(usPL>=0?'var(--grn)':'var(--red)'):'var(--txt)' },
                { label:'Holdings', val:`${usHoldings.length} stocks`, sub: usdInr ? `USD/INR ₹${usdInr.toFixed(2)}` : '', color:'var(--txt)' },
              ].map(m => (
                <div key={m.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(79,111,250,0.15)', borderRadius:10, padding:'10px 13px' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontSize:16, fontWeight:900, letterSpacing:-0.3, color:m.color }}>{m.val}</div>
                  {m.sub && <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{m.sub}</div>}
                </div>
              ))}
            </div>
            <div style={{ overflowX:'auto', marginBottom:12 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>{['Stock','Qty','Avg','CMP','P&L $','P&L %'].map((h,i) => (
                    <th key={i} style={{ fontSize:9, fontWeight:700, color:'var(--dim)', padding:'5px 8px', textAlign:'left', borderBottom:'1px solid rgba(79,111,250,0.15)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...usHoldings].sort((a,b) => (b.avg_price*b.qty)-(a.avg_price*a.qty)).map(h => {
                    const cmp   = usPrices[h.symbol]?.price ?? null;
                    const chg   = usPrices[h.symbol]?.change_pct ?? null;
                    const pl    = cmp != null && h.avg_price > 0.01 ? (cmp - h.avg_price) * h.qty : null;
                    const plPct = cmp != null && h.avg_price > 0.01 ? (cmp - h.avg_price) / h.avg_price * 100 : null;
                    const pos   = pl == null || pl >= 0;
                    return (
                      <tr key={h.symbol}
                        onMouseEnter={e => (e.currentTarget.style.background='rgba(79,111,250,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)' }}>
                          <div style={{ fontWeight:700 }}>{h.symbol}</div>
                          {chg != null && <div style={{ fontSize:9, color: chg>=0?'var(--grn)':'var(--red)' }}>{chg>=0?'+':''}{chg.toFixed(2)}%</div>}
                        </td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)', color:'var(--dim)' }}>{h.qty}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)', color:'var(--dim)', whiteSpace:'nowrap' }}>${h.avg_price.toFixed(2)}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)', whiteSpace:'nowrap' }}>{cmp!=null?`$${cmp.toFixed(2)}`:'—'}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)', fontWeight:700, color:pos?'var(--grn)':'var(--red)', whiteSpace:'nowrap' }}>{pl!=null?`${pl>=0?'+':'-'}$${Math.abs(pl).toFixed(0)}`:'—'}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid rgba(79,111,250,0.1)', fontWeight:700, color:pos?'var(--grn)':'var(--red)', whiteSpace:'nowrap' }}>{plPct!=null?`${plPct>=0?'+':''}${plPct.toFixed(1)}%`:'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0 8px' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🇺🇸</div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>No US stocks yet</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:14 }}>Create a portfolio and import your broker file (Schwab, Robinhood, Fidelity, etc.)</div>
            <Link href="/dashboard/us-portfolio" style={{ height:34, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
              Set up US Portfolio →
            </Link>
          </div>
        )}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop: hasUSHoldings ? 0 : 12 }}>
          {hasUSHoldings && (
            <Link href="/dashboard/us-portfolio" style={{ height:32, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none' }}>
              US Portfolio →
            </Link>
          )}
          <Link href="/dashboard/equity-comp" style={{ height:32, padding:'0 14px', borderRadius:8, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.35)', color:'var(--pur)', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none' }}>
            ESPP &amp; RSU →
          </Link>
        </div>
      </div>

      <div className="g-side" style={{ display:'grid', gap:16 }}>
        <div>
          <MarketOverview />
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>FII / DII Flow</div>
              <span style={{ fontSize:10, color:'var(--dim)', padding:'2px 8px', background:'rgba(122,139,170,0.1)', borderRadius:6 }}>Illustration only · Not live</span>
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
              { href:'/dashboard/signals',      label:'📈 ML Technical Scan',  sub:'RSI + EMA screener · NSE stocks' },
              { href:'/dashboard/portfolio',    label:'💼 Indian Portfolio',       sub:'P&L, ML signals, upload' },
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
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · This is a technical screening tool · Scan results are computed indicators, not investment advice · DYOR
      </div>
    </>
  );
}
