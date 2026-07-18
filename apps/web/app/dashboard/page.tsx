'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import { useState, useEffect, useRef } from 'react';
import { TreemapHeatmap } from '@/components/TreemapHeatmap';
import { MarketBrief } from '@/components/MarketBrief';
import { MarketMoodIndex } from '@/components/MarketMoodIndex';
import { VixExplainer } from '@/components/VixExplainer';
import { DxyExplainer } from '@/components/DxyExplainer';
import { StockDetailSheet } from '@/components/StockDetailSheet';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const MONO = "'JetBrains Mono', monospace";
const GROTESK = "'Space Grotesk', 'Inter', sans-serif";

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

/* Flat panel — no glass, no glow; hairline border on the neutral surface */
const panel: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'18px 20px' };

/* Mono micro-label used above every section */
function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
      <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase' as const, color:'var(--dim2)' }}>{children}</div>
      {right}
    </div>
  );
}

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


interface PriceData { price: number | null; change_pct: number | null }

/* =====================================================
   Minimal stroke icon set
   ===================================================== */
const I = {
  bars:   'M4 20V10M10 20V4M16 20v-6M2 20h20',
  bank:   'M3 9.5L12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18',
  globe:  'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z',
  flame:  'M12 22c3.9 0 7-2.9 7-7 0-3.2-2.2-5.6-3.6-7.1-.4 1.1-1.2 2.2-2.4 2.6.1-3-1.3-5.9-4-7.5.3 2.9-.9 4.4-2 5.9C5.8 10.4 5 12.2 5 15c0 4.1 3.1 7 7 7z',
  scan:   'M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M3 12h18',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM12 12.8a.8.8 0 100-1.6.8.8 0 000 1.6z',
  coin:   'M12 21a9 9 0 100-18 9 9 0 000 18zM15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5c0 3 6 2 6 5 0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5M12 5.5v13',
  flow:   'M7 4L3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8',
  star:   'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.8L6.6 20l1-6.1L3.2 9.5l6.1-.9L12 3z',
  flask:  'M9 3h6M10 3v5.2L4.7 17a2.5 2.5 0 002.2 3.7h10.2a2.5 2.5 0 002.2-3.7L14 8.2V3',
  arrow:  'M5 12h14M13 6l6 6-6 6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
};

function Icon({ p, s = 14 }: { p: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }} aria-hidden="true">
      <path d={p} />
    </svg>
  );
}

/* Count-up animation for the hero figure — eases out to the latest value */
function useAnimatedValue(target: number, duration = 750) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setVal(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function DonutChart({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const R = 36; const C = 2 * Math.PI * R;
  let cum = 0;
  const slices = segments.map(d => { const dash = (d.value / total) * C; const s = { ...d, dash, offset: cum }; cum += dash; return s; });
  return (
    <svg viewBox="0 0 100 100" style={{ width:112, height:112, transform:'rotate(-90deg)', flexShrink:0 }}>
      {slices.map(s => <circle key={s.label} cx={50} cy={50} r={R} fill="none" stroke={s.color} strokeWidth="19" strokeDasharray={`${s.dash} ${C}`} strokeDashoffset={-s.offset} />)}
      <circle cx={50} cy={50} r={25} fill="var(--surf)" />
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

const MKT_INDICES = [
  { name:'NIFTY 50',   ticker:'^NSEI'   },
  { name:'SENSEX',     ticker:'^BSESN'  },
  { name:'BANK NIFTY', ticker:'^NSEBANK'},
  { name:'NIFTY IT',   ticker:'^CNXIT'  },
];

type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;
type FiiRow   = { fii_net: number; dii_net: number; date: string };

const SIDEBAR_SECTORS = [
  { name:'IT',      ticker:'^CNXIT'    },
  { name:'Auto',    ticker:'^CNXAUTO'  },
  { name:'Banking', ticker:'^NSEBANK'  },
  { name:'Metal',   ticker:'^CNXMETAL' },
];

function ChangeTxt({ chg, size = 11 }: { chg: number | null; size?: number }) {
  if (chg == null) return <span style={{ fontSize:size, color:'var(--dim2)' }}>—</span>;
  const up = chg >= 0;
  return (
    <span style={{ fontSize:size, fontWeight:700, fontFamily:MONO, color: up ? 'var(--grn)' : 'var(--red)' }}>
      {up ? '▲' : '▼'} {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
    </span>
  );
}

/** Edge-to-edge terminal ticker — sits above the header, hairline top/bottom */
function MarketStrip({ data, loading }: { data: PriceMap; loading: boolean }) {
  const extraSectors = SIDEBAR_SECTORS.filter(s => !MKT_INDICES.find(m => m.ticker === s.ticker));
  return (
    <div style={{ margin:'-24px calc(-1 * clamp(12px,3vw,32px)) 20px', borderBottom:'1px solid var(--bdr)', background:'var(--surf)' }}>
      <div className="idx-strip" style={{ padding:'0 clamp(12px,3vw,32px)', height:42 }}>
        {!loading && <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1.2, color:'var(--grn)', flexShrink:0 }}><span className="live-dot"/>LIVE</span>}
        {MKT_INDICES.map(m => {
          const d = data[m.ticker];
          return (
            <div key={m.ticker} style={{ display:'flex', alignItems:'baseline', gap:7, flexShrink:0 }}>
              <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:0.8, color:'var(--dim2)' }}>{m.name}</span>
              {loading
                ? <span style={{ width:52, height:12, borderRadius:3, background:'var(--surf2)', display:'inline-block' }}/>
                : <span style={{ fontSize:13, fontWeight:700, fontFamily:MONO, letterSpacing:-0.2 }}>{d?.price != null ? d.price.toLocaleString('en-IN', { maximumFractionDigits:0 }) : '—'}</span>}
              {!loading && <ChangeTxt chg={d?.change_pct ?? null} size={10} />}
            </div>
          );
        })}
        <span style={{ color:'var(--dim2)', flexShrink:0, fontSize:10 }}>/</span>
        {extraSectors.map(s => {
          const d = data[s.ticker];
          return (
            <div key={s.ticker} style={{ display:'flex', alignItems:'baseline', gap:6, flexShrink:0 }}>
              <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:0.8, color:'var(--dim2)', textTransform:'uppercase' as const }}>{s.name}</span>
              {loading
                ? <span style={{ width:34, height:11, borderRadius:3, background:'var(--surf2)', display:'inline-block' }}/>
                : <ChangeTxt chg={d?.change_pct ?? null} size={10} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeFIIDII({ today, loading }: { today: FiiRow | null; loading: boolean }) {
  function cr(n: number) { return `${n>=0?'+':'-'}₹${Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`; }
  const maxAbs = today ? Math.max(Math.abs(today.fii_net), Math.abs(today.dii_net), 1) : 1;
  const rows = today
    ? [
        { label:'FII · Foreign', net:today.fii_net },
        { label:'DII · Domestic', net:today.dii_net },
      ]
    : [];

  return (
    <div style={panel}>
      <SectionLabel right={loading
        ? <span style={{ fontSize:11, color:'var(--dim)' }}>…</span>
        : today
          ? <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, color:'var(--grn)', display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span>
          : <span style={{ fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.5 }}>NSE UNAVAILABLE</span>}>
        FII / DII Flow
      </SectionLabel>
      {loading && <div style={{ height:52, background:'var(--surf2)', borderRadius:8 }}/>}
      {!loading && rows.map((f, i) => (
        <div key={f.label} style={{ padding:'9px 0', borderTop: i > 0 ? '1px solid var(--bdr)' : 'none' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
            <span style={{ fontSize:11.5, color:'var(--dim)', fontWeight:600 }}>{f.label}</span>
            <span style={{ fontWeight:700, fontFamily:MONO, fontSize:13, color: f.net>=0 ? 'var(--grn)' : 'var(--red)' }}>{cr(f.net)}</span>
          </div>
          <div style={{ height:3, background:'var(--surf2)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.round(Math.abs(f.net)/maxAbs*100)}%`, background: f.net>=0 ? 'var(--grn)' : 'var(--red)', borderRadius:2 }}/>
          </div>
        </div>
      ))}
      {!loading && !today && (
        <div style={{ fontSize:12, color:'var(--dim)', padding:'6px 0' }}>NSE data unavailable — check back after 6 PM IST</div>
      )}
      <Link href="/dashboard/fii-dii" style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:10, fontFamily:MONO, fontSize:11, color:'var(--bluL)', fontWeight:700 }}>
        FULL DATA <Icon p={I.arrow} s={10} />
      </Link>
    </div>
  );
}

function HomeSectorPerf({ data, loading }: { data: PriceMap; loading: boolean }) {
  return (
    <div style={panel}>
      <SectionLabel right={!loading ? <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, color:'var(--grn)', display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span> : undefined}>
        Sector Performance
      </SectionLabel>
      {SIDEBAR_SECTORS.map((s, i) => {
        const chg = data[s.ticker]?.change_pct ?? null;
        return (
          <div key={s.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop: i > 0 ? '1px solid var(--bdr)' : 'none' }}>
            <span style={{ fontSize:12, color:'var(--dim)', fontWeight:600 }}>{s.name}</span>
            {loading
              ? <span style={{ width:40, height:11, background:'var(--surf2)', borderRadius:3, display:'inline-block' }}/>
              : <ChangeTxt chg={chg} size={12} />}
          </div>
        );
      })}
      <Link href="/dashboard/sectors" style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:10, fontFamily:MONO, fontSize:11, color:'var(--bluL)', fontWeight:700 }}>
        HEATMAP <Icon p={I.arrow} s={10} />
      </Link>
    </div>
  );
}

/** Uniform asset-class stat tile — flat, mono label, Grotesk figure */
function AssetTile({ href, icon, label, value, sub, pl }: {
  href: string; icon: string; label: string; value: string; sub: string; pl?: number | null;
}) {
  return (
    <Link href={href} className="hover-lift" style={{ flex:'1 1 150px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', textDecoration:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:11, color:'var(--dim2)' }}>
        <Icon p={icon} s={12} />
        <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:'uppercase' as const }}>{label}</span>
        <span style={{ marginLeft:'auto' }}><Icon p={I.arrow} s={10} /></span>
      </div>
      <div style={{ fontSize:21, fontWeight:700, letterSpacing:-0.5, fontFamily:GROTESK, lineHeight:1 }}>{value}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:7, gap:6 }}>
        <span style={{ fontSize:10.5, color:'var(--dim)', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</span>
        {pl != null && (
          <span style={{ fontSize:11, fontWeight:700, fontFamily:MONO, flexShrink:0, color: pl >= 0 ? 'var(--grn)' : 'var(--red)' }}>
            {pl >= 0 ? '+' : ''}{pl.toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}

function WelcomeEmpty({ name, email, mktData, mktLoading }: { name: string; email?: string; mktData: PriceMap; mktLoading: boolean }) {
  return (
    <>
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, border:'1px solid var(--bdr)', borderRadius:30, padding:'5px 13px', marginBottom:22, background:'var(--surf)' }}>
        <span className="live-dot" />
        <span style={{ fontFamily:MONO, fontSize:10.5, color:'var(--dim)', letterSpacing:0.4 }}>Signed in{email ? ` as ${email}` : ''}</span>
      </div>
      <div style={{ marginBottom:26 }}>
        <div style={{ fontFamily:GROTESK, fontSize:30, fontWeight:700, letterSpacing:-0.8 }}>{greet()}, {name}</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:6 }}>Welcome to SignalGenie. Upload your portfolio to unlock technical scan results and P&L tracking.</div>
      </div>
      <div style={{ ...panel, padding:'26px 30px', marginBottom:20 }}>
        <div style={{ fontFamily:GROTESK, fontSize:19, fontWeight:700, marginBottom:6 }}>Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:26 }}>Add your holdings once — SignalGenie tracks P&L, scan results and risk metrics automatically.</div>
        <div className="g3" style={{ display:'grid', gap:18, marginBottom:28 }}>
          {[
            { n:'01', t:'Name your portfolio', d:'e.g. "Zerodha Long Term" or "Swing Trades"' },
            { n:'02', t:'Upload your holdings file', d:'Zerodha, Upstox, Groww, HDFC Sec, Angel One — auto-detected' },
            { n:'03', t:'Run ML Technical Scan instantly', d:'RSI, EMA, volume — every holding screened. You interpret the data.' },
          ].map(s => (
            <div key={s.n} style={{ borderTop:'2px solid var(--blu)', paddingTop:12 }}>
              <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:'var(--bluL)', letterSpacing:1, marginBottom:6 }}>{s.n}</div>
              <div style={{ fontSize:13, fontWeight:700 }}>{s.t}</div>
              <div style={{ fontSize:11.5, color:'var(--dim)', marginTop:3, lineHeight:1.55 }}>{s.d}</div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/portfolio" style={{ height:42, padding:'0 26px', borderRadius:9, background:'var(--blu)', color:'#fff', fontSize:13.5, fontWeight:700, display:'inline-flex', alignItems:'center', gap:8 }}>
          <Icon p={I.upload} s={14} /> Upload Portfolio
        </Link>
      </div>
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:26 }}>
        {[
          { icon:I.scan,   t:'ML Technical Scan', d:'RSI, EMA, volume screener on every holding. Technical output — you decide.' },
          { icon:I.bars,   t:'Live P&L',          d:'Unrealised gains, momentum zone distribution — updated daily.' },
          { icon:I.target, t:'Risk Metrics',      d:'Earnings proximity flags, concentration risk, sector exposure.' },
        ].map(f => (
          <div key={f.t} style={panel}>
            <span style={{ color:'var(--bluL)', display:'inline-block', marginBottom:10 }}><Icon p={f.icon} s={16} /></span>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <MarketStrip data={mktData} loading={mktLoading} />
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
  const [rsuGrants, setRsuGrants]     = useState<{ symbol:string; shares:number; grant_price:number }[]>([]);
  const [rsuPrices, setRsuPrices]     = useState<Record<string, PriceData>>({});
  const [usdInr, setUsdInr]           = useState<number | null>(null);
  const [fxPos,   setFxPos]  = useState<{ id:string; currency:string; amount:number; avg_rate:number }[]>([]);
  const [cmPos,   setCmPos]  = useState<{ id:string; commodity:string; qty:number; unit:string; avg_price:number }[]>([]);
  const [fxPrices, setFxPrices] = useState<Record<string, PriceData>>({});
  const [cmPrices, setCmPrices] = useState<Record<string, PriceData>>({});
  const [scanPicks, setScanPicks]   = useState<{ symbol: string; exchange: string; price_at: number; rsi14: number | null; scanned_at: string }[]>([]);
  const [detailSym, setDetailSym] = useState<{ symbol: string; exchange: string } | null>(null);
  const [heatRegion, setHeatRegion] = useState<'IN' | 'US'>('IN');
  const [mounted, setMounted]       = useState(false);
  // Market sidebar data — indices + sectors in one batch call
  const [mktData,    setMktData]    = useState<PriceMap>({});
  const [mktLoading, setMktLoading] = useState(true);
  const [fiiData,    setFiiData]    = useState<FiiRow | null>(null);
  const [fiiLoading, setFiiLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Market sidebar: indices + sectors in ONE price call + FII/DII — fires on mount, no deps
  useEffect(() => {
    const mktTickers = [
      ...MKT_INDICES.map(i => i.ticker),
      ...SIDEBAR_SECTORS.filter(s => !MKT_INDICES.find(m => m.ticker === s.ticker)).map(s => s.ticker),
    ].join(',');
    Promise.all([
      fetch(`/api/prices?symbols=${encodeURIComponent(mktTickers)}`).then(r => r.json()).catch(() => ({})),
      fetch('/api/fii-dii').then(r => r.json()).catch(() => ({})),
    ]).then(([prices, fii]: [PriceMap, { rows?: FiiRow[] }]) => {
      setMktData(prices);
      setFiiData(fii?.rows?.[0] ?? null);
    }).finally(() => { setMktLoading(false); setFiiLoading(false); });
  }, []);

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

  // RSU/ESPP grants from equity_grants table
  useEffect(() => {
    if (!session) return;
    fetch(`${SUPA_URL}/rest/v1/equity_grants?user_id=eq.${session.user.id}&select=symbol,shares,grant_price`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(rows => setRsuGrants(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [session]);

  // RSU live prices
  useEffect(() => {
    if (!rsuGrants.length) { setRsuPrices({}); return; }
    const syms = [...new Set(rsuGrants.map(g => g.symbol).filter(Boolean))];
    if (!syms.length) return;
    fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`)
      .then(r => r.json())
      .then((data: Record<string, PriceData>) => setRsuPrices(data))
      .catch(() => {});
  }, [rsuGrants]);

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

  // Recent scan picks from scan_log
  useEffect(() => {
    if (!session) return;
    fetch(`${SUPA_URL}/rest/v1/scan_log?select=symbol,exchange,price_at,rsi14,scanned_at&scan_score=eq.Strong%20Momentum&order=scanned_at.desc&limit=6`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(rows => setScanPicks(Array.isArray(rows) ? rows.filter((r: { price_at?: unknown }) => r.price_at != null) : []))
      .catch(() => {});
  }, [session]);

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Trader';

  if (loading || !user) {
    return (
      <div>
        <div style={{ height:42, margin:'-24px calc(-1 * clamp(12px,3vw,32px)) 20px', borderBottom:'1px solid var(--bdr)', background:'var(--surf)' }}/>
        <div style={{ ...panel, height:120, marginBottom:14 }}><div className="shimmer" style={{ width:200, height:30, marginBottom:14 }}/><div className="shimmer" style={{ width:140, height:12 }}/></div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex:'1 1 150px', ...panel, padding:'14px 16px' }}>
              <div className="shimmer" style={{ width:80, height:10, marginBottom:12 }}/>
              <div className="shimmer" style={{ width:110, height:22 }}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) return <WelcomeEmpty name={name} email={user.email} mktData={mktData} mktLoading={mktLoading} />;

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

  // RSU/ESPP totals
  const rsuCostUSD    = rsuGrants.reduce((s, g) => s + g.shares * g.grant_price, 0);
  const rsuCurrentUSD = rsuGrants.reduce((s, g) => {
    const p = rsuPrices[g.symbol]?.price;
    return p != null ? s + p * g.shares : s + g.shares * g.grant_price;
  }, 0);
  const rsuValueINR   = usdInr ? rsuCurrentUSD * usdInr : rsuCurrentUSD * 84;
  const hasRSU        = rsuGrants.length > 0;

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

  const combinedINR = invested + usInrEquiv + rsuValueINR + fxCurrentINR + cmCurrentINR;
  // Combined all-time P&L across asset classes that have a live valuation
  const combinedInvested = invested + (usdInr ? usInvestedUSD * usdInr : 0) + fxInvestedINR + cmInvestedINR;
  const combinedPL       = totalPL + (usPL ?? 0) + fxPL + cmPL;
  const combinedPLPct    = combinedInvested > 0 ? (combinedPL / combinedInvested) * 100 : null;

  const capDist = { large:0, mid:0, small:0, etf:0 };
  for (const h of mergedIndia) capDist[capCat(h.symbol)] += h.avg_price * h.qty;
  const capTotal = Object.values(capDist).reduce((s, v) => s + v, 0);
  const capSegments = [
    { label:'Large Cap', value:capDist.large, color:'var(--bluL)' },
    { label:'Mid Cap',   value:capDist.mid,   color:'var(--grn)'  },
    { label:'Small Cap', value:capDist.small, color:'var(--org)'  },
    { label:'ETF / MF',  value:capDist.etf,   color:'var(--pur)'  },
  ].filter(s => s.value > 0);

  const insights    = buildInsights(mergedIndia);
  const heatTilesIN = [...mergedIndia].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);
  const heatTilesUS = [...usHoldings].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);
  const activeHeatRegion = heatRegion === 'US' && heatTilesUS.length > 0 ? 'US' : 'IN';
  const heatTiles = activeHeatRegion === 'US' ? heatTilesUS : heatTilesIN;
  const heatPrices = activeHeatRegion === 'US' ? usPrices : prices;

  // Net-worth composition (only asset classes with value) — drives the allocation bar
  const nwBreakdown = [
    { label:'India',  value:invested,       color:'var(--grn)'  },
    hasUSHoldings ? { label:'US',      value:usInrEquiv,   color:'var(--bluL)' } : null,
    hasRSU        ? { label:'RSU',     value:rsuValueINR,  color:'var(--pur)'  } : null,
    fxPos.length  ? { label:'Forex',   value:fxCurrentINR, color:'var(--ylw)'  } : null,
    cmPos.length  ? { label:'Commod.', value:cmCurrentINR, color:'var(--org)'  } : null,
  ].filter(Boolean) as { label:string; value:number; color:string }[];

  const animatedNW = useAnimatedValue(combinedINR);

  const ghostBtn: React.CSSProperties = { height:30, padding:'0 12px', borderRadius:8, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:11.5, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, textDecoration:'none' };

  return (
    <>
      {/* ── Terminal ticker — edge-to-edge ─────────────────── */}
      <MarketStrip data={mktData} loading={mktLoading} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.6, color:'var(--dim2)', textTransform:'uppercase' as const, marginBottom:7 }}>Dashboard</div>
          <div style={{ fontFamily:GROTESK, fontSize:25, fontWeight:700, letterSpacing:-0.6, lineHeight:1.1 }}>{greet()}, {name}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:7 }}>
          <div style={{ fontFamily:MONO, fontSize:10.5, color:'var(--dim2)' }}>{new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' }).toUpperCase()}</div>
          <div style={{ display:'flex', gap:6 }}>
            <Link href="/dashboard/portfolio" style={ghostBtn}>India P&L <Icon p={I.arrow} s={10} /></Link>
            {hasUSHoldings && (
              <Link href="/dashboard/us-portfolio" style={ghostBtn}>US P&L <Icon p={I.arrow} s={10} /></Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Net worth hero ─────────────────────────────────── */}
      <div style={{ ...panel, padding:'24px 26px', marginBottom:14 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:26, justifyContent:'space-between' }}>
          <div style={{ minWidth:230 }}>
            <div style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase' as const, color:'var(--dim2)', marginBottom:10 }}>Combined Net Worth</div>
            <div style={{ fontFamily:GROTESK, fontSize:'clamp(40px,5vw,56px)', fontWeight:700, letterSpacing:-2.2, lineHeight:1 }}>{fmtL(animatedNW)}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:12, flexWrap:'wrap' }}>
              {hasPrices && combinedPLPct != null && (
                <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color: combinedPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {combinedPL >= 0 ? '▲' : '▼'} {fmtL(Math.abs(combinedPL))} · {combinedPL >= 0 ? '+' : ''}{combinedPLPct.toFixed(1)}%
                </span>
              )}
              <span style={{ fontSize:11, color:'var(--dim)' }}>
                all-time{usdInr ? ` · ₹${usdInr.toFixed(1)}/$` : ''} · {portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {nwBreakdown.length > 1 && (
            <div style={{ flex:'1 1 280px', maxWidth:460, alignSelf:'center' }}>
              <div style={{ display:'flex', height:8, borderRadius:5, overflow:'hidden', gap:2, marginBottom:12 }}>
                {nwBreakdown.map(b => (
                  <div key={b.label} style={{ width: mounted && combinedINR > 0 ? `${(b.value / combinedINR) * 100}%` : '0%', background:b.color, borderRadius:2, transition:'width 0.9s cubic-bezier(0.22,1,0.36,1)' }}/>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(104px,1fr))', gap:'7px 16px' }}>
                {nwBreakdown.map(b => (
                  <div key={b.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:b.color, flexShrink:0 }}/>
                    <span style={{ fontSize:10.5, color:'var(--dim)' }}>{b.label}</span>
                    <span style={{ marginLeft:'auto', fontFamily:MONO, fontSize:11, fontWeight:700 }}>{fmtL(b.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Asset-class tiles ──────────────────────────────── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:18 }}>
        <AssetTile href="/dashboard/portfolio" icon={I.bars}   label="Equity Stocks" value={String(equityH.length)} sub={`${fmtL(equityInvested)} invested`}
          pl={hasPrices && equityInvested > 0 ? equityPLPct : null} />
        <AssetTile href="/dashboard/etf-mf"    icon={I.bank}   label="ETF & MF"      value={String(etfH.length)}    sub={etfInvested > 0 ? `${fmtL(etfInvested)} invested` : 'No funds held'}
          pl={hasPrices && etfInvested > 0 ? etfPLPct : null} />
        {hasUSHoldings ? (
          <AssetTile href="/dashboard/us-portfolio" icon={I.globe} label="US Stocks" value={fmtL(usInrEquiv)} sub={`${usHoldings.length} stocks · $${usInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`}
            pl={usPLPct} />
        ) : (
          <AssetTile href="/dashboard/us-portfolio" icon={I.globe} label="US Stocks" value="—" sub="Add US stocks" />
        )}
        {fxPos.length > 0 && (
          <AssetTile href="/dashboard/forex"       icon={I.flow}   label="Forex"       value={fmtL(fxCurrentINR)} sub={`${fxPos.length} position${fxPos.length > 1 ? 's' : ''}`}
            pl={fxInvestedINR > 0 ? fxPLPct : null} />
        )}
        {cmPos.length > 0 && (
          <AssetTile href="/dashboard/commodities" icon={I.coin}   label="Commodities" value={fmtL(cmCurrentINR)} sub={`${cmPos.length} position${cmPos.length > 1 ? 's' : ''}`}
            pl={cmInvestedINR > 0 ? cmPLPct : null} />
        )}
      </div>

      {/* ── Market brief + mood ────────────────────────────── */}
      <div className="g-brief2" style={{ display:'grid', gap:14, marginBottom:16, alignItems:'stretch' }}>
        <MarketBrief />
        <MarketMoodIndex />
      </div>

      {/* ── Main 2-col: portfolio focus | market context rail ── */}
      <div className="dash-main-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>

          {/* Portfolio heatmap */}
          {(heatTilesIN.length > 0 || heatTilesUS.length > 0) && (
            <div style={panel}>
              <SectionLabel right={
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)' }}>
                    {pricesLoading ? 'LOADING…' : `${heatTiles.filter(h => heatPrices[h.symbol]?.change_pct != null).length}/${heatTiles.length} LIVE`}
                  </span>
                  {heatTilesUS.length > 0 && (
                    <div style={{ display:'flex', border:'1px solid var(--bdr)', borderRadius:7, padding:2 }}>
                      {(['IN','US'] as const).map(r => (
                        <button key={r} onClick={() => setHeatRegion(r)}
                          style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:0.6, padding:'3px 10px', borderRadius:5, border:'none', cursor:'pointer',
                            background: activeHeatRegion === r ? 'rgba(59,108,255,0.16)' : 'transparent',
                            color: activeHeatRegion === r ? 'var(--bluL)' : 'var(--dim)' }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              }>
                Portfolio Heatmap · Size = weight, color = daily Δ
              </SectionLabel>
              <TreemapHeatmap
                height={420}
                items={heatTiles.map(h => ({
                  symbol:    h.symbol,
                  value:     h.avg_price * h.qty,
                  changePct: heatPrices[h.symbol]?.change_pct ?? null,
                }))}
              />
            </div>
          )}

          {/* Recent scan picks — terminal table */}
          {scanPicks.length > 0 && (
            <div style={panel}>
              <SectionLabel right={<Link href="/dashboard/signals" style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:MONO, fontSize:11, color:'var(--bluL)', fontWeight:700 }}>FULL SCAN <Icon p={I.arrow} s={10} /></Link>}>
                Recent Scan Picks · Strong momentum
              </SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 100px 56px 64px', padding:'0 2px 6px', borderBottom:'1px solid var(--bdr)' }}>
                {['SYMBOL','PRICE','RSI','SCANNED'].map((h, i) => (
                  <span key={h} style={{ fontFamily:MONO, fontSize:8.5, fontWeight:700, letterSpacing:1, color:'var(--dim2)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</span>
                ))}
              </div>
              {scanPicks.map((p, i) => (
                <div key={`${p.symbol}-${i}`} onClick={() => setDetailSym({ symbol: p.symbol, exchange: p.exchange })}
                  className="trow"
                  style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 100px 56px 64px', alignItems:'center', padding:'9px 2px', borderBottom: i < scanPicks.length - 1 ? '1px solid var(--bdr)' : 'none', cursor:'pointer', borderRadius:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <span style={{ fontFamily:MONO, fontSize:12.5, fontWeight:700, letterSpacing:-0.2 }}>{p.symbol}</span>
                    <span style={{ fontFamily:MONO, fontSize:8, fontWeight:700, letterSpacing:0.8, color:'var(--grn)', border:'1px solid rgba(27,201,138,0.35)', borderRadius:4, padding:'1.5px 5px' }}>STRONG</span>
                  </div>
                  <span style={{ fontFamily:MONO, fontSize:12, fontWeight:700, textAlign:'right' }}>₹{Number(p.price_at).toLocaleString('en-IN', { maximumFractionDigits:2 })}</span>
                  <span style={{ fontFamily:MONO, fontSize:12, fontWeight:700, textAlign:'right', color: p.rsi14 == null ? 'var(--dim2)' : p.rsi14 < 45 ? 'var(--grn)' : p.rsi14 > 65 ? 'var(--red)' : 'var(--ylw)' }}>
                    {p.rsi14 != null ? Number(p.rsi14).toFixed(0) : '—'}
                  </span>
                  <span style={{ fontFamily:MONO, fontSize:10, color:'var(--dim2)', textAlign:'right' }}>{new Date(p.scanned_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }).toUpperCase()}</span>
                </div>
              ))}
              <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:10, letterSpacing:0.3 }}>⚠️ NOT SEBI REGISTERED · ALGORITHMIC SCAN OUTPUT — NOT INVESTMENT ADVICE · DYOR</div>
            </div>
          )}

          {/* Portfolio composition insights — numbered editorial list */}
          {insights.length > 0 && (
            <div style={panel}>
              <SectionLabel right={<span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, color:'var(--org)', border:'1px solid rgba(255,122,61,0.35)', borderRadius:4, padding:'2px 7px' }}>SCREENER</span>}>
                Portfolio Composition Metrics
              </SectionLabel>
              {insights.map((ins, i) => (
                <div key={i} style={{ display:'flex', gap:14, padding:'11px 0', borderTop: i > 0 ? '1px solid var(--bdr)' : 'none' }}>
                  <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:'var(--dim2)', flexShrink:0, paddingTop:2, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:ins.accent, display:'inline-block' }}/>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ fontSize:12.5, color:'var(--txt)', lineHeight:1.65 }}>{ins.text}</div>
                </div>
              ))}
              <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:12, letterSpacing:0.3 }}>⚠️ NOT SEBI REGISTERED · STATISTICAL OBSERVATIONS, NOT FINANCIAL ADVICE · DYOR</div>
            </div>
          )}

          {/* ETF & MF breakdown */}
          {etfH.length > 0 && (
            <div style={panel}>
              <SectionLabel right={<Link href="/dashboard/etf-mf" style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:MONO, fontSize:11, color:'var(--bluL)', fontWeight:700 }}>ETF / MF <Icon p={I.arrow} s={10} /></Link>}>
                ETF & MF Holdings
              </SectionLabel>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {[...etfH].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty).map(h => {
                  const p    = prices[h.symbol]?.price;
                  const ratio = p != null ? p / h.avg_price : null;
                  const plPct = (p != null && ratio != null && ratio > 0.02 && ratio < 50)
                    ? (p - h.avg_price) / h.avg_price * 100 : null;
                  return (
                    <div key={h.symbol} style={{ border:'1px solid var(--bdr)', borderRadius:9, padding:'8px 13px', minWidth:108 }}>
                      <div style={{ fontSize:11.5, fontWeight:700, fontFamily:MONO }}>{h.symbol}</div>
                      <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:2, fontFamily:MONO }}>{fmtL(h.avg_price * h.qty)}</div>
                      {plPct != null ? (
                        <div style={{ fontSize:10.5, fontWeight:700, marginTop:2, fontFamily:MONO, color: plPct >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                          {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                        </div>
                      ) : <div style={{ fontSize:10, color:'var(--dim2)', marginTop:2 }}>—</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right rail — market context ── */}
        <div className="rail-stack">
          <HomeFIIDII today={fiiData} loading={fiiLoading} />
          <HomeSectorPerf data={mktData} loading={mktLoading} />

          {/* Market cap mix */}
          <div style={panel}>
            <SectionLabel>Market Cap Mix</SectionLabel>
            {capSegments.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', padding:'20px 0' }}>—</div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:14 }}>
                  <DonutChart segments={capSegments} />
                  <div style={{ fontSize:12.5, fontWeight:700, marginTop:2, fontFamily:MONO }}>{mergedIndia.length} holdings</div>
                  <div style={{ fontSize:10.5, color:'var(--dim2)', fontFamily:MONO }}>{portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {capSegments.map(s => {
                    const pct = capTotal > 0 ? s.value / capTotal * 100 : 0;
                    return (
                      <div key={s.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:7, height:7, borderRadius:2, background:s.color, flexShrink:0 }}/>
                            <span style={{ color:'var(--dim)' }}>{s.label}</span>
                          </div>
                          <span style={{ fontWeight:700, fontFamily:MONO }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ height:3, background:'var(--surf2)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:2 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <VixExplainer />
          <DxyExplainer />
        </div>
      </div>

      {/* ── Explore — bare mono links ──────────────────────── */}
      <div style={{ marginTop:22, marginBottom:14 }}>
        <SectionLabel>Explore</SectionLabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'10px 24px' }}>
          {[
            { href:'/dashboard/signals',                 label:'ML Scan'       },
            { href:'/dashboard/signals?tab=fundamental', label:'Fundamentals'  },
            { href:'/dashboard/dividends',               label:'Dividends'     },
            { href:'/dashboard/paper-trading',           label:'Paper Trading' },
            { href:'/dashboard/sectors',                 label:'Sectors'       },
            { href:'/dashboard/fii-dii',                 label:'FII / DII'     },
            { href:'/dashboard/watchlist',               label:'Watchlist'     },
            { href:'/dashboard/track-record',            label:'Track Record'  },
          ].map(l => (
            <Link key={l.href} href={l.href}
              style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:MONO, fontSize:11.5, fontWeight:500, color:'var(--dim)', textDecoration:'none', letterSpacing:0.3 }}>
              {l.label} <Icon p={I.arrow} s={10} />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Compliance footer ──────────────────────────────── */}
      <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim2)', borderTop:'1px solid var(--bdr)', paddingTop:13, letterSpacing:0.3 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · THIS IS A TECHNICAL SCREENING TOOL · SCAN RESULTS ARE COMPUTED INDICATORS, NOT INVESTMENT ADVICE · DYOR
      </div>

      {detailSym && (
        <StockDetailSheet
          symbol={detailSym.symbol}
          exchange={detailSym.exchange}
          onClose={() => setDetailSym(null)}
        />
      )}
    </>
  );
}
