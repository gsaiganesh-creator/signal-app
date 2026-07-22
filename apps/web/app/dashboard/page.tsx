'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';
import { useState, useEffect } from 'react';
import { TreemapHeatmap } from '@/components/TreemapHeatmap';
import { MarketBrief } from '@/components/MarketBrief';
import { MarketMoodIndex } from '@/components/MarketMoodIndex';
import { VixExplainer } from '@/components/VixExplainer';
import { DxyExplainer } from '@/components/DxyExplainer';
import { StockDetailSheet } from '@/components/StockDetailSheet';
import { useIsNativePlatform } from '@/lib/use-is-native';
import { AnimatedCount } from '@/lib/animated-count';

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
// `compact` (native-app-only) tightens padding/radius for the KPI strip cards —
// web keeps the original 18/20px padding + 16px radius always. See DashboardPage
// for the useIsNativePlatform() gate that decides which value gets passed in.
// v2: pushed to real trading-app tile density (7/8px padding, 10px radius)
// per founder feedback on an actual device — v1's 10/12px was still too
// close to a shrunk desktop card.
const colorCard = (grad: string, bdr: string, compact = false): React.CSSProperties => ({
  background: grad, border:`1px solid ${bdr}`, borderRadius: compact ? 10 : 16, padding: compact ? '7px 8px' : '18px 20px',
  backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)',
});

// ── Visual FX (dashboard home summary widgets only) ─────────────────────────
// Same standing shimmer + roll-up-count pattern shipped on the Signals page
// (see SIGFX_CLASS/sigfxDelayStyle/AnimatedCount there). Reused here, scoped
// to the small set of genuine aggregate/summary tiles on this page — the KPI
// strip, the Forex/Commodities mini totals, and the Market Cap Mix donut's
// holdings count. Deliberately NOT applied to any per-item list (holdings,
// sectors, scan picks, ETF chips) per the founder's correction after the
// Signals page pilot: shimmer/roll-up is for widgets that summarize MANY
// things into one number, never for one-row-per-item content.
const SIGFX_CLASS = 'sigfx-shimmer';
function sigfxDelayStyle(index: number): Record<string, string> {
  return { '--sigfx-delay': `${Math.min(index, 10) * 55}ms` };
}

// AnimatedCount now lives in lib/animated-count.tsx (imported above) so
// MarketMoodIndex.tsx can reuse the exact same roll-up instead of a second
// reimplementation — this file used to define it locally.

// Small animated currency badge — a coin that drops/settles in on mount, then
// spins gently on its Y-axis forever (a real 3D `rotateY`, not a scale trick —
// see .coin-badge-outer/.coin-badge-spin in globals.css). Gold for ₹ (India
// cards), green "greenback" for $ (US Stocks card), so the currency reads at
// a glance even before the number next to it registers. Two nested spans:
// the outer plays the one-shot drop-in bounce (translateY), the inner plays
// the continuous spin (rotateY) — kept on separate elements because CSS
// doesn't compose two `transform` keyframe animations on the same property.
function CoinBadge({ cur, native, small }: { cur: 'INR' | 'USD'; native?: boolean; small?: boolean }) {
  const symbol = cur === 'INR' ? '₹' : '$';
  const size = native ? (small ? 9 : 12) : (small ? 12 : 15);
  const grad = cur === 'INR'
    ? 'linear-gradient(145deg,#FFE9A8,#FFB800 55%,#C98A00)'
    : 'linear-gradient(145deg,#B9F5D8,#00D4A0 55%,#00916E)';
  const faceStyle: React.CSSProperties = { background:grad, fontSize:size*0.62 };
  return (
    <span className="coin-badge-outer" style={{ width:size, height:size, marginRight: native ? 3 : 5 }} aria-hidden="true">
      <span className="coin-badge-spin" style={{ width:size, height:size }}>
        <span className="coin-badge-face coin-badge-face--front" style={faceStyle}>{symbol}</span>
        <span className="coin-badge-face coin-badge-face--back" style={faceStyle}>{symbol}</span>
      </span>
    </span>
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

const MKT_INDICES = [
  { name:'NIFTY 50',   ticker:'^NSEI'   },
  { name:'SENSEX',     ticker:'^BSESN'  },
  { name:'BANK NIFTY', ticker:'^NSEBANK'},
  { name:'NIFTY IT',   ticker:'^CNXIT'  },
];

type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;
type FiiRow   = { fii_net: number; dii_net: number; date: string };

function MarketOverview({ data, loading }: { data: PriceMap; loading: boolean }) {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Market Overview</div>
        {loading
          ? <span style={{ fontSize:11, color:'var(--dim)' }}>loading…</span>
          : <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span>}
      </div>
      <div className="g2" style={{ display:'grid', gap:8 }}>
        {MKT_INDICES.map(m => {
          const d   = data[m.ticker];
          const chg = d?.change_pct ?? null;
          const up  = chg == null ? true : chg >= 0;
          return (
            <div key={m.name} className="hover-lift" style={{
              background: up ? 'linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.03))' : 'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.03))',
              border: `1px solid ${up ? 'rgba(0,212,160,0.28)' : 'rgba(255,59,92,0.25)'}`,
              borderLeft: `3px solid ${up ? 'var(--grn)' : 'var(--red)'}`,
              borderRadius:10, padding:'10px 13px',
            }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:2 }}>{m.name}</div>
              {loading
                ? <div style={{ width:80, height:22, borderRadius:5, background:'var(--surf2)', marginBottom:4 }}/>
                : <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.5 }}>{d?.price != null ? d.price.toLocaleString('en-IN',{maximumFractionDigits:0}) : '—'}</div>}
              <div style={{ fontSize:11, fontWeight:700, marginTop:2, color: up ? 'var(--grn)' : 'var(--red)' }}>
                {!loading && (chg != null ? `${up?'▲':'▼'} ${chg>=0?'+':''}${chg.toFixed(2)}%` : '—')}
              </div>
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
        { label:'FII (Foreign Inst.)', net:today.fii_net },
        { label:'DII (Domestic Inst.)', net:today.dii_net },
      ]
    : [];

  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>FII / DII Flow</div>
        {loading
          ? <span style={{ fontSize:11, color:'var(--dim)' }}>loading…</span>
          : today
            ? <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span>
            : <span style={{ fontSize:10, color:'var(--dim)', padding:'2px 8px', background:'var(--surf2)', borderRadius:6 }}>NSE unavailable</span>}
      </div>
      {loading && <div style={{ height:60, background:'var(--surf2)', borderRadius:8, marginBottom:10 }}/>}
      {!loading && rows.map(f => (
        <div key={f.label} style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
            <span style={{ fontWeight:600 }}>{f.label}</span>
            <span style={{ fontWeight:800, color: f.net>=0 ? 'var(--grn)' : 'var(--red)' }}>{cr(f.net)}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.round(Math.abs(f.net)/maxAbs*100)}%`, background: f.net>=0 ? 'var(--grn)' : 'var(--red)', borderRadius:3 }}/>
          </div>
        </div>
      ))}
      {!loading && !today && (
        <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', padding:'8px 0' }}>NSE data unavailable — check back after 6 PM IST</div>
      )}
      <Link href="/dashboard/fii-dii" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full FII/DII data →</Link>
    </div>
  );
}

const SIDEBAR_SECTORS = [
  { name:'IT',      ticker:'^CNXIT'    },
  { name:'Auto',    ticker:'^CNXAUTO'  },
  { name:'Banking', ticker:'^NSEBANK'  },
  { name:'Metal',   ticker:'^CNXMETAL' },
];

function HomeSectorPerf({ data, loading }: { data: PriceMap; loading: boolean }) {
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Sector Performance</div>
        {!loading && <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><span className="live-dot"/>LIVE</span>}
      </div>
      {SIDEBAR_SECTORS.map(s => {
        const chg = data[s.ticker]?.change_pct ?? null;
        const up  = chg == null ? null : chg >= 0;
        return (
          <div key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(28,46,74,0.3)' }}>
            <span style={{ color:'var(--dim)' }}>{s.name}</span>
            {loading
              ? <span style={{ width:40, height:12, background:'var(--surf2)', borderRadius:3, display:'inline-block' }}/>
              : <span style={{ fontWeight:700, color: up === null ? 'var(--dim)' : up ? 'var(--grn)' : 'var(--red)' }}>
                  {chg != null ? `${chg>=0?'+':''}${chg.toFixed(2)}%` : '—'}
                </span>}
          </div>
        );
      })}
      <Link href="/dashboard/sectors" style={{ display:'block', marginTop:10, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full heatmap →</Link>
    </div>
  );
}

function WelcomeEmpty({ name, email, mktData, mktLoading }: { name: string; email?: string; mktData: PriceMap; mktLoading: boolean }) {
  return (
    <>
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.25)', borderRadius:30, padding:'6px 14px', marginBottom:20 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--grn)' }}/>
        <span style={{ fontSize:12, color:'var(--grn)', fontWeight:600 }}>Signed in{email ? ` as ${email}` : ''}</span>
      </div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Welcome to SignalGenie. Upload your portfolio to unlock technical scan results and P&L tracking.</div>
      </div>
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>📂 Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Add your holdings once — SignalGenie tracks P&L, scan results and risk metrics automatically.</div>
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
      <MarketOverview data={mktData} loading={mktLoading} />
    </>
  );
}

export default function DashboardPage() {
  const { user, session, portfolios, loading } = usePortfolio();
  // Native-app-only compact sizing for the summary/KPI widgets — web stays at
  // its current (already comfortable) sizing regardless of this flag. See
  // colorCard()'s `compact` param and the inline isNative checks in the KPI
  // strip / Forex+Commodities strip / Market Cap Mix card below.
  const isNative = useIsNativePlatform();
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
  // Market sidebar data — indices + sectors in one batch call
  const [mktData,    setMktData]    = useState<PriceMap>({});
  const [mktLoading, setMktLoading] = useState(true);
  const [fiiData,    setFiiData]    = useState<FiiRow | null>(null);
  const [fiiLoading, setFiiLoading] = useState(true);

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

  if (portfolios.length === 0) return <WelcomeEmpty name={name} email={user.email} mktData={mktData} mktLoading={mktLoading} />;

  const fmtL = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(2)}L` : `₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  // Native-only compact sizing for the summary widgets below (KPI strip,
  // Forex+Commodities mini totals, Market Cap Mix). Web values (right side
  // of each ternary) are the pre-existing sizes, untouched — this rule does
  // not move. v2 (round 2, per founder feedback on a real device: "can we
  // have the widgets/pills smaller, this is what i was asking from long
  // time") pushes the native branch to actual trading-app tile density
  // (Kite/Groww KPI-tile scale) instead of a lightly-shrunk desktop card —
  // every dimension in the KPI card (padding, radius, icon, headline number,
  // label, subtitle, % badge, inter-element margins) now has its own native
  // value, not just the three that got a v1 pass.
  const kpiGap        = isNative ? 5      : 12;
  const kpiNumBig      = isNative ? 16     : 32; // Equity / ETF / Total Invested / Combined Return
  const kpiNumSmall    = isNative ? 13     : 28; // Net Worth / US Stocks
  const kpiIconBox     = isNative ? 14     : 26;
  const kpiIconFont    = isNative ? 8      : 13;
  const kpiLabelSize   = isNative ? 7      : 10;
  const kpiSubSize     = isNative ? 8      : 11; // "invested" / "portfolios" subtitle line
  const kpiBadgeSize   = isNative ? 9      : 13; // ▲/▼ % change badge
  const kpiSmallSub    = isNative ? 7      : 10; // Net Worth / US Stocks secondary lines
  const kpiIconRowGap  = isNative ? 4      : 7;
  const kpiIconRowMB   = isNative ? 5      : 10;
  const kpiSubMT       = isNative ? 2      : 5;
  const kpiBadgeMT     = isNative ? 2      : 4;

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

  const capDist = { large:0, mid:0, small:0, etf:0 };
  for (const h of mergedIndia) capDist[capCat(h.symbol)] += h.avg_price * h.qty;
  const capTotal = Object.values(capDist).reduce((s, v) => s + v, 0);
  const capSegments = [
    { label:'Large Cap', value:capDist.large, color:'#4F6FFA' },
    { label:'Mid Cap',   value:capDist.mid,   color:'#00D4A0' },
    { label:'Small Cap', value:capDist.small, color:'#FF5C1A' },
    { label:'ETF / MF',  value:capDist.etf,   color:'#8B5CF6' },
  ].filter(s => s.value > 0);

  const insights    = buildInsights(mergedIndia);
  const heatTilesIN = [...mergedIndia].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);
  const heatTilesUS = [...usHoldings].sort((a, b) => b.avg_price * b.qty - a.avg_price * a.qty);
  const activeHeatRegion = heatRegion === 'US' && heatTilesUS.length > 0 ? 'US' : 'IN';
  const heatTiles = activeHeatRegion === 'US' ? heatTilesUS : heatTilesIN;
  const heatPrices = activeHeatRegion === 'US' ? usPrices : prices;

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


      {/* KPI strip — India + Net Worth + US all in one row. These 6 cards are
          the page's genuine aggregate/summary tiles (each rolls up N holdings
          / N positions into one number), so they carry the standing shimmer
          fx + AnimatedCount roll-up, and (native app only) compact sizing. */}
      <div className="g6" style={{ display:'grid', gap:kpiGap, marginBottom:14 }}>
        {/* Equity */}
        <Link href="/dashboard/portfolio" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 6px 24px rgba(79,111,250,0.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
          <div className={`kpi-card ${SIGFX_CLASS}`} style={{ ...colorCard('linear-gradient(135deg,rgba(23,64,245,0.13),rgba(79,111,250,0.06))','rgba(79,111,250,0.28)', isNative), height:'100%', boxSizing:'border-box', ...sigfxDelayStyle(0) }}>
            <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
              <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:'rgba(79,111,250,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>📈</div>
              <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:'var(--bluL)', letterSpacing:0.5, textTransform:'uppercase' }}>Equity Stocks</div>
            </div>
            <div className="kpi-num" style={{ fontSize:kpiNumBig, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}><AnimatedCount value={equityH.length} /></div>
            <div style={{ fontSize:kpiSubSize, color:'var(--dim)', marginTop:kpiSubMT }}><CoinBadge cur="INR" native={isNative} />{fmtL(equityInvested)} invested</div>
            {hasPrices && equityInvested > 0 && (
              <div style={{ fontSize:kpiBadgeSize, fontWeight:800, marginTop:kpiBadgeMT, color: equityPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                {equityPL >= 0 ? '▲' : '▼'} {equityPL >= 0 ? '+' : ''}{equityPLPct.toFixed(1)}%
              </div>
            )}
          </div>
        </Link>
        {/* ETF & MF */}
        <Link href="/dashboard/etf-mf" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 6px 24px rgba(139,92,246,0.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
          <div className={`kpi-card ${SIGFX_CLASS}`} style={{ ...colorCard('linear-gradient(135deg,rgba(139,92,246,0.14),rgba(139,92,246,0.04))','rgba(139,92,246,0.3)', isNative), height:'100%', boxSizing:'border-box', ...sigfxDelayStyle(1) }}>
            <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
              <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:'rgba(139,92,246,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>🏦</div>
              <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:'var(--pur)', letterSpacing:0.5, textTransform:'uppercase' }}>ETF & MF</div>
            </div>
            <div className="kpi-num" style={{ fontSize:kpiNumBig, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}><AnimatedCount value={etfH.length} /></div>
            <div style={{ fontSize:kpiSubSize, color:'var(--dim)', marginTop:kpiSubMT }}><CoinBadge cur="INR" native={isNative} />{etfInvested > 0 ? fmtL(etfInvested) : '—'} invested</div>
            {hasPrices && etfInvested > 0 && (
              <div style={{ fontSize:kpiBadgeSize, fontWeight:800, marginTop:kpiBadgeMT, color: etfPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                {etfPL >= 0 ? '▲' : '▼'} {etfPL >= 0 ? '+' : ''}{etfPLPct.toFixed(1)}%
              </div>
            )}
          </div>
        </Link>
        {/* Total Invested */}
        <Link href="/dashboard/portfolio" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 6px 24px rgba(0,212,160,0.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
          <div className={`kpi-card ${SIGFX_CLASS}`} style={{ ...colorCard('linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,180,130,0.04))','rgba(0,212,160,0.28)', isNative), height:'100%', boxSizing:'border-box', ...sigfxDelayStyle(2) }}>
            <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
              <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:'rgba(0,212,160,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>💼</div>
              <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:'var(--grn)', letterSpacing:0.5, textTransform:'uppercase' }}>Total Invested</div>
            </div>
            <div className="kpi-num" style={{ fontSize:kpiNumBig, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--txt)' }}><CoinBadge cur="INR" native={isNative} /><AnimatedCount value={invested} format={fmtL} /></div>
            <div style={{ fontSize:kpiSubSize, color:'var(--dim)', marginTop:kpiSubMT }}>
              {portfolios.length} portfolio{portfolios.length > 1 ? 's' : ''} · India
            </div>
          </div>
        </Link>
        {/* Combined Return */}
        {(() => {
          const up = !hasPrices || totalPLPct >= 0;
          return (
            <Link href="/dashboard/portfolio" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 6px 24px ${up?'rgba(0,212,160,0.18)':'rgba(255,59,92,0.18)'}`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
              <div style={{ ...colorCard(
                up ? 'linear-gradient(135deg,rgba(0,212,160,0.14),rgba(0,212,160,0.04))' : 'linear-gradient(135deg,rgba(255,59,92,0.12),rgba(255,59,92,0.03))',
                up ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.28)',
                isNative
              ), height:'100%', boxSizing:'border-box', ...sigfxDelayStyle(3) }} className={`kpi-card ${SIGFX_CLASS}`}>
                <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
                  <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:up?'rgba(0,212,160,0.18)':'rgba(255,59,92,0.14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>{up?'🚀':'📉'}</div>
                  <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:up?'var(--grn)':'var(--red)', letterSpacing:0.5, textTransform:'uppercase' }}>Combined Return</div>
                </div>
                <div className="kpi-num" style={{ fontSize:kpiNumBig, fontWeight:900, letterSpacing:-1, lineHeight:1, color: hasPrices ? (totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
                  {hasPrices ? <AnimatedCount value={totalPLPct} format={fmtPct} /> : '—'}
                </div>
                <div style={{ fontSize:kpiSubSize, color:'var(--dim)', marginTop:kpiSubMT }}>
                  {hasPrices && totalPL !== 0 ? `${totalPL >= 0 ? '+' : ''}${fmtL(Math.abs(totalPL))}` : pricesLoading ? 'loading…' : '—'}
                </div>
              </div>
            </Link>
          );
        })()}

        {/* Combined Net Worth */}
        <Link href="/dashboard/us-portfolio" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 6px 24px rgba(0,212,160,0.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
          <div className={`kpi-card ${SIGFX_CLASS}`} style={{ ...colorCard('linear-gradient(135deg,rgba(0,212,160,0.16),rgba(23,64,245,0.07))','rgba(0,212,160,0.32)', isNative), height:'100%', ...sigfxDelayStyle(4) }}>
            <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
              <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:'rgba(0,212,160,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>🌐</div>
              <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:'var(--grn)', letterSpacing:0.5, textTransform:'uppercase' }}>Net Worth</div>
            </div>
            <div className="kpi-num" style={{ fontSize:kpiNumSmall, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'var(--grn)' }}><CoinBadge cur="INR" native={isNative} /><AnimatedCount value={combinedINR} format={fmtL} /></div>
            <div style={{ fontSize:kpiSmallSub, color:'var(--dim)', marginTop:kpiSubMT }}>
              🇮🇳{fmtL(invested)} + 🇺🇸{fmtL(usInrEquiv)}
              {fxPos.length>0?` + 💱${fmtL(fxCurrentINR)}`:''}
            </div>
            {usdInr && <div style={{ fontSize:kpiSmallSub, color:'var(--dim)', marginTop:2 }}>₹{usdInr.toFixed(1)} USD/INR{hasRSU ? ` · RSU ₹${(rsuValueINR/1e5).toFixed(1)}L` : ''}</div>}
          </div>
        </Link>

        {/* US Stocks */}
        <Link href="/dashboard/us-portfolio" style={{ textDecoration:'none', display:'block', borderRadius:16, transition:'transform 0.15s,box-shadow 0.15s' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 6px 24px rgba(79,111,250,0.18)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}>
          {hasUSHoldings ? (
            <div className={`kpi-card ${SIGFX_CLASS}`} style={{ ...colorCard('linear-gradient(135deg,rgba(79,111,250,0.14),rgba(23,64,245,0.05))','rgba(79,111,250,0.30)', isNative), height:'100%', ...sigfxDelayStyle(5) }}>
              <div style={{ display:'flex', alignItems:'center', gap:kpiIconRowGap, marginBottom:kpiIconRowMB }}>
                <div className="kpi-icon" style={{ width:kpiIconBox, height:kpiIconBox, borderRadius:7, background:'rgba(79,111,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:kpiIconFont }}>🇺🇸</div>
                <div style={{ fontSize:kpiLabelSize, fontWeight:700, color:'var(--bluL)', letterSpacing:0.5, textTransform:'uppercase' }}>US Stocks</div>
              </div>
              <div className="kpi-num" style={{ fontSize:kpiNumSmall, fontWeight:900, letterSpacing:-1, lineHeight:1 }}><CoinBadge cur="USD" native={isNative} /><AnimatedCount value={usInrEquiv} format={fmtL} /></div>
              <div style={{ fontSize:kpiSmallSub, color:'var(--dim)', marginTop:kpiSubMT }}><CoinBadge cur="USD" native={isNative} small />${usInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})} invested · {usHoldings.length} stocks</div>
              {usPLPct!=null && (
                <div style={{ fontSize:kpiBadgeSize, fontWeight:800, marginTop:kpiBadgeMT, color:usPLPct>=0?'var(--grn)':'var(--red)' }}>
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

      {/* Market brief + MMI — below KPIs */}
      <div className="g-brief" style={{ display:'grid', gap:14, marginBottom:14, alignItems:'stretch' }}>
        <MarketBrief />
        <MarketMoodIndex />
      </div>

      {/* VIX + DXY explainers — raw fear-gauge and dollar-strength readings */}
      <div className="g2" style={{ display:'grid', gap:14, marginBottom:14, alignItems:'start' }}>
        <VixExplainer />
        <DxyExplainer />
      </div>

      {/* Recent scan picks */}
      {scanPicks.length > 0 && (
        <div style={{ ...card, marginBottom:16, borderColor:'rgba(0,212,160,0.22)', background:'linear-gradient(135deg,rgba(0,212,160,0.06),var(--card-bg))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'rgba(0,212,160,0.14)', border:'1px solid rgba(0,212,160,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🤖</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800 }}>Recent Scan Picks</div>
                <div style={{ fontSize:11, color:'var(--dim)' }}>Latest strong momentum · algorithmic scan output</div>
              </div>
            </div>
            <Link href="/dashboard/signals" style={{ fontSize:11, color:'var(--grn)', fontWeight:700, textDecoration:'none', padding:'4px 12px', border:'1px solid rgba(0,212,160,0.3)', borderRadius:8 }}>Full Scan →</Link>
          </div>
          <div className="g3" style={{ display:'grid', gap:10, marginBottom:10 }}>
            {scanPicks.slice(0, 3).map((p, i) => (
              <div key={`${p.symbol}-${i}`} onClick={() => setDetailSym({ symbol: p.symbol, exchange: p.exchange })}
                style={{ cursor:'pointer', background:'rgba(0,212,160,0.07)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:12, padding:'14px 15px', display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:14, fontWeight:900, letterSpacing:-0.3 }}>{p.symbol}</div>
                  <div style={{ fontSize:9, fontWeight:800, color:'var(--grn)', background:'rgba(0,212,160,0.12)', border:'1px solid rgba(0,212,160,0.3)', borderRadius:6, padding:'2px 7px', textTransform:'uppercase' as const, letterSpacing:0.5 }}>Strong</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700 }}>₹{Number(p.price_at).toLocaleString('en-IN', { maximumFractionDigits:2 })}</div>
                {p.rsi14 != null && (
                  <div style={{ fontSize:10, color:'var(--dim)' }}>
                    RSI <span style={{ color: p.rsi14 < 45 ? 'var(--grn)' : p.rsi14 > 65 ? 'var(--red)' : 'var(--ylw)', fontWeight:700 }}>{Number(p.rsi14).toFixed(0)}</span>
                    <span style={{ marginLeft:6, color:'var(--dim2)' }}>· {p.exchange}</span>
                  </div>
                )}
                <div style={{ fontSize:9, color:'var(--dim2)', marginTop:2 }}>{new Date(p.scanned_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--dim2)' }}>⚠️ NOT SEBI REGISTERED · Algorithmic scan output — not investment advice · DYOR</div>
        </div>
      )}

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


      {/* Forex + Commodities mini strip (only if positions exist) — each tile
          sums N positions into one total, same "aggregate" shape as the KPI
          strip above, so it gets the same shimmer + roll-up + native-compact treatment. */}
      {(fxPos.length > 0 || cmPos.length > 0) && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {fxPos.length > 0 && (
            <Link href="/dashboard/forex" style={{ textDecoration:'none', flex:1, minWidth:200 }}>
              <div className={SIGFX_CLASS} style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.09),rgba(0,212,160,0.02))', border:'1px solid rgba(0,212,160,0.24)', borderRadius: isNative ? 12 : 14, padding: isNative ? '9px 12px' : '12px 16px', display:'flex', alignItems:'center', gap: isNative ? 9 : 12, ...sigfxDelayStyle(6) }}>
                <span style={{ fontSize: isNative ? 16 : 20 }}>💱</span>
                <div>
                  <div style={{ fontSize: isNative ? 9 : 10, fontWeight:700, color:'var(--grn)', textTransform:'uppercase', letterSpacing:0.5 }}>Forex</div>
                  <div style={{ fontSize: isNative ? 13 : 16, fontWeight:800 }}><AnimatedCount value={fxCurrentINR} format={fmtL} /></div>
                  <div style={{ fontSize:10, color:fxPL>=0?'var(--grn)':'var(--red)', fontWeight:700 }}>{fxPL>=0?'+':''}{fmtL(Math.abs(fxPL))} ({fxPLPct.toFixed(1)}%)</div>
                </div>
              </div>
            </Link>
          )}
          {cmPos.length > 0 && (
            <Link href="/dashboard/commodities" style={{ textDecoration:'none', flex:1, minWidth:200 }}>
              <div className={SIGFX_CLASS} style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.09),rgba(255,184,0,0.02))', border:'1px solid rgba(255,184,0,0.24)', borderRadius: isNative ? 12 : 14, padding: isNative ? '9px 12px' : '12px 16px', display:'flex', alignItems:'center', gap: isNative ? 9 : 12, ...sigfxDelayStyle(7) }}>
                <span style={{ fontSize: isNative ? 16 : 20 }}>🥇</span>
                <div>
                  <div style={{ fontSize: isNative ? 9 : 10, fontWeight:700, color:'var(--ylw)', textTransform:'uppercase', letterSpacing:0.5 }}>Commodities</div>
                  <div style={{ fontSize: isNative ? 13 : 16, fontWeight:800 }}><AnimatedCount value={cmCurrentINR} format={fmtL} /></div>
                  <div style={{ fontSize:10, color:cmPL>=0?'var(--grn)':'var(--red)', fontWeight:700 }}>{cmPL>=0?'+':''}{fmtL(Math.abs(cmPL))} ({cmPLPct.toFixed(1)}%)</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

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

      <div style={{ marginBottom:16 }}>
        <HomeFIIDII today={fiiData} loading={fiiLoading} />
      </div>
      <div style={{ marginBottom:16 }}>
        <HomeSectorPerf data={mktData} loading={mktLoading} />
      </div>
      {/* Analytics: treemap heatmap + cap donut */}
      {(heatTilesIN.length > 0 || heatTilesUS.length > 0) && (
        <div className="g-analytics" style={{ display:'grid', gap:16, marginBottom:16, alignItems:'start' }}>
          {/* Treemap heatmap */}
          <div style={{ ...card, padding:'16px', borderColor:'rgba(0,212,160,0.2)', background:'linear-gradient(160deg,rgba(0,212,160,0.05),var(--card-bg))' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:'rgba(0,212,160,0.14)', border:'1px solid rgba(0,212,160,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔥</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800 }}>Portfolio Heatmap</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>
                    Size = weight · Color = daily Δ · {pricesLoading ? 'loading…' : `${heatTiles.filter(h => heatPrices[h.symbol]?.change_pct != null).length}/${heatTiles.length} live`}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {heatTilesUS.length > 0 && (
                  <div style={{ display:'flex', background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:20, padding:2 }}>
                    {(['IN','US'] as const).map(r => (
                      <button key={r} onClick={() => setHeatRegion(r)}
                        style={{ fontSize:10, fontWeight:800, padding:'4px 12px', borderRadius:18, border:'none', cursor:'pointer',
                          background: activeHeatRegion === r ? 'rgba(0,212,160,0.18)' : 'transparent',
                          color: activeHeatRegion === r ? 'var(--grn)' : 'var(--dim)' }}>
                        {r === 'IN' ? '🇮🇳 India' : '🇺🇸 US'}
                      </button>
                    ))}
                  </div>
                )}
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.25)', color:'var(--grn)' }}>● LIVE</span>
              </div>
            </div>
            <TreemapHeatmap
              height={420}
              items={heatTiles.map(h => ({
                symbol:    h.symbol,
                value:     h.avg_price * h.qty,
                changePct: heatPrices[h.symbol]?.change_pct ?? null,
              }))}
            />
          </div>

          {/* Market cap donut — a genuine summary tile (all India holdings
              rolled up into cap-tier %s + a total count), same category as
              the founder's "diversification score" example, so it gets the
              same fx/roll-up/native-compact treatment as the KPI strip. */}
          <div className={SIGFX_CLASS} style={{ ...card, ...(isNative ? { padding:'10px 12px', borderRadius:14 } : {}), ...sigfxDelayStyle(8) }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Market Cap Mix</div>
            {capSegments.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', padding:'20px 0' }}>—</div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:14 }}>
                  <DonutChart segments={capSegments} />
                  <div style={{ fontSize:13, fontWeight:900, marginTop:-4 }}><AnimatedCount value={mergedIndia.length} /> holdings</div>
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
      )}

      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Quick Links</div>
        <div className="g4" style={{ display:'grid', gap:8 }}>
          {[
            { href:'/dashboard/signals',                 icon:'📈', label:'ML Scan',          sub:'RSI + EMA screener',   grad:'rgba(23,64,245,0.10)',  bdr:'rgba(23,64,245,0.28)' },
            { href:'/dashboard/signals?tab=fundamental', icon:'📊', label:'Fundamentals',     sub:'PE · ROE · D/E screener', grad:'rgba(255,184,0,0.08)', bdr:'rgba(255,184,0,0.28)' },
            { href:'/dashboard/portfolio',               icon:'💼', label:'India Portfolio',   sub:'P&L · signals',        grad:'rgba(0,212,160,0.09)',  bdr:'rgba(0,212,160,0.25)' },
            { href:'/dashboard/us-portfolio',            icon:'🇺🇸', label:'US Portfolio',    sub:'USD stocks',            grad:'rgba(79,111,250,0.09)', bdr:'rgba(79,111,250,0.28)' },
            { href:'/dashboard/dividends',               icon:'💰', label:'Dividends',        sub:'Ex-dates · income',     grad:'rgba(0,212,160,0.09)',  bdr:'rgba(0,212,160,0.25)' },
            { href:'/dashboard/paper-trading',           icon:'🧪', label:'Paper Trading',     sub:'Risk-free strategies', grad:'rgba(139,92,246,0.09)', bdr:'rgba(139,92,246,0.28)' },
            { href:'/dashboard/sectors',                 icon:'🔥', label:'Sector Heatmap',    sub:'Hot sectors',          grad:'rgba(255,92,26,0.09)',  bdr:'rgba(255,92,26,0.28)' },
            { href:'/dashboard/fii-dii',                 icon:'🌍', label:'FII / DII Flow',    sub:'Institutional flow',   grad:'rgba(255,184,0,0.08)', bdr:'rgba(255,184,0,0.28)' },
            { href:'/dashboard/watchlist',                icon:'⭐', label:'Watchlist',        sub:'Saved stocks',          grad:'rgba(255,184,0,0.08)', bdr:'rgba(255,184,0,0.28)' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="hover-lift" style={{ display:'flex', flexDirection:'column', gap:2, padding:'12px 13px', background:`linear-gradient(135deg,${l.grad},transparent)`, border:`1px solid ${l.bdr}`, borderRadius:11, textDecoration:'none' }}>
              <span style={{ fontSize:18 }}>{l.icon}</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--txt)', marginTop:3 }}>{l.label}</span>
              <span style={{ fontSize:10, color:'var(--dim)' }}>{l.sub}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · This is a technical screening tool · Scan results are computed indicators, not investment advice · DYOR
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
