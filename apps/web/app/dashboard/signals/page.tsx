'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';
import { StockNews } from '@/components/StockNews';
import { usePlan } from '@/lib/use-plan';
import { ProGate } from '@/components/ProGate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsNativePlatform } from '@/lib/use-is-native';
import { SECTORS } from '@/lib/sectors';
import type { FundamentalSignal as FundamentalTopSignal } from '@/lib/india-fundamental-scan';

// Reverse symbol → sector lookup, built once. stock-detail doesn't return a
// sector field, so the portfolio-universe scan (unlike the ML Top 20 scan,
// which gets sector from config/universe.json server-side) needs this to
// avoid showing the literal word "Unknown" on every portfolio-scanned card.
const SYMBOL_SECTOR: Record<string, string> = Object.fromEntries(
  SECTORS.flatMap(s => s.stocks.map(sym => [sym, s.label]))
);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Types ─────────────────────────────────────────────────────────────────────
interface MLSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string;
  confidence: number; score: number;
  bias?: string | null;
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
interface FundDetail {
  trailing_pe: Num; forward_pe: Num; price_to_book: Num; ev_ebitda: Num;
  gross_margin: Num; operating_margin: Num; net_margin: Num; roe: Num;
  debt_to_equity: Num; current_ratio: Num; revenue_growth: Num; earnings_growth: Num;
  dividend_yield: Num; market_cap: Num;
  analyst_count: Num; analyst_consensus: string | null; analyst_target: Num; upside_to_target: Num;
  next_earnings_date: string | null; days_to_earnings: Num;
  quarterly_results: Array<{ quarter: string; revenue_cr: number | null; net_income_cr: number | null; net_margin: number | null }>;
  insider_pct: Num; institution_pct: Num; public_pct: Num;
}
interface PeerRow {
  symbol: string; name: string; price: Num; change_pct: Num;
  trailing_pe: Num; roe: Num; market_cap: Num;
}
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
interface USScanPick {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number; ema_dist_pct: number;
  entry_low: number; entry_high: number; target: number; sl: number;
  signal: string; confidence: number; score: number;
}
interface USSignal extends USScanPick {
  zone: 'Strong Momentum' | 'Building' | 'Sideways' | 'Weak / Declining' | 'N/A';
  detail: USDetail | null; // lazily populated when the row is clicked
}

// ── India helpers ─────────────────────────────────────────────────────────────
export interface ScanMeta { computed_at: string | null; next_run_at: string | null }
async function fetchScan<T>(url: string): Promise<{ signals: T[] } & ScanMeta> {
  try {
    const r = await fetch(url, { next: { revalidate: 0 } });
    if (!r.ok) return { signals: [], computed_at: null, next_run_at: null };
    const d = await r.json();
    return { signals: d.signals ?? [], computed_at: d.computed_at ?? null, next_run_at: d.next_run_at ?? null };
  } catch { return { signals: [], computed_at: null, next_run_at: null }; }
}
async function fetchTA(symbol: string): Promise<TADetail | null> {
  try {
    const r = await fetch(`/api/ml/signals/detail?ticker=${encodeURIComponent(symbol)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function fetchUSMLSignals(): Promise<USScanPick[]> {
  try {
    const r = await fetch('/api/ml/signals/us?limit=20', { next: { revalidate: 0 } });
    if (!r.ok) return [];
    const d = await r.json();
    return d.signals ?? [];
  } catch { return []; }
}

// ── Technical Bias (signal_cache) ────────────────────────────────────────────
interface CachedSignal {
  symbol: string; exchange: string; bias: string | null; signal: string | null;
  rsi14: number | null; ml_class: string | null; price: number | null;
  change_pct: number | null; fetched_at: string;
}
async function loadSignalCache(symbols: string[], exchange: 'NSE' | 'BSE'): Promise<Map<string, CachedSignal>> {
  if (symbols.length === 0) return new Map();
  try {
    const list = symbols.map(s => `"${s}"`).join(',');
    const res = await fetch(
      `${SUPA_URL}/rest/v1/signal_cache?symbol=in.(${list})&exchange=eq.${exchange}&select=*`,
      { headers: { apikey: SUPA_KEY } }
    );
    if (!res.ok) return new Map();
    const rows: CachedSignal[] = await res.json();
    return new Map(rows.map(r => [r.symbol, r]));
  } catch { return new Map(); }
}
function biasLabel(bias?: string | null): string {
  if (bias === 'BULLISH') return 'Bullish';
  if (bias === 'BEARISH') return 'Bearish';
  return 'Neutral';
}
function biasColor(bias?: string | null): { bg: string; color: string } {
  if (bias === 'BULLISH') return { bg: 'rgba(0,212,160,0.12)', color: 'var(--grn)' };
  if (bias === 'BEARISH') return { bg: 'rgba(255,59,92,0.12)', color: 'var(--red)' };
  return { bg: 'rgba(255,184,0,0.12)', color: 'var(--ylw)' };
}
// India `.NS`/`.BO`-suffixed symbols → batch-fetch bias from signal_cache, split by exchange
async function attachBias<T extends { symbol: string }>(items: T[]): Promise<(T & { bias?: string | null })[]> {
  if (items.length === 0) return items;
  const nseSymbols = Array.from(new Set(items.filter(i => !i.symbol.endsWith('.BO')).map(i => i.symbol.replace(/\.(NS|BO)$/i, ''))));
  const bseSymbols = Array.from(new Set(items.filter(i => i.symbol.endsWith('.BO')).map(i => i.symbol.replace(/\.(NS|BO)$/i, ''))));
  const [nseMap, bseMap] = await Promise.all([
    loadSignalCache(nseSymbols, 'NSE'),
    loadSignalCache(bseSymbols, 'BSE'),
  ]);
  return items.map(i => {
    const bare = i.symbol.replace(/\.(NS|BO)$/i, '');
    const cached = i.symbol.endsWith('.BO') ? bseMap.get(bare) : nseMap.get(bare);
    return { ...i, bias: cached?.bias ?? null };
  });
}

// ── US helpers ────────────────────────────────────────────────────────────────
function usZoneFromConfidence(confidence: number): USSignal['zone'] {
  if (confidence >= 72) return 'Strong Momentum';
  if (confidence >= 58) return 'Building';
  return 'Sideways';
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

function relMins(iso: string): number { return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)); }

// ── Visual FX (signals page only) ───────────────────────────────────────────
// Continuous, slow gradient shimmer behind the "live" widgets — standing
// behavior now (was piloted behind a ?fx= param against a one-time "sweep"
// variant; founder picked shimmer, sweep was removed). CSS lives in
// globals.css under "SIGNALS PAGE FX" — new keyframes/classes only, nothing
// existing touched, so no other page is affected.
const SIGFX_CLASS = 'sigfx-shimmer';
// Staggers the shimmer's animation-delay per item in a row/grid so it reads
// as a wave settling across the group rather than every widget firing in lockstep.
function sigfxDelayStyle(index: number): Record<string, string> {
  return { '--sigfx-delay': `${Math.min(index, 10) * 55}ms` };
}

// Rolling count-up — animates the displayed integer from its previous value
// to `value` on every change (including first mount, from 0), ease-out cubic
// so it starts fast and settles into the final number. Kept snappy (~650ms
// default) for a scoreboard feel rather than a slow linear count.
function AnimatedCount({ value, duration = 650, style }: { value: number; duration?: number; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic: fast start, slows into the final number
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span style={style}>{display.toLocaleString('en-IN')}</span>;
}

// Shows when a scan last ran and when it'll next refresh — the whole point
// being visible proof the scan is NOT re-running on every tab click, it's
// serving a cached result until the durable 15-min (or 1hr for fundamentals)
// window elapses. See lib/scan-cache.ts.
function ScanTimer({ meta }: { meta: ScanMeta | null }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!meta?.computed_at) return null;
  const agoMin = relMins(meta.computed_at);
  const nextMin = meta.next_run_at ? Math.max(0, Math.round((new Date(meta.next_run_at).getTime() - Date.now()) / 60_000)) : null;
  return (
    <span style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:5 }}>
      🕒 Ran {agoMin === 0 ? 'just now' : `${agoMin}m ago`}
      {nextMin != null && ` · next refresh ${nextMin === 0 ? 'due now' : `in ${nextMin}m`}`}
    </span>
  );
}

// ── India Detail Drawer ───────────────────────────────────────────────────────
function DetailDrawer({ sig, onClose, isElite, session }: { sig: MLSignal; onClose: () => void; isElite: boolean; session: ReturnType<typeof usePortfolio>['session'] }) {
  const router = useRouter();
  const [ta, setTA] = useState<TADetail | null>(null);
  const [fund, setFund] = useState<FundDetail | null>(null);
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [wlState, setWlState] = useState<'idle'|'adding'|'done'|'exists'|'err'>('idle');

  async function handleAddWatchlist() {
    if (!session) return;
    setWlState('adding');
    const sym = sig.symbol.replace(/\.(NS|BO)$/i, '');
    const ex  = sig.symbol.endsWith('.BO') ? 'BSE' : 'NSE';
    const res = await fetch(`${SUPA_URL}/rest/v1/watchlist`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, symbol: sym, exchange: ex }),
    });
    if (res.status === 409) setWlState('exists');
    else if (res.ok) setWlState('done');
    else setWlState('err');
    setTimeout(() => setWlState('idle'), 2500);
  }

  function handlePaperTrade() {
    const sym  = sig.symbol.replace(/\.(NS|BO)$/i, '');
    const ex   = sig.symbol.endsWith('.BO') ? 'BSE' : 'NSE';
    const dir  = scoreSig(sig) === 'sell' ? 'SELL' : 'BUY';
    const p    = new URLSearchParams({ symbol: sym, price: sig.cmp.toString(), exchange: ex, signal: dir, rsi: sig.rsi.toString(), name: encodeURIComponent(sig.name) });
    onClose();
    router.push(`/dashboard/paper-trading?${p.toString()}`);
  }

  useEffect(() => {
    setLoading(true); setFund(null); setPeers([]); setNarrative(null);
    const sym = sig.symbol.replace(/\.(NS|BO)$/i, '');
    const ex  = sig.symbol.endsWith('.BO') ? 'BSE' : 'NSE';
    Promise.all([
      fetchTA(sig.symbol),
      fetch(`/api/stock-detail?symbol=${sym}&exchange=${ex}`).then(r => r.ok ? r.json() as Promise<FundDetail> : null).catch(() => null),
      fetch(`/api/peer-compare?symbol=${sym}&exchange=${ex}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([taData, fundData, peerData]) => {
      setTA(taData); setFund(fundData);
      setPeers((peerData as { peers?: PeerRow[] } | null)?.peers ?? []);
      setLoading(false);
    });
    // AI narrative for Elite users
    if (isElite) {
      setNarrativeLoading(true);
      fetch(`/api/signal-narrative?symbol=${encodeURIComponent(sym)}&name=${encodeURIComponent(sig.name)}&sector=${encodeURIComponent(sig.sector)}&rsi=${sig.rsi}&ema_dist=${sig.ema_dist_pct}&signal=${encodeURIComponent(sig.signal)}&confidence=${sig.confidence}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setNarrative(d?.narrative ?? null))
        .catch(() => {})
        .finally(() => setNarrativeLoading(false));
    }
  }, [sig.symbol, isElite]); // eslint-disable-line react-hooks/exhaustive-deps
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
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.4 }}>{sig.symbol.replace(/\.(NS|BO)$/, '')}</div>
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
          {/* ── AI Narrative (Elite) ── */}
          {isElite && (
            <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.07),rgba(139,92,246,0.05))', border:'1px solid rgba(255,184,0,0.22)', borderRadius:14, padding:'14px 18px', marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--ylw)', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                ✨ AI Analysis <span style={{ fontSize:9, background:'rgba(255,184,0,0.15)', border:'1px solid rgba(255,184,0,0.3)', borderRadius:4, padding:'1px 5px' }}>Elite · Grok</span>
              </div>
              {narrativeLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height:14, borderRadius:4, background:'rgba(255,255,255,0.06)', animation:'pulse 1.4s infinite', width: i === 3 ? '60%' : '100%' }}/>)}
                </div>
              ) : narrative ? (
                <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.75, whiteSpace:'pre-line' }}>{narrative}</div>
              ) : (
                <div style={{ fontSize:12, color:'var(--dim2)' }}>Narrative unavailable — try refreshing.</div>
              )}
            </div>
          )}

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
              <ProGate feature="signals-indicators">
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
              </ProGate>
            </>
          )}
          {!loading && !ta && (
            <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'16px', fontSize:13, color:'var(--dim)' }}>
              ⚠️ Full technical analysis unavailable. ML API may be offline.
            </div>
          )}

          <ProGate feature="signals-indicators">
          {/* ── Fundamentals ── */}
          {!loading && fund && (fund.trailing_pe != null || fund.roe != null || fund.market_cap != null) && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Fundamentals</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { l:'P/E (TTM)',   v: fund.trailing_pe   != null ? `${fund.trailing_pe}×`  : '—', c: fund.trailing_pe != null && fund.trailing_pe < 20 ? 'var(--grn)' : fund.trailing_pe != null && fund.trailing_pe > 40 ? 'var(--red)' : 'var(--txt)' },
                  { l:'P/B',        v: fund.price_to_book  != null ? `${fund.price_to_book}×` : '—', c:'var(--txt)' },
                  { l:'EV/EBITDA',  v: fund.ev_ebitda      != null ? `${fund.ev_ebitda}×`     : '—', c:'var(--txt)' },
                  { l:'ROE',        v: fund.roe             != null ? `${fund.roe}%`           : '—', c: fund.roe != null && fund.roe > 15 ? 'var(--grn)' : 'var(--txt)' },
                  { l:'Net Margin', v: fund.net_margin      != null ? `${fund.net_margin}%`    : '—', c: fund.net_margin != null && fund.net_margin > 15 ? 'var(--grn)' : 'var(--txt)' },
                  { l:'D/E Ratio',  v: fund.debt_to_equity != null ? `${fund.debt_to_equity}` : '—', c: fund.debt_to_equity != null && fund.debt_to_equity > 2 ? 'var(--red)' : 'var(--txt)' },
                  { l:'Rev Growth', v: fund.revenue_growth  != null ? `${fund.revenue_growth > 0 ? '+' : ''}${fund.revenue_growth}%` : '—', c: fund.revenue_growth != null && fund.revenue_growth > 0 ? 'var(--grn)' : 'var(--txt)' },
                  { l:'Div Yield',  v: fund.dividend_yield  != null ? `${fund.dividend_yield}%` : '—', c:'var(--ylw)' },
                  { l:'Mkt Cap',    v: fund.market_cap      != null ? fund.market_cap >= 1e12 ? `₹${(fund.market_cap/1e12).toFixed(1)}L Cr` : fund.market_cap >= 1e9 ? `₹${(fund.market_cap/1e9).toFixed(0)}K Cr` : `₹${(fund.market_cap/1e7).toFixed(0)} Cr` : '—', c:'var(--dim)' },
                ].map(row => (
                  <div key={row.l} style={{ background:'var(--surf2)', borderRadius:10, padding:'9px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', marginBottom:3 }}>{row.l}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:row.c }}>{row.v}</div>
                  </div>
                ))}
              </div>
              {fund.analyst_count != null && fund.analyst_target != null && (
                <div style={{ marginTop:8, padding:'10px 14px', background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.18)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginBottom:2 }}>ANALYST CONSENSUS ({fund.analyst_count} analysts)</div>
                    <div style={{ fontSize:13, fontWeight:800, color: fund.analyst_consensus === 'buy' || fund.analyst_consensus === 'strong_buy' ? 'var(--grn)' : fund.analyst_consensus === 'sell' ? 'var(--red)' : 'var(--ylw)' }}>
                      {(fund.analyst_consensus ?? 'N/A').replace('_',' ').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', marginBottom:2 }}>TARGET PRICE</div>
                    <div style={{ fontSize:13, fontWeight:800 }}>₹{fund.analyst_target?.toLocaleString('en-IN')}{fund.upside_to_target != null && <span style={{ fontSize:11, color: fund.upside_to_target > 0 ? 'var(--grn)' : 'var(--red)', marginLeft:4 }}>{fund.upside_to_target > 0 ? '+' : ''}{fund.upside_to_target}%</span>}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Shareholding ── */}
          {!loading && fund && (fund.insider_pct != null || fund.institution_pct != null) && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Shareholding Pattern</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Promoter / Insider', pct: fund.insider_pct, color:'var(--bluL)' },
                  { label:'Institutions (FII + DII)', pct: fund.institution_pct, color:'var(--grn)' },
                  { label:'Public', pct: fund.public_pct, color:'var(--dim)' },
                ].filter(r => r.pct != null).map(row => (
                  <div key={row.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'var(--dim)' }}>{row.label}</span>
                      <span style={{ fontWeight:800, color: row.color }}>{row.pct}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--bdr)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100, row.pct ?? 0)}%`, background: row.color, borderRadius:3, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10, color:'var(--dim2)', marginTop:2 }}>Source: Yahoo Finance · Approximate — not official NSE shareholding data</div>
              </div>
            </div>
          )}

          {/* ── Peer Comparison ── */}
          {!loading && peers.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Peer Comparison</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                      {['Stock','Price','Chg%','P/E','ROE'].map(h => (
                        <th key={h} style={{ padding:'5px 8px', textAlign: h === 'Stock' ? 'left' : 'right', color:'var(--dim)', fontWeight:700, fontSize:10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {peers.map(p => (
                      <tr key={p.symbol} style={{ borderBottom:'1px solid var(--bdr)' }}>
                        <td style={{ padding:'7px 8px', fontWeight:700, fontSize:11 }}>{p.symbol}</td>
                        <td style={{ padding:'7px 8px', textAlign:'right', fontSize:11 }}>{p.price != null ? `₹${p.price.toLocaleString('en-IN',{maximumFractionDigits:1})}` : '—'}</td>
                        <td style={{ padding:'7px 8px', textAlign:'right', fontSize:11, fontWeight:700, color: p.change_pct != null ? (p.change_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--dim)' }}>
                          {p.change_pct != null ? `${p.change_pct >= 0 ? '+' : ''}${p.change_pct.toFixed(2)}%` : '—'}
                        </td>
                        <td style={{ padding:'7px 8px', textAlign:'right', fontSize:11, color: p.trailing_pe != null && p.trailing_pe < 20 ? 'var(--grn)' : p.trailing_pe != null && p.trailing_pe > 40 ? 'var(--red)' : 'var(--txt)' }}>
                          {p.trailing_pe != null ? `${p.trailing_pe}×` : '—'}
                        </td>
                        <td style={{ padding:'7px 8px', textAlign:'right', fontSize:11, color: p.roe != null && p.roe > 15 ? 'var(--grn)' : 'var(--txt)' }}>
                          {p.roe != null ? `${p.roe}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Quarterly Results ── */}
          {!loading && fund?.quarterly_results?.length ? (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Quarterly Results</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                      {['Quarter','Revenue (Cr)','Net Profit (Cr)','Margin'].map(h => (
                        <th key={h} style={{ padding:'6px 8px', textAlign:'right', color:'var(--dim)', fontWeight:700, fontSize:10, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fund.quarterly_results.map((q, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--bdr)' }}>
                        <td style={{ padding:'8px 8px', fontWeight:700, fontSize:11 }}>{q.quarter}</td>
                        <td style={{ padding:'8px 8px', textAlign:'right', color:'var(--txt)' }}>{q.revenue_cr != null ? `₹${Number(q.revenue_cr).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding:'8px 8px', textAlign:'right', color: q.net_income_cr != null && q.net_income_cr > 0 ? 'var(--grn)' : 'var(--red)' }}>{q.net_income_cr != null ? `₹${Number(q.net_income_cr).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding:'8px 8px', textAlign:'right', color: q.net_margin != null && q.net_margin > 15 ? 'var(--grn)' : 'var(--txt)' }}>{q.net_margin != null ? `${q.net_margin}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          </ProGate>

          {/* ── Latest News ── */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Latest News</div>
            <StockNews symbol={sig.symbol.replace(/\.(NS|BO)$/i, '')} exchange={sig.symbol.endsWith('.BO') ? 'BSE' : 'NSE'} name={sig.name} />
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', background:'var(--surf2)' }}>
          <div style={{ fontSize:10, color:'var(--dim2)', marginBottom:8 }}>⚠️ NOT SEBI REGISTERED · ML signals are probabilistic · Not financial advice · DYOR</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePaperTrade}
              style={{ flex:1, height:40, borderRadius:10, background:'var(--grn)', border:'none', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              🧪 Paper Trade
            </button>
            <button onClick={handleAddWatchlist} disabled={wlState === 'adding'}
              style={{ flex:1, height:40, borderRadius:10, background: wlState === 'done' ? 'rgba(0,212,160,0.12)' : wlState === 'exists' ? 'rgba(255,184,0,0.12)' : 'var(--card-bg)', border: wlState === 'done' ? '1px solid var(--grn)' : wlState === 'exists' ? '1px solid var(--ylw)' : '1px solid var(--card-bdr)', color: wlState === 'done' ? 'var(--grn)' : wlState === 'exists' ? 'var(--ylw)' : wlState === 'err' ? 'var(--red)' : 'var(--txt)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
              {wlState === 'adding' ? '…' : wlState === 'done' ? '✓ Added to Watchlist' : wlState === 'exists' ? '✓ Already in Watchlist' : wlState === 'err' ? '✗ Failed' : '📋 Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── US Detail Drawer ──────────────────────────────────────────────────────────
function USDetailDrawer({ sig, onClose, isElite }: { sig: USSignal; onClose: () => void; isElite: boolean }) {
  const z = zs(sig.zone);
  const [detail, setDetail] = useState<USDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  useEffect(() => {
    setDetailLoading(true); setDetail(null); setNarrative(null);
    fetch(`/api/stock-detail?symbol=${sig.symbol}&exchange=NYSE`)
      .then(r => r.ok ? r.json() as Promise<USDetail> : null)
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));

    if (isElite) {
      setNarrativeLoading(true);
      fetch(`/api/signal-narrative?symbol=${encodeURIComponent(sig.symbol)}&name=${encodeURIComponent(sig.name)}&sector=${encodeURIComponent(sig.sector)}&rsi=${sig.rsi}&ema_dist=${sig.ema_dist_pct}&signal=${encodeURIComponent(sig.signal)}&confidence=${sig.confidence}&market=us`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setNarrative(d?.narrative ?? null))
        .catch(() => {})
        .finally(() => setNarrativeLoading(false));
    }
  }, [sig.symbol, isElite]); // eslint-disable-line react-hooks/exhaustive-deps

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
  function SkeletonBlock() {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ height:52, borderRadius:9, background:'var(--surf2)', animation:'pulse 1.4s infinite', opacity:0.7 }}/>)}
      </div>
    );
  }

  const cmp = sig.cmp;
  const chg = sig.chg;

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
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:24, fontWeight:900 }}>{cmp ? `$${cmp.toFixed(2)}` : '—'}</span>
            {chg !== 0 && <span style={{ fontSize:14, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}% today</span>}
            <span style={{ padding:'4px 10px', borderRadius:7, background:z.bg, border:`1px solid ${z.bdr}`, fontSize:11, fontWeight:800, color:z.color }}>
              {sig.zone}
            </span>
            <span style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:7, background: sig.confidence >= 75 ? 'rgba(0,212,160,0.15)' : 'rgba(23,64,245,0.12)', border:'1px solid', borderColor: sig.confidence >= 75 ? 'rgba(0,212,160,0.3)' : 'rgba(23,64,245,0.25)', fontSize:12, fontWeight:800, color: confColor(sig.confidence) }}>
              🤖 {sig.confidence}% momentum score
            </span>
          </div>
        </div>

        <div style={{ padding:'20px 24px', flex:1 }}>
          {/* ── Scan summary (entry/target/SL — always available, from the scan itself) ── */}
          <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--grn)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>US Swing Scan</div>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3, marginBottom:4 }}>Entry ${sig.entry_low}–{sig.entry_high}</div>
              <div style={{ fontSize:12, color:'var(--dim)' }}>Target ${sig.target} · SL ${sig.sl}</div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:32, fontWeight:900, color:'var(--grn)', lineHeight:1 }}>{((sig.target - sig.cmp) / (sig.cmp - sig.sl)).toFixed(1)}×</div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:4 }}>Risk : Reward</div>
            </div>
          </div>

          {/* ── AI Narrative (Elite) ── */}
          {isElite && (
            <div style={{ background:'linear-gradient(135deg,rgba(255,184,0,0.07),rgba(139,92,246,0.05))', border:'1px solid rgba(255,184,0,0.22)', borderRadius:14, padding:'14px 18px', marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--ylw)', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                ✨ AI Analysis <span style={{ fontSize:9, background:'rgba(255,184,0,0.15)', border:'1px solid rgba(255,184,0,0.3)', borderRadius:4, padding:'1px 5px' }}>Elite · Grok</span>
              </div>
              {narrativeLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height:14, borderRadius:4, background:'rgba(255,255,255,0.06)', animation:'pulse 1.4s infinite', width: i === 3 ? '60%' : '100%' }}/>)}
                </div>
              ) : narrative ? (
                <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.75, whiteSpace:'pre-line' }}>{narrative}</div>
              ) : (
                <div style={{ fontSize:12, color:'var(--dim2)' }}>Narrative unavailable — try refreshing.</div>
              )}
            </div>
          )}

          {/* Analyst banner */}
          {!detailLoading && detail?.analyst_consensus && (
            <div style={{ background:'linear-gradient(135deg,rgba(79,111,250,0.08),rgba(23,64,245,0.03))', border:'1px solid rgba(79,111,250,0.22)', borderRadius:14, padding:'16px 20px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:'var(--bluL)', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>
                  Wall St. Consensus · {detail.analyst_count ?? '—'} analysts
                </div>
                <div style={{ fontSize:16, fontWeight:800 }}>{detail.analyst_consensus?.replace('_',' ').toUpperCase() ?? '—'}</div>
                {detail.analyst_target && <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>Avg target ${detail.analyst_target} · range ${detail.analyst_target_low}–${detail.analyst_target_high}</div>}
              </div>
              {detail.upside_to_target != null && (
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:28, fontWeight:900, color: detail.upside_to_target >= 10 ? 'var(--grn)' : detail.upside_to_target < -5 ? 'var(--red)' : 'var(--ylw)', lineHeight:1 }}>
                    {detail.upside_to_target >= 0 ? '+' : ''}{detail.upside_to_target}%
                  </div>
                  <div style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>upside to target</div>
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          {!detailLoading && detail?.signals && detail.signals.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <Section title="Technical Signals" />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {detail.signals.map((s, i) => {
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

          {/* Technicals — Pro+ */}
          <ProGate feature="signals-indicators">
          <Section title="Technicals" />
          {detailLoading ? <SkeletonBlock /> : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            {detail?.rsi14   != null && <Stat label="RSI 14"   val={detail.rsi14.toString()} color={detail.rsi14 > 70 ? 'var(--red)' : detail.rsi14 < 35 ? 'var(--grn)' : 'var(--txt)'} />}
            {detail?.macd    != null && <Stat label="MACD"     val={detail.macd.toString()}  color={detail.macd >= 0 ? 'var(--grn)' : 'var(--red)'} />}
            {detail?.bb_pct  != null && <Stat label="BB %"     val={`${detail.bb_pct}%`} sub="0=lower 100=upper" />}
            {detail?.vol_ratio != null && <Stat label="Vol Ratio" val={`${detail.vol_ratio}x`} color={detail.vol_ratio > 2 ? 'var(--ylw)' : 'var(--txt)'} />}
            {detail?.from_52h != null && <Stat label="vs 52W High" val={`${detail.from_52h}%`} color={detail.from_52h > -5 ? 'var(--grn)' : 'var(--dim)'} />}
            {detail?.ema20   != null && <Stat label="EMA 20"   val={`$${detail.ema20}`} color={cmp > detail.ema20 ? 'var(--grn)' : 'var(--red)'} />}
            {detail?.ema50   != null && <Stat label="EMA 50"   val={`$${detail.ema50}`} color={cmp > detail.ema50 ? 'var(--grn)' : 'var(--red)'} />}
            {detail?.ema200  != null && <Stat label="EMA 200"  val={`$${detail.ema200}`} color={cmp > detail.ema200 ? 'var(--grn)' : 'var(--red)'} />}
          </div>
          )}

          {/* Valuation */}
          {!detailLoading && (detail?.trailing_pe != null || detail?.forward_pe != null || detail?.market_cap != null || detail?.beta != null) && (
            <>
              <Section title="Valuation" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                {detail.trailing_pe    != null && <Stat label="P/E (TTM)"   val={fmt(detail.trailing_pe)} />}
                {detail.forward_pe     != null && <Stat label="Forward P/E" val={fmt(detail.forward_pe)} />}
                {detail.ev_ebitda      != null && <Stat label="EV/EBITDA"   val={fmt(detail.ev_ebitda)} />}
                {detail.beta           != null && <Stat label="Beta"        val={fmt(detail.beta)} sub="vs S&P 500" />}
                {detail.market_cap     != null && <Stat label="Market Cap"  val={detail.market_cap >= 1e12 ? `$${(detail.market_cap/1e12).toFixed(2)}T` : `$${(detail.market_cap/1e9).toFixed(1)}B`} />}
                {detail.short_pct_float != null && <Stat label="Short Float" val={fmt(detail.short_pct_float, '%')} color={detail.short_pct_float > 20 ? 'var(--ylw)' : 'var(--txt)'} />}
              </div>
            </>
          )}

          {/* Growth */}
          {!detailLoading && (detail?.revenue_growth != null || detail?.net_margin != null || detail?.roe != null) && (
            <>
              <Section title="Growth & Profitability" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                {detail.revenue_growth  != null && <Stat label="Revenue Growth"  val={fmt(detail.revenue_growth, '%')}  color={detail.revenue_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                {detail.earnings_growth != null && <Stat label="Earnings Growth" val={fmt(detail.earnings_growth, '%')} color={detail.earnings_growth >= 0 ? 'var(--grn)' : 'var(--red)'} />}
                {detail.net_margin      != null && <Stat label="Net Margin"      val={fmt(detail.net_margin, '%')} />}
                {detail.roe             != null && <Stat label="ROE"             val={fmt(detail.roe, '%')} />}
                {detail.gross_margin    != null && <Stat label="Gross Margin"    val={fmt(detail.gross_margin, '%')} />}
                {detail.operating_margin != null && <Stat label="Op. Margin"     val={fmt(detail.operating_margin, '%')} />}
              </div>
            </>
          )}

          {/* Earnings */}
          {!detailLoading && detail?.next_earnings_date && (
            <>
              <Section title="Earnings" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                <Stat label="Next Earnings" val={detail.next_earnings_date}
                  sub={detail.days_to_earnings != null ? `${detail.days_to_earnings}d away` : undefined}
                  color={detail.days_to_earnings != null && detail.days_to_earnings <= 14 ? 'var(--ylw)' : 'var(--txt)'} />
                {detail.dividend_yield != null && <Stat label="Div Yield" val={fmt(detail.dividend_yield, '%')} color="var(--grn)" />}
              </div>
            </>
          )}

          {/* Price targets — from full detail fetch, when available */}
          {!detailLoading && (detail?.stop_loss != null || detail?.target1 != null) && (
            <>
              <Section title="Price Levels" />
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { l:'🔴 Stop Loss',  v: detail?.stop_loss ? `$${detail.stop_loss}` : '—', c:'var(--red)' },
                  { l:'🎯 Target 1',   v: detail?.target1   ? `$${detail.target1}` : '—',   c:'var(--grn)' },
                  { l:'🎯 Target 2',   v: detail?.target2   ? `$${detail.target2}` : '—',   c:'var(--grn)' },
                ].map(row => (
                  <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--bdr)' }}>
                    <span style={{ fontSize:12, color:'var(--dim)' }}>{row.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          </ProGate>

          {/* ── Latest News ── */}
          <div style={{ marginTop:20 }}>
            <Section title="Latest News" />
            <StockNews symbol={sig.symbol} exchange="US" />
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', background:'var(--surf2)' }}>
          <div style={{ fontSize:10, color:'var(--dim2)' }}>⚠️ NOT SEC REGISTERED · Signals are algorithmic estimates from public data · Not investment advice · DYOR</div>
        </div>
      </div>
    </>
  );
}

// ── Market Toggle ─────────────────────────────────────────────────────────────
type Market = 'india' | 'us' | 'fundamental';
const MARKET_OPTS: Array<{ key: Market; label: string; shortLabel: string; activeColor: string; activeBorder: string }> = [
  { key:'india',       label:'🇮🇳 India (NSE)',      shortLabel:'🇮🇳 India', activeColor:'var(--ylw)',  activeBorder:'rgba(255,184,0,0.35)' },
  { key:'us',          label:'🇺🇸 US (NYSE/NASDAQ)', shortLabel:'🇺🇸 US',    activeColor:'var(--bluL)', activeBorder:'rgba(79,111,250,0.35)' },
  { key:'fundamental', label:'📊 Fundamentals',       shortLabel:'📊 Fund',   activeColor:'var(--grn)',  activeBorder:'rgba(0,212,160,0.35)' },
];
function MarketToggle({ market, onChange }: { market: Market; onChange: (m: Market) => void }) {
  return (
    <div className="sig-mkt-toggle" style={{ display:'inline-flex', background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:3, gap:2 }}>
      {MARKET_OPTS.map(opt => (
        <button key={opt.key} onClick={() => onChange(opt.key)}
          style={{ height:34, padding:'0 14px', borderRadius:9, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
            background: market === opt.key ? `${opt.activeColor.replace('var(--','').replace(')','')}-bg` : 'transparent',
            backgroundColor: market === opt.key ? opt.activeBorder.replace('0.35','0.15') : 'transparent',
            color: market === opt.key ? opt.activeColor : 'var(--dim)',
            boxShadow: market === opt.key ? `0 0 0 1px ${opt.activeBorder}` : 'none',
          }}>
          <span className="mkt-label-full">{opt.label}</span>
          <span className="mkt-label-short">{opt.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
const PLAN_DETAILS = {
  starter: {
    color:'var(--bluL)', bg:'rgba(23,64,245,0.12)', bdr:'rgba(23,64,245,0.3)',
    price:'₹299/mo',
    perks:['All 20 ML signals + full detail','Entry range, targets, stop-loss','Portfolio universe scan','🌐 Full Market Scan — top 100 of ~4,000 stocks','Signal track record'],
  },
  pro: {
    color:'var(--org)', bg:'rgba(255,92,26,0.12)', bdr:'rgba(255,92,26,0.3)',
    price:'₹799/mo',
    perks:['Everything in Starter','🌐 Full Market Scan — top 500 of ~4,000 stocks','Custom universe (any NSE stock)','Price alerts from signal rows','Export signals CSV'],
  },
  elite: {
    color:'var(--ylw)', bg:'rgba(255,184,0,0.10)', bdr:'rgba(255,184,0,0.28)',
    price:'₹1,999/mo',
    perks:['Everything in Pro','🌐 Full Market Scan — every qualifying stock, no cap','🇺🇸 US market signals (NYSE/NASDAQ)','✨ AI narrative per signal — Grok-powered','Intraday scan refresh (coming soon)'],
  },
} as const;

function UpgradeModal({ feature, minPlan, onClose }: { feature: string; minPlan: 'starter' | 'pro' | 'elite'; onClose: () => void }) {
  const d = PLAN_DETAILS[minPlan];
  const isNative = useIsNativePlatform();
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:22, padding:'32px 28px', maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🔒</div>
        <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.4, marginBottom:6 }}>
          {minPlan === 'starter' ? 'Starter' : 'Pro'} feature
        </div>
        <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.65, marginBottom:20, background:'var(--surf2)', borderRadius:10, padding:'10px 14px' }}>
          <strong style={{ color:'var(--txt)' }}>{feature}</strong><br/>requires {minPlan === 'starter' ? 'Starter' : 'Pro'} plan or higher.
        </div>
        <div style={{ background:d.bg, border:`1px solid ${d.bdr}`, borderRadius:14, padding:'16px', marginBottom:20, textAlign:'left' }}>
          <div style={{ fontSize:13, fontWeight:800, color:d.color, marginBottom:10 }}>
            {minPlan === 'starter' ? 'Starter' : 'Pro'} — {d.price}
          </div>
          {d.perks.map(p => (
            <div key={p} style={{ fontSize:12, color:'var(--dim)', marginBottom:6, display:'flex', alignItems:'flex-start', gap:7 }}>
              <span style={{ color:d.color, flexShrink:0 }}>✓</span>{p}
            </div>
          ))}
        </div>
        {!isNative && (
          <Link href="/dashboard/upgrade" style={{ display:'block', height:44, lineHeight:'44px', borderRadius:11, background:'linear-gradient(135deg,var(--blu),rgba(79,111,250,0.8))', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', marginBottom:10 }}>
            Upgrade Now →
          </Link>
        )}
        <Link href="/dashboard/track-record" style={{ display:'block', fontSize:12, color:'var(--bluL)', fontWeight:600, textDecoration:'none', marginBottom:14 }}>
          📊 See our accuracy first (free) →
        </Link>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const { symbols: portfolioSymbols, portfolios, session } = usePortfolio();
  const { isStarter, isPro, isElite, loading: planLoading } = usePlan();
  const [market, setMarket] = useState<Market>('india');
  const isNative = useIsNativePlatform();

  // Deep-link: /dashboard/signals?tab=fundamental|us|india
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab') ?? p.get('market');
    if (t === 'fundamental' || t === 'fundamentals') setMarket('fundamental');
    else if (t === 'us') setMarket('us');
  }, []);

  // India state
  const [mlSignals, setMlSignals] = useState<MLSignal[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError,   setMlError]   = useState(false);
  const [mlMeta,    setMlMeta]    = useState<ScanMeta | null>(null);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<MLSignal | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [showAdv,   setShowAdv]   = useState(false);
  const [advSector, setAdvSector] = useState('');
  const [advMinRsi, setAdvMinRsi] = useState('');
  const [advMaxRsi, setAdvMaxRsi] = useState('');
  const [advMinConf,setAdvMinConf]= useState('');
  const [advMaxEma, setAdvMaxEma] = useState(''); // max abs % from EMA20

  // ML Beta — volatility-ranked swing scan (lib/india-scan.ts runBetaScan)
  const [betaSignals, setBetaSignals] = useState<MLSignal[]>([]);
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaLoaded,  setBetaLoaded]  = useState(false);
  const [betaMeta,    setBetaMeta]    = useState<ScanMeta | null>(null);

  // ML Fundamental Strong — auto-ranked quality/value scan (distinct from the
  // manual-filter Fundamental Screener under the top-level market toggle)
  const [fundTopSignals, setFundTopSignals] = useState<FundamentalTopSignal[]>([]);
  const [fundTopLoading, setFundTopLoading] = useState(false);
  const [fundTopLoaded,  setFundTopLoaded]  = useState(false);
  const [fundTopMeta,    setFundTopMeta]    = useState<ScanMeta | null>(null);

  // Full NSE+BSE market scan (~4000 stocks) — depth-gated by plan, see
  // /api/ml/signals/full-market. Same MLSignal shape as ml/beta, so it slots
  // straight into activeSignals/activeMeta below and reuses their KPIs/table.
  const [fullMarketSignals,   setFullMarketSignals]   = useState<MLSignal[]>([]);
  const [fullMarketLoading,   setFullMarketLoading]   = useState(false);
  const [fullMarketLoaded,    setFullMarketLoaded]    = useState(false);
  const [fullMarketMeta,      setFullMarketMeta]      = useState<ScanMeta | null>(null);
  const [fullMarketTotal,     setFullMarketTotal]     = useState(0); // total qualifying before tier depth slice

  // Portfolio universe scan mode
  const [portMode,        setPortMode]        = useState<'ml'|'beta'|'fundamental_top'|'portfolio'|'full_market'>('ml');
  const [portScanResults, setPortScanResults] = useState<(MLSignal & {invested:number})[]>([]);
  const [portScanLoading, setPortScanLoading] = useState(false);
  const [portScanProgress,setPortScanProgress]= useState(0);
  const [portScanLoaded,  setPortScanLoaded]  = useState(false);

  // US state
  const [usSignals,    setUsSignals]    = useState<USSignal[]>([]);
  const [usLoading,    setUsLoading]    = useState(false);
  const [usLoaded,     setUsLoaded]     = useState(false);
  const [usFilter,     setUsFilter]     = useState('all');
  const [usSearch,     setUsSearch]     = useState('');
  const [selectedUS,   setSelectedUS]   = useState<USSignal | null>(null);
  const [usPortSyms,   setUsPortSyms]   = useState<string[]>([]);

  // US Full Market scan (~7-8k stocks) — Elite-only (whole US tab already
  // is), no depth tiering needed since no lower tier can reach it.
  const [usMode,               setUsMode]               = useState<'top20'|'full_market'>('top20');
  const [usFullMarketSignals,  setUsFullMarketSignals]  = useState<USSignal[]>([]);
  const [usFullMarketLoading,  setUsFullMarketLoading]  = useState(false);
  const [usFullMarketLoaded,   setUsFullMarketLoaded]   = useState(false);
  const [usFullMarketMeta,     setUsFullMarketMeta]     = useState<ScanMeta | null>(null);

  // Upgrade modal
  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; minPlan: 'starter' | 'pro' | 'elite' } | null>(null);

  // Fundamental screener state
  type FundStock = { symbol:string; sector:string; name:string; price:number|null; change_pct:number|null;
    trailing_pe:number|null; price_to_book:number|null; roe:number|null; net_margin:number|null;
    operating_margin:number|null; debt_to_equity:number|null; revenue_growth:number|null;
    dividend_yield:number|null; market_cap:number|null };
  const [fundResults,   setFundResults]   = useState<FundStock[]>([]);
  const [fundLoading,   setFundLoading]   = useState(false);
  const [fundLoaded,    setFundLoaded]    = useState(false);
  const [fundSector,    setFundSector]    = useState('All');
  const [fundCapBucket, setFundCapBucket] = useState('All');
  const [fundPeMax,     setFundPeMax]     = useState('');
  const [fundRoeMin,    setFundRoeMin]    = useState('');
  const [fundDeMax,     setFundDeMax]     = useState('');
  const [fundRevMin,    setFundRevMin]    = useState('');
  const [fundSort,      setFundSort]      = useState<{ col: keyof FundStock; dir: 1 | -1 }>({ col:'market_cap', dir:-1 });

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
    setShowDropdown(false); setSearch(item.name); setAnalysing(true);
    try {
      const sym = item.ticker.replace(/\.(NS|BO)$/i, '');
      const r = await fetch(`/api/stock-detail?symbol=${sym}&exchange=${item.exchange}`);
      if (!r.ok) { setAnalysing(false); return; }
      const d = await r.json();
      const synthetic: MLSignal = {
        symbol: item.ticker, name: item.name, sector: 'Custom',
        cmp: d.price ?? 0, chg: d.change_pct ?? 0,
        rsi: d.rsi14 ?? 50, ema20: d.ema20 ?? 0,
        ema_dist_pct: d.ema20 && d.price ? +((d.price - d.ema20) / d.ema20 * 100).toFixed(1) : 0,
        entry_low: d.entry_low ?? 0, entry_high: d.entry_high ?? 0,
        target: d.target1 ?? 0, sl: d.stop_loss ?? 0,
        signal: d.signals?.[0] ?? 'ANALYSIS',
        confidence: d.rsi14 ? Math.min(99, Math.round(50 + Math.abs(50 - d.rsi14))) : 60,
        score: 0,
      };
      setSelected(synthetic);
    } catch { /**/ } finally { setAnalysing(false); }
  }

  const loadIndia = useCallback(async () => {
    setMlLoading(true); setMlError(false);
    const { signals: sigs, computed_at, next_run_at } = await fetchScan<MLSignal>('/api/ml/signals?limit=20');
    if (sigs.length === 0) setMlError(true);
    const withBias = await attachBias(sigs);
    setMlSignals(withBias);
    setMlMeta({ computed_at, next_run_at });
    setMlLoading(false);
    if (sigs.length > 0) void logScansAsync(sigs);
  }, []);

  const loadBeta = useCallback(async () => {
    setBetaLoading(true);
    const { signals: sigs, computed_at, next_run_at } = await fetchScan<MLSignal>('/api/ml/signals/beta?limit=20');
    const withBias = await attachBias(sigs);
    setBetaSignals(withBias);
    setBetaMeta({ computed_at, next_run_at });
    setBetaLoading(false);
    setBetaLoaded(true);
  }, []);

  const loadFundTop = useCallback(async () => {
    setFundTopLoading(true);
    const { signals: sigs, computed_at, next_run_at } = await fetchScan<FundamentalTopSignal>('/api/ml/signals/fundamental?limit=20');
    setFundTopSignals(sigs);
    setFundTopMeta({ computed_at, next_run_at });
    setFundTopLoading(false);
    setFundTopLoaded(true);
  }, []);

  const loadFullMarket = useCallback(async () => {
    if (!session) return;
    setFullMarketLoading(true);
    try {
      const r = await fetch('/api/ml/signals/full-market', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await r.json();
      const sigs: MLSignal[] = d.signals ?? [];
      const withBias = await attachBias(sigs);
      setFullMarketSignals(withBias);
      setFullMarketTotal(d.total_qualifying ?? sigs.length);
      setFullMarketMeta({ computed_at: d.computed_at ?? null, next_run_at: d.next_run_at ?? null });
    } catch { /* leave whatever's already loaded */ }
    setFullMarketLoading(false);
    setFullMarketLoaded(true);
  }, [session]);

  const loadUS = useCallback(async () => {
    if (usLoaded) return;
    setUsLoading(true);
    const picks = await fetchUSMLSignals();
    setUsSignals(picks.map(p => ({ ...p, zone: usZoneFromConfidence(p.confidence), detail: null })));
    setUsLoading(false);
    setUsLoaded(true);
  }, [usLoaded]);

  const loadUSFullMarket = useCallback(async () => {
    if (!session) return;
    setUsFullMarketLoading(true);
    try {
      const r = await fetch('/api/ml/signals/us/full-market', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await r.json();
      const picks: USScanPick[] = d.signals ?? [];
      setUsFullMarketSignals(picks.map(p => ({ ...p, zone: usZoneFromConfidence(p.confidence), detail: null })));
      setUsFullMarketMeta({ computed_at: d.computed_at ?? null, next_run_at: d.next_run_at ?? null });
    } catch { /* leave whatever's already loaded */ }
    setUsFullMarketLoading(false);
    setUsFullMarketLoaded(true);
  }, [session]);

  const loadFundamentals = useCallback(async () => {
    setFundLoading(true);
    // Import universe list from API module — hardcode here to avoid dynamic import
    const BATCHES = [
      'TCS,INFY,WIPRO,HCLTECH,TECHM,LTIM,MPHASIS,COFORGE,PERSISTENT,KPITTECH',
      'HDFCBANK,ICICIBANK,KOTAKBANK,AXISBANK,SBIN,INDUSINDBK,FEDERALBNK,BANDHANBNK',
      'BAJFINANCE,BAJAJFINSV,CHOLAFIN,MUTHOOTFIN,LICHSGFIN,MARUTI,TATAMOTORS,M&M,BAJAJ-AUTO,HEROMOTOCO',
      'SUNPHARMA,CIPLA,DRREDDY,DIVISLAB,LUPIN,AUROPHARMA,ALKEM,EICHERMOT,TVSMOTOR',
      'HINDUNILVR,ITC,NESTLEIND,BRITANNIA,DABUR,MARICO,GODREJCP,TATACONSUM',
      'TATASTEEL,JSWSTEEL,HINDALCO,VEDL,SAIL,NMDC,RELIANCE,ONGC,NTPC,POWERGRID',
      'COALINDIA,BPCL,DLF,GODREJPROP,OBEROIREALTY,PRESTIGE,BHARTIARTL,INDUSTOWER',
      'TITAN,ASIANPAINT,PIDILITIND,HAVELLS,VOLTAS,TRENT,ULTRACEMCO,SHREECEM,ACC,AMBUJACEM',
      'LT,ABB,SIEMENS,CUMMINSIND,APOLLOHOSP,FORTIS,MAXHEALTH,ADANIENT,ZOMATO,IRCTC,NAUKRI',
    ];
    const settled = await Promise.allSettled(
      BATCHES.map(b => fetch(`/api/fundamental-scan?symbols=${encodeURIComponent(b)}`).then(r => r.ok ? r.json() as Promise<{results:FundStock[]}> : {results:[]}).catch(() => ({results:[]})))
    );
    const all: FundStock[] = settled.flatMap(r => r.status === 'fulfilled' ? r.value.results : []);
    setFundResults(all);
    setFundLoading(false);
    setFundLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolioScan = useCallback(async () => {
    if (!session || !portfolios.length || portScanLoading) return;
    setPortScanLoading(true); setPortScanProgress(0); setPortScanResults([]);
    try {
      const ids = portfolios.map(p => p.id).join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/holdings?portfolio_id=in.(${ids})&exchange=in.(NSE,BSE)&select=symbol,exchange,qty,avg_price`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const rows: { symbol:string; exchange:string; qty:number; avg_price:number }[] = await res.json();

      // Deduplicate by symbol, sum invested
      const map = new Map<string, {exchange:string; invested:number}>();
      for (const h of rows) {
        const inv = (h.qty || 0) * (h.avg_price || 0);
        if (map.has(h.symbol)) { map.get(h.symbol)!.invested += inv; }
        else { map.set(h.symbol, { exchange: h.exchange, invested: inv }); }
      }
      const universe = [...map.entries()]
        .map(([symbol, v]) => ({ symbol, ...v }))
        .sort((a, b) => b.invested - a.invested);

      // Batch fetch stock-detail, stream results in as batches complete
      const BATCH = 8;
      const results: (MLSignal & { invested:number })[] = [];
      for (let i = 0; i < universe.length; i += BATCH) {
        const batch = universe.slice(i, i + BATCH);
        const settled = await Promise.allSettled(
          batch.map(async u => {
            const r = await fetch(`/api/stock-detail?symbol=${u.symbol}&exchange=${u.exchange}`);
            if (!r.ok) return null;
            const d = await r.json();
            return {
              symbol: `${u.symbol}.${u.exchange === 'NSE' ? 'NS' : 'BO'}`,
              name: d.name ?? u.symbol, sector: d.sector ?? SYMBOL_SECTOR[u.symbol] ?? 'Diversified',
              cmp: d.price ?? 0, chg: d.change_pct ?? 0,
              rsi: d.rsi14 ?? 50, ema20: d.ema20 ?? 0,
              ema_dist_pct: (d.ema20 && d.price) ? +((d.price - d.ema20) / d.ema20 * 100).toFixed(1) : 0,
              entry_low: d.entry_low ?? 0, entry_high: d.entry_high ?? 0,
              target: d.target1 ?? 0, sl: d.stop_loss ?? 0,
              signal: d.signals?.[0] ?? 'HOLD',
              confidence: d.rsi14 ? Math.min(99, Math.round(50 + Math.abs(50 - d.rsi14))) : 60,
              score: 0, invested: u.invested,
            } as MLSignal & { invested:number };
          })
        );
        results.push(...settled.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []));
        setPortScanResults([...results]);
        setPortScanProgress(Math.min(99, Math.round((i + BATCH) / universe.length * 100)));
      }
      setPortScanProgress(100);
      const withBias = await attachBias(results);
      setPortScanResults(withBias);
      setPortScanLoaded(true);
    } finally {
      setPortScanLoading(false);
    }
  }, [session, portfolios, portScanLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadIndia(); }, [loadIndia]);
  useEffect(() => { localStorage.setItem('signal_visited_signals', '1'); }, []);
  useEffect(() => { if (market === 'us') loadUS(); }, [market, loadUS]);

  // Auto-switch to portfolio mode when holdings load — starter+ only
  useEffect(() => {
    if (session && portfolios.length > 0 && isStarter && !planLoading && !portScanLoaded && !portScanLoading) {
      setPortMode('portfolio');
      loadPortfolioScan();
    }
  }, [session, portfolios.length, isStarter, planLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // India derived — use portScanResults in portfolio mode, mlSignals in ml mode
  const activeSignals = portMode === 'portfolio' ? portScanResults : portMode === 'beta' ? betaSignals : portMode === 'fundamental_top' ? [] : portMode === 'full_market' ? fullMarketSignals : mlSignals;
  const activeMeta = portMode === 'beta' ? betaMeta : portMode === 'ml' ? mlMeta : portMode === 'full_market' ? fullMarketMeta : null;
  const hasPortfolio  = portfolioSymbols.length > 0;
  const portfolioCnt  = mlSignals.filter(s => portfolioSymbols.includes(s.symbol.replace('.NS',''))).length;
  const buyCnt        = activeSignals.filter(s => scoreSig(s) === 'buy').length;
  const accumulateCnt = activeSignals.filter(s => scoreSig(s) === 'accumulate').length;
  const holdCnt       = activeSignals.filter(s => scoreSig(s) === 'hold').length;
  const sellCnt       = activeSignals.filter(s => scoreSig(s) === 'sell').length;
  const FILTERS = [
    { key:'all',        label:`All (${activeSignals.length})`,        shortLabel:`All ${activeSignals.length}` },
    ...(hasPortfolio ? [{ key:'portfolio', label:`💼 My Portfolio (${portfolioCnt})`, shortLabel:`💼 ${portfolioCnt}` }] : []),
    { key:'buy',        label:`🟢 Strong (${buyCnt})`,                shortLabel:`🟢 ${buyCnt}` },
    { key:'accumulate', label:`📈 Building (${accumulateCnt})`,       shortLabel:`📈 ${accumulateCnt}` },
    { key:'hold',       label:`⏸ Sideways (${holdCnt})`,              shortLabel:`⏸ ${holdCnt}` },
    { key:'sell',       label:`🔴 Weak (${sellCnt})`,                 shortLabel:`🔴 ${sellCnt}` },
    { key:'high',       label:'🔥 High Conf 80%+',                    shortLabel:'🔥 80%+' },
  ];
  const sectors = Array.from(new Set(mlSignals.map(s => s.sector).filter(Boolean))).sort();
  const advActive = !!(advSector || advMinRsi || advMaxRsi || advMinConf || advMaxEma);

  const shown = activeSignals
    .filter(s => {
      // In portfolio mode, universe IS already portfolio — skip portfolio filter
      if (portMode !== 'portfolio' && filter === 'portfolio') return portfolioSymbols.includes(s.symbol.replace('.NS',''));
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
  const activeUSSignals = usMode === 'full_market' ? usFullMarketSignals : usSignals;
  const activeUSLoading = usMode === 'full_market' ? usFullMarketLoading : usLoading;
  const activeUSLoaded  = usMode === 'full_market' ? usFullMarketLoaded  : usLoaded;
  const usPortSet   = new Set(usPortSyms);
  const usPortInSig = activeUSSignals.filter(s => usPortSet.has(s.symbol)).length;
  const US_ZONE_COUNTS = {
    'Strong Momentum':  activeUSSignals.filter(s => s.zone === 'Strong Momentum').length,
    'Building':         activeUSSignals.filter(s => s.zone === 'Building').length,
    'Sideways':         activeUSSignals.filter(s => s.zone === 'Sideways').length,
    'Weak / Declining': activeUSSignals.filter(s => s.zone === 'Weak / Declining').length,
  };
  const US_FILTERS = [
    { key:'all',              label:`All (${activeUSSignals.length})` },
    ...(usPortSyms.length ? [{ key:'portfolio', label:`💼 My US Holdings (${usPortInSig})` }] : []),
    { key:'Strong Momentum',  label:`🟢 Strong (${US_ZONE_COUNTS['Strong Momentum']})` },
    { key:'Building',         label:`📈 Building (${US_ZONE_COUNTS['Building']})` },
    { key:'Sideways',         label:`⏸ Sideways (${US_ZONE_COUNTS['Sideways']})` },
    { key:'Weak / Declining', label:`🔴 Weak (${US_ZONE_COUNTS['Weak / Declining']})` },
  ];
  const shownUS = activeUSSignals
    .filter(s => {
      if (usFilter === 'portfolio') return usPortSet.has(s.symbol);
      if (usFilter === 'all') return true;
      return s.zone === usFilter;
    })
    .filter(s => !usSearch || s.symbol.toLowerCase().includes(usSearch.toLowerCase()) || (s.name ?? '').toLowerCase().includes(usSearch.toLowerCase()));

  // Constants for soft gating
  const FREE_LIMIT = 5; // rows visible without blur for free tier

  return (
    <>
      {/* Header row — title + market toggle */}
      <div className="sig-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color: market === 'india' ? 'var(--ylw)' : market === 'fundamental' ? 'var(--grn)' : 'var(--bluL)', textTransform:'uppercase', marginBottom:4 }}>
            {market === 'india' ? 'ML Technical Scan · NSE Screener' : market === 'fundamental' ? 'Fundamental Screener · NSE' : 'Technical Scan · NYSE / NASDAQ'}
          </div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>
            {market === 'india' ? '🇮🇳 India Signals' : market === 'fundamental' ? '📊 Fundamental Scan' : '🇺🇸 US Signals'}
          </div>
        </div>
        <div className="sig-header-right" style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Link href="/dashboard/track-record" className="sig-track-link" style={{ height:34, padding:'0 14px', borderRadius:9, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.28)', color:'var(--grn)', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none' }}>
            <span className="sig-track-text">📊 Track Record →</span>
            <span className="sig-track-icon">📊</span>
          </Link>
          <MarketToggle market={market} onChange={m => {
            if (m === 'us' && !isElite) {
              setUpgradeModal({ feature: 'US Market Signals — NYSE/NASDAQ technical scan', minPlan: 'elite' });
              return;
            }
            setMarket(m);
          }} />
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background:'rgba(255,184,0,0.07)', border:'1px solid rgba(255,184,0,0.22)', borderRadius:12, padding:'10px 15px', marginBottom:16, display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:14, flexShrink:0 }}>🛠️</span>
        <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.65 }}>
          <strong style={{ color:'var(--ylw)' }}>Technical screening tool — not financial advice.</strong>{' '}
          {market === 'fundamental'
            ? 'Fundamental data from Yahoo Finance — P/E, ROE, D/E, Revenue Growth. Screen ~80 curated NSE stocks. Data may be 24h delayed. NOT SEBI registered. DYOR.'
            : `Momentum zones computed from RSI, EMA, volume and ${market === 'india' ? 'sector strength' : 'analyst consensus'}. Shows where price is technically — not what to do. ${market === 'india' ? 'NOT SEBI registered.' : 'NOT SEC registered.'} DYOR.`}
        </div>
      </div>

      {/* ── INDIA CONTENT ────────────────────────────────────────────────── */}
      {market === 'india' && (
        <>
          {/* Universe mode toggle — exactly 4 pills, same style tokens, nothing
              else interleaved into this row (timer/hint/refresh moved to their
              own row below) so the group always reads as one clean unit
              instead of wrapping mid-group on narrow screens.
              Compacted (height 30→28, padding 14→11px, font 12→11) per
              founder ask to reduce widget footprint — 28px stays above the
              ~28px minimum mobile tap-height floor. SIGFX_CLASS/sigfxDelayStyle
              apply the standing shimmer fx, staggered per pill index so it
              reads as a wave settling across the row. */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            <button onClick={() => setPortMode('ml')} className={SIGFX_CLASS}
              style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: portMode==='ml' ? 'rgba(255,184,0,0.12)' : 'var(--surf2)',
                border: portMode==='ml' ? '1px solid rgba(255,184,0,0.35)' : '1px solid var(--bdr)',
                color: portMode==='ml' ? 'var(--ylw)' : 'var(--dim)', ...sigfxDelayStyle(0) }}>
              📡 ML Top 20
            </button>
            <button onClick={() => { setPortMode('beta'); if (!betaLoaded && !betaLoading) loadBeta(); }} className={SIGFX_CLASS}
              style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: portMode==='beta' ? 'rgba(255,92,26,0.12)' : 'var(--surf2)',
                border: portMode==='beta' ? '1px solid rgba(255,92,26,0.35)' : '1px solid var(--bdr)',
                color: portMode==='beta' ? 'var(--org)' : 'var(--dim)', ...sigfxDelayStyle(1) }}>
              ⚡ ML Beta{betaLoading ? ' — scanning…' : betaSignals.length > 0 && portMode==='beta' ? ` (${betaSignals.length})` : ''}
            </button>
            <button onClick={() => { setPortMode('fundamental_top'); if (!fundTopLoaded && !fundTopLoading) loadFundTop(); }} className={SIGFX_CLASS}
              style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: portMode==='fundamental_top' ? 'rgba(0,212,160,0.12)' : 'var(--surf2)',
                border: portMode==='fundamental_top' ? '1px solid rgba(0,212,160,0.35)' : '1px solid var(--bdr)',
                color: portMode==='fundamental_top' ? 'var(--grn)' : 'var(--dim)', ...sigfxDelayStyle(2) }}>
              💎 Fundamental Strong{fundTopLoading ? ' — scanning…' : fundTopSignals.length > 0 && portMode==='fundamental_top' ? ` (${fundTopSignals.length})` : ''}
            </button>
            {isStarter ? (
              <button onClick={() => { setPortMode('portfolio'); if (!portScanLoaded && !portScanLoading) loadPortfolioScan(); }} className={SIGFX_CLASS}
                style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background: portMode==='portfolio' ? 'rgba(23,64,245,0.12)' : 'var(--surf2)',
                  border: portMode==='portfolio' ? '1px solid rgba(23,64,245,0.35)' : '1px solid var(--bdr)',
                  color: portMode==='portfolio' ? 'var(--bluL)' : 'var(--dim)', ...sigfxDelayStyle(3) }}>
                💼 My Portfolio{portScanLoading ? ` — scanning… ${portScanProgress}%` : portScanResults.length > 0 ? ` (${portScanResults.length})` : ''}
              </button>
            ) : (
              <button onClick={() => setUpgradeModal({ feature: 'Portfolio Universe — scan only your holdings', minPlan: 'starter' })} className={SIGFX_CLASS}
                style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', display:'flex', alignItems:'center', gap:6, ...sigfxDelayStyle(3) }}>
                🔒 My Portfolio <span style={{ fontSize:10, background:'rgba(23,64,245,0.15)', color:'var(--bluL)', borderRadius:4, padding:'1px 5px' }}>Starter</span>
              </button>
            )}
            {isStarter ? (
              <button onClick={() => { setPortMode('full_market'); if (!fullMarketLoaded && !fullMarketLoading) loadFullMarket(); }} className={SIGFX_CLASS}
                style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background: portMode==='full_market' ? 'rgba(139,92,246,0.12)' : 'var(--surf2)',
                  border: portMode==='full_market' ? '1px solid rgba(139,92,246,0.35)' : '1px solid var(--bdr)',
                  color: portMode==='full_market' ? 'var(--pur)' : 'var(--dim)', ...sigfxDelayStyle(4) }}>
                🌐 Full Market{fullMarketLoading ? ' — scanning…' : fullMarketSignals.length > 0 && portMode==='full_market' ? ` (${fullMarketSignals.length}${!isElite ? `/${fullMarketTotal}` : ''})` : ''}
              </button>
            ) : (
              <button onClick={() => setUpgradeModal({ feature: 'Full Market Scan — all ~4,000 NSE+BSE stocks, not just the curated 100', minPlan: 'starter' })} className={SIGFX_CLASS}
                style={{ height:28, padding:'0 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', display:'flex', alignItems:'center', gap:6, ...sigfxDelayStyle(4) }}>
                🔒 Full Market <span style={{ fontSize:10, background:'rgba(139,92,246,0.15)', color:'var(--pur)', borderRadius:4, padding:'1px 5px' }}>Starter</span>
              </button>
            )}
          </div>

          {/* Secondary row — timer / progress / refresh, kept out of the pill
              group above on purpose so it can't break that row's rhythm */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', minHeight:20, marginBottom:14 }}>
            {portMode !== 'portfolio' && portMode !== 'fundamental_top' && <ScanTimer meta={activeMeta} />}
            {portMode === 'fundamental_top' && <ScanTimer meta={fundTopMeta} />}
            {portMode === 'portfolio' && portScanLoading && (
              <div style={{ flex:1, height:4, background:'var(--bdr)', borderRadius:99, overflow:'hidden', minWidth:80, maxWidth:200 }}>
                <div style={{ height:'100%', width:`${portScanProgress}%`, background:'var(--blu)', borderRadius:99, transition:'width 0.3s' }}/>
              </div>
            )}
            {portMode === 'portfolio' && !portScanLoading && portScanLoaded && (
              <>
                <span className="sig-sort-hint" style={{ fontSize:11, color:'var(--dim)' }}>sorted by ₹ invested</span>
                <button onClick={() => { setPortScanLoaded(false); loadPortfolioScan(); }}
                  style={{ height:30, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)' }}>
                  ↺ Refresh
                </button>
              </>
            )}
          </div>

          {/* Context — what each pill actually means, per user ask that these
              needed explaining rather than just being unlabeled buttons */}
          {portMode !== 'portfolio' && (
            <div style={{ fontSize:11.5, color:'var(--dim)', lineHeight:1.6, marginBottom:14, padding:'8px 12px', background:'var(--surf2)', borderRadius:8, border:'1px solid var(--bdr)' }}>
              {portMode === 'ml' && <>📡 <strong style={{ color:'var(--txt)' }}>ML Top 20</strong> — scans 100 curated NSE stocks across 25 sectors, filters for RSI 42–62 (room to move, not overbought/oversold) and price within 8% of the 20-day EMA (trend intact, not overextended), ranks by how close each stock is to the ideal momentum zone. These are the strongest all-round technical setups right now.</>}
              {portMode === 'beta' && <>⚡ <strong style={{ color:'var(--txt)' }}>ML Beta</strong> — same universe, ranked by ATR% (average daily price range) instead of a balanced score: the stocks that actually move the most day to day, for shorter swing windows. Higher potential reward, higher volatility — not the same as statistical market beta.</>}
              {portMode === 'fundamental_top' && <>💎 <strong style={{ color:'var(--txt)' }}>Fundamental Strong</strong> — ignores price action entirely. Ranks by valuation (lower P/E), efficiency (higher ROE), balance-sheet safety (lower debt/equity) and growth (revenue growth) — a composite quality score. A stock can top this list and be flat/red on the Top 20 scan, on purpose: different lens, longer horizon.</>}
              {portMode === 'full_market' && <>🌐 <strong style={{ color:'var(--txt)' }}>Full Market</strong> — the same RSI/EMA screen as ML Top 20, run across all ~4,000 NSE+BSE stocks instead of a curated 100. Runs once daily, pre-market. {isElite ? 'Elite unlocks every qualifying stock.' : isPro ? `Pro shows the top 500 of ${fullMarketTotal} qualifying today — upgrade to Elite for the full list.` : `Starter shows the top 100 of ${fullMarketTotal} qualifying today — upgrade for deeper access.`}</>}
            </div>
          )}

          {/* Zone KPIs — compacted (padding 14/18→10/14, radius 16→14, number
              44→22px, gap 12→8) since these were the founder's #1 example of
              a widget eating too much space. Count now rolls up from 0 via
              AnimatedCount instead of snapping to the final number, and the
              card carries the standing shimmer fx class/stagger. */}
          {portMode !== 'fundamental_top' && !(portMode === 'portfolio' ? portScanLoading : portMode === 'beta' ? betaLoading : portMode === 'full_market' ? fullMarketLoading : mlLoading) && activeSignals.length > 0 && (
            <div className="g4" style={{ display:'grid', gap:8, marginBottom:18 }}>
              {[
                { label:'Strong Momentum', cnt:buyCnt,        grad:'linear-gradient(135deg,rgba(0,212,160,0.13),rgba(0,212,160,0.03))',  bdr:'rgba(0,212,160,0.30)',  color:'var(--grn)' },
                { label:'Building',        cnt:accumulateCnt, grad:'linear-gradient(135deg,rgba(79,111,250,0.12),rgba(79,111,250,0.03))', bdr:'rgba(79,111,250,0.28)', color:'var(--bluL)' },
                { label:'Sideways',        cnt:holdCnt,       grad:'linear-gradient(135deg,rgba(255,184,0,0.10),rgba(255,184,0,0.02))',   bdr:'rgba(255,184,0,0.27)',  color:'var(--ylw)' },
                { label:'Weak / Declining',cnt:sellCnt,       grad:'linear-gradient(135deg,rgba(255,59,92,0.10),rgba(255,59,92,0.02))',   bdr:'rgba(255,59,92,0.25)',  color:'var(--red)' },
              ].map((m, i) => (
                <div key={m.label} className={SIGFX_CLASS}
                  style={{ background:m.grad, border:`1px solid ${m.bdr}`, borderRadius:14, padding:'10px 14px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...sigfxDelayStyle(i) }}>
                  <div style={{ fontSize:9, fontWeight:800, color:m.color, letterSpacing:1.3, textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:m.color }}><AnimatedCount value={m.cnt} /></div>
                  <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>signals</div>
                </div>
              ))}
            </div>
          )}

          {/* Controls — search on own row, pills scrollable below */}
          <div style={{ position:'relative', marginBottom:10, isolation:'isolate', zIndex:250 }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, opacity:0.5 }}>{analysing ? '⏳' : searchLoading ? '⌛' : '🔍'}</span>
            <input value={search} onChange={e => onSearchChange(e.target.value)}
              onFocus={() => searchResults.length && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
              placeholder="Search any NSE stock…"
              style={{ width:'100%', height:36, paddingLeft:34, paddingRight:10, borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--txt)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}/>
            {showDropdown && searchResults.length > 0 && (
              <div style={{ position:'absolute', top:40, left:0, right:0, background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, zIndex:999, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', overflow:'hidden' }}>
                {searchResults.map(item => (
                  <button key={item.ticker} onPointerDown={() => analyseStock(item)}
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
          {portMode !== 'fundamental_top' && (
          <div className="signals-filters" style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ height:34, padding:'0 12px', borderRadius:9, border:`1px solid ${filter===f.key ? 'var(--grn)' : 'var(--bdr)'}`, background: filter===f.key ? 'rgba(0,212,160,0.12)' : 'var(--surf)', color: filter===f.key ? 'var(--grn)' : 'var(--dim)', fontSize:12, fontWeight: filter===f.key ? 700 : 500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                <span className="pill-full">{f.label}</span>
                <span className="pill-short">{f.shortLabel}</span>
              </button>
            ))}
            <button onClick={portMode === 'beta' ? loadBeta : portMode === 'full_market' ? loadFullMarket : loadIndia} style={{ height:34, padding:'0 12px', borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto', flexShrink:0 }}>🔄</button>
            <button onClick={() => setShowAdv(v => !v)}
              style={{ height:34, padding:'0 12px', borderRadius:9, border:`1px solid ${advActive ? 'var(--pur)' : 'var(--bdr)'}`, background: advActive ? 'rgba(139,92,246,0.12)' : 'var(--surf)', color: advActive ? 'var(--pur)' : 'var(--dim)', fontSize:12, fontWeight: advActive ? 700 : 500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
              ⚙{advActive ? ' •' : ''}
            </button>
          </div>
          )}

          {/* Advanced filter panel */}
          {portMode !== 'fundamental_top' && showAdv && (
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

          {portMode !== 'fundamental_top' && (portMode === 'portfolio' ? portScanLoading && portScanResults.length === 0 : portMode === 'beta' ? betaLoading : portMode === 'full_market' ? fullMarketLoading : mlLoading) && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height:88, borderRadius:14, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>)}
            </div>
          )}

          {portMode === 'ml' && !mlLoading && mlError && (
            <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:14, padding:'20px 24px' }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>⚠️ ML Signals unavailable</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
                Live ML signals require the backend API to be running. Use the Portfolio page to track holdings and P&L.
              </div>
            </div>
          )}

          {portMode !== 'fundamental_top' && !(portMode === 'portfolio' ? portScanLoading && portScanResults.length === 0 : portMode === 'beta' ? betaLoading : portMode === 'full_market' ? fullMarketLoading : mlLoading) && shown.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {shown.map((sig, sigIdx) => {
                const locked = !isStarter && sigIdx >= FREE_LIMIT;
                const inPortfolio = portfolioSymbols.includes(sig.symbol.replace(/\.(NS|BO)$/, ''));
                const secBg = sectorColor(sig.sector);
                return (
                  <div key={sig.symbol} className={SIGFX_CLASS} style={{ position:'relative', borderRadius:14, ...sigfxDelayStyle(sigIdx) }}
                    onClick={() => {
                      if (!isStarter) {
                        setUpgradeModal({ feature: 'ML signal detail — entry range, targets, stop-loss', minPlan: 'starter' });
                        return;
                      }
                      setSelected(sig);
                    }}>
                    {/* Blur overlay for locked rows */}
                    {locked && (
                      <div style={{ position:'absolute', inset:0, zIndex:2, borderRadius:16, backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)', background:'rgba(7,13,26,0.55)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', gap:8 }}>
                        <span style={{ fontSize:14 }}>🔒</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--dim)' }}>Starter to unlock</span>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--bluL)', background:'rgba(23,64,245,0.2)', border:'1px solid rgba(23,64,245,0.35)', borderRadius:5, padding:'2px 7px' }}>₹299/mo</span>
                      </div>
                    )}
                    <div
                      style={{ background:`linear-gradient(160deg,${secBg},var(--card-bg))`, border:'1px solid var(--card-bdr)', borderRadius:14, padding:'11px 13px', cursor:'pointer', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:10, alignItems:'center', ...(locked ? { filter:'blur(1.5px)', userSelect:'none', pointerEvents:'none' } : {}) }}
                      onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLElement).style.borderColor='rgba(0,212,160,0.4)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--card-bdr)'; }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:secBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'var(--txt)', flexShrink:0, border:'1px solid rgba(255,255,255,0.06)' }}>
                        {sig.symbol.replace(/\.(NS|BO)$/, '').slice(0,4)}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sig.symbol.replace(/\.(NS|BO)$/, '')}</span>
                          {inPortfolio && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)', flexShrink:0 }}>PORTFOLIO</span>}
                        </div>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                          {(() => {
                            const cat = scoreSig(sig);
                            const cfg = { buy:{ label:'Strong Momentum', bg:'rgba(0,212,160,0.12)', color:'var(--grn)', border:'rgba(0,212,160,0.25)' }, accumulate:{ label:'Building', bg:'rgba(79,111,250,0.12)', color:'var(--bluL)', border:'rgba(79,111,250,0.25)' }, hold:{ label:'Sideways', bg:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'rgba(255,184,0,0.25)' }, sell:{ label:'Weak / Declining', bg:'rgba(255,59,92,0.12)', color:'var(--red)', border:'rgba(255,59,92,0.25)' } }[cat];
                            return <span style={{ fontSize:8, fontWeight:700, padding:'1px 6px', borderRadius:4, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' }}>{cfg.label}</span>;
                          })()}
                          {sig.bias && (
                            <span style={{ fontSize:8, fontWeight:700, padding:'1px 6px', borderRadius:4, background:biasColor(sig.bias).bg, color:biasColor(sig.bias).color, border:`1px solid ${biasColor(sig.bias).color}40`, whiteSpace:'nowrap' }}>
                              {`B: ${biasLabel(sig.bias)}`}
                            </span>
                          )}
                          <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>RSI {sig.rsi}</span>
                          <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>EMA {sig.ema_dist_pct > 0 ? '+' : ''}{sig.ema_dist_pct}%</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:14, fontWeight:900 }}>₹{sig.cmp.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', marginTop:1 }}>T₹{sig.target.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                        <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                          <div style={{ width:40, height:4, borderRadius:2, background:'var(--bdr)' }}>
                            <div style={{ width:`${sig.confidence}%`, height:'100%', borderRadius:2, background:confColor(sig.confidence) }}/>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:confColor(sig.confidence) }}>{sig.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Upgrade CTA strip — free users only */}
              {!isStarter && shown.length > FREE_LIMIT && (
                <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.10),rgba(139,92,246,0.06))', border:'1px solid rgba(23,64,245,0.28)', borderRadius:16, padding:'20px 24px', textAlign:'center', marginTop:4 }}>
                  <div style={{ fontSize:14, fontWeight:800, marginBottom:6 }}>
                    🔒 {shown.length - FREE_LIMIT} more signals locked
                  </div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6, marginBottom:14 }}>
                    Starter unlocks all {shown.length} signals · entry ranges · targets · stop-losses · portfolio universe scan
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                    {!isNative && (
                      <Link href="/dashboard/upgrade" style={{ height:38, padding:'0 22px', borderRadius:10, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                        Upgrade to Starter — ₹299/mo →
                      </Link>
                    )}
                    <Link href="/dashboard/track-record" style={{ height:38, padding:'0 16px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                      See track record first
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {portMode !== 'fundamental_top' && !mlLoading && !mlError && shown.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No results for this filter</div>
              <button onClick={() => { setFilter('all'); setSearch(''); }} style={{ height:34, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Show All</button>
            </div>
          )}

          {/* ── Fundamental Strong results — different shape than the technical
              cards above (quality_score/PE/ROE/D:E, no RSI/EMA), own block */}
          {portMode === 'fundamental_top' && fundTopLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height:88, borderRadius:14, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>)}
            </div>
          )}
          {portMode === 'fundamental_top' && !fundTopLoading && fundTopSignals.length === 0 && fundTopLoaded && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, color:'var(--dim)', fontSize:13 }}>
              No results — Yahoo fundamentals may be rate-limited, try refreshing in a minute.
            </div>
          )}
          {portMode === 'fundamental_top' && !fundTopLoading && fundTopSignals.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {fundTopSignals.map(s => (
                <div key={s.symbol} style={{ background:'linear-gradient(160deg,rgba(0,212,160,0.06),var(--card-bg))', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'11px 13px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:10, alignItems:'center' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'rgba(0,212,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'var(--grn)', flexShrink:0, border:'1px solid rgba(0,212,160,0.2)' }}>
                    {s.symbol.replace(/\.NS$/,'').slice(0,4)}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.symbol.replace(/\.NS$/,'')}</span>
                      <span style={{ fontSize:8, fontWeight:700, padding:'1px 6px', borderRadius:4, background:'rgba(0,212,160,0.12)', color:'var(--grn)', border:'1px solid rgba(0,212,160,0.25)', whiteSpace:'nowrap' }}>Quality {s.quality_score}</span>
                    </div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>P/E {s.trailing_pe ?? '—'}</span>
                      <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>ROE {s.roe != null ? `${s.roe}%` : '—'}</span>
                      <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>D/E {s.debt_to_equity ?? '—'}</span>
                      <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>Rev {s.revenue_growth != null ? `${s.revenue_growth}%` : '—'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:900 }}>{s.cmp ? `₹${s.cmp.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</div>
                    <div style={{ fontSize:10, fontWeight:700, marginTop:1, color: s.chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{s.chg >= 0 ? '+' : ''}{s.chg}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── US CONTENT ───────────────────────────────────────────────────── */}
      {market === 'us' && (
        <>
          {/* US scan mode toggle — Top 20 (curated) vs Full Market (~7-8k
              stocks, Alpaca). Whole US tab is already Elite-only, so no
              further depth gating needed on Full Market itself. */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            <button onClick={() => setUsMode('top20')}
              style={{ height:30, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: usMode==='top20' ? 'rgba(79,111,250,0.12)' : 'var(--surf2)',
                border: usMode==='top20' ? '1px solid rgba(79,111,250,0.35)' : '1px solid var(--bdr)',
                color: usMode==='top20' ? 'var(--bluL)' : 'var(--dim)' }}>
              📡 Top 20
            </button>
            <button onClick={() => { setUsMode('full_market'); if (!usFullMarketLoaded && !usFullMarketLoading) loadUSFullMarket(); }}
              style={{ height:30, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: usMode==='full_market' ? 'rgba(139,92,246,0.12)' : 'var(--surf2)',
                border: usMode==='full_market' ? '1px solid rgba(139,92,246,0.35)' : '1px solid var(--bdr)',
                color: usMode==='full_market' ? 'var(--pur)' : 'var(--dim)' }}>
              🌐 Full Market{usFullMarketLoading ? ' — scanning…' : usFullMarketSignals.length > 0 && usMode==='full_market' ? ` (${usFullMarketSignals.length})` : ''}
            </button>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', minHeight:20, marginBottom:14 }}>
            {usMode === 'full_market' && <ScanTimer meta={usFullMarketMeta} />}
          </div>

          {/* Zone KPIs — same size/space compaction as the India tab above.
              No shimmer fx wired here: the finalized target groups (universe
              pills / KPI cards / signal rows) are the India tab only, per
              the original pilot scope. */}
          {!activeUSLoading && activeUSSignals.length > 0 && (
            <div className="g4" style={{ display:'grid', gap:8, marginBottom:18 }}>
              {(['Strong Momentum','Building','Sideways','Weak / Declining'] as const).map(zone => {
                const st = ZONE_STYLE[zone];
                return (
                  <div key={zone} style={{ background:st.grad, border:`1px solid ${st.bdr}`, borderRadius:14, padding:'10px 14px' }}>
                    <div style={{ fontSize:9, fontWeight:800, color:st.color, letterSpacing:1.3, textTransform:'uppercase', marginBottom:4 }}>{zone}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:st.color }}><AnimatedCount value={US_ZONE_COUNTS[zone]} /></div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>stocks</div>
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
            <button onClick={() => { if (usMode === 'full_market') { setUsFullMarketLoaded(false); loadUSFullMarket(); } else { setUsLoaded(false); loadUS(); } }} style={{ height:36, padding:'0 14px', borderRadius:9, border:'1px solid var(--card-bdr)', background:'var(--card-bg)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🔄</button>
          </div>

          {activeUSLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height:80, borderRadius:14, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite', opacity:0.7 }}/>)}
            </div>
          )}

          {!activeUSLoading && shownUS.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {shownUS.map(sig => {
                const st = zs(sig.zone);
                const inPort = usPortSet.has(sig.symbol);
                const cmp = sig.cmp;
                const chg = sig.chg;
                return (
                  <div key={sig.symbol} onClick={() => setSelectedUS(sig)}
                    style={{ background:`linear-gradient(160deg,${st.grad},var(--card-bg))`, border:'1px solid var(--card-bdr)', borderRadius:14, padding:'11px 13px', cursor:'pointer', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:10, alignItems:'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = st.bdr; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-bdr)'; }}>

                    <div style={{ width:40, height:40, borderRadius:10, background:st.bg, border:`1px solid ${st.bdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:st.color, flexShrink:0 }}>
                      {sig.symbol.slice(0,4)}
                    </div>

                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sig.symbol}</span>
                        {inPort && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)', flexShrink:0 }}>PORTFOLIO</span>}
                      </div>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontSize:8, fontWeight:700, padding:'1px 6px', borderRadius:4, background:st.bg, color:st.color, border:`1px solid ${st.bdr}`, whiteSpace:'nowrap' }}>{sig.zone}</span>
                        <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>RSI {sig.rsi}</span>
                        <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>EMA {sig.ema_dist_pct > 0 ? '+' : ''}{sig.ema_dist_pct}%</span>
                        <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'var(--surf2)', color: chg >= 0 ? 'var(--grn)' : 'var(--red)', border:'1px solid var(--card-bdr)', whiteSpace:'nowrap' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:900 }}>{cmp ? `$${cmp.toFixed(2)}` : '—'}</div>
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>T ${sig.target}</div>
                      <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                        <div style={{ width:40, height:4, borderRadius:2, background:'var(--bdr)' }}>
                          <div style={{ width:`${sig.confidence}%`, height:'100%', borderRadius:2, background:confColor(sig.confidence) }}/>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:confColor(sig.confidence) }}>{sig.confidence}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!activeUSLoading && !activeUSLoaded && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🇺🇸</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Loading US market scan…</div>
            </div>
          )}

          {!activeUSLoading && activeUSLoaded && shownUS.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No results</div>
              <button onClick={() => { setUsFilter('all'); setUsSearch(''); }} style={{ height:34, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Show All</button>
            </div>
          )}

          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
            Scanning a 100-stock US universe for RSI 42-62 + near-EMA20 swing setups · Prices from Yahoo Finance · NOT SEC REGISTERED · Not investment advice · DYOR
          </div>
        </>
      )}

      {/* ── FUNDAMENTAL SCREENER ─────────────────────────────────────────── */}
      {market === 'fundamental' && (() => {
        const SECTORS = ['All','IT','Banking','Finance','Auto','Pharma','FMCG','Metals','Energy','Realty','Telecom','Consumer','Cement','Infra','Hospital','Diversified'];
        const CAP_BUCKETS = ['All','Large Cap (>₹20K Cr)','Mid Cap (₹5K–20K Cr)','Small Cap (<₹5K Cr)'];
        const capFilter = (mc: number | null) => {
          if (fundCapBucket === 'All' || mc == null) return true;
          if (fundCapBucket.startsWith('Large')) return mc > 2e11;
          if (fundCapBucket.startsWith('Mid'))   return mc >= 5e10 && mc <= 2e11;
          return mc < 5e10;
        };
        const filtered = fundResults.filter(s => {
          if (fundSector !== 'All' && s.sector !== fundSector) return false;
          if (!capFilter(s.market_cap)) return false;
          if (fundPeMax  && s.trailing_pe != null && s.trailing_pe > +fundPeMax)   return false;
          if (fundRoeMin && s.roe         != null && s.roe          < +fundRoeMin) return false;
          if (fundDeMax  && s.debt_to_equity != null && s.debt_to_equity > +fundDeMax) return false;
          if (fundRevMin && s.revenue_growth != null && s.revenue_growth < +fundRevMin) return false;
          return true;
        }).sort((a, b) => {
          const av = a[fundSort.col] as number | null;
          const bv = b[fundSort.col] as number | null;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * fundSort.dir;
        });

        const fmtCap = (mc: number | null) => {
          if (mc == null) return '—';
          if (mc >= 1e12) return `₹${(mc/1e12).toFixed(1)}L Cr`;
          if (mc >= 1e9)  return `₹${(mc/1e9).toFixed(0)}K Cr`;
          return `₹${(mc/1e7).toFixed(0)} Cr`;
        };
        const sortBtn = (col: keyof FundStock, label: string) => (
          <th key={col} onClick={() => setFundSort(s => ({ col, dir: s.col === col ? -s.dir as 1|-1 : -1 }))}
            style={{ padding:'8px 10px', textAlign: col === 'symbol' || col === 'sector' || col === 'name' ? 'left' : 'right', color:'var(--dim)', fontWeight:700, fontSize:10, cursor:'pointer', whiteSpace:'nowrap', userSelect:'none' }}>
            {label}{fundSort.col === col ? (fundSort.dir === -1 ? ' ▼' : ' ▲') : ''}
          </th>
        );

        return (
          <>
            {/* Filter panel */}
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, marginBottom:4 }}>SECTOR</div>
                  <select value={fundSector} onChange={e => setFundSector(e.target.value)}
                    style={{ width:'100%', height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit' }}>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, marginBottom:4 }}>MARKET CAP</div>
                  <select value={fundCapBucket} onChange={e => setFundCapBucket(e.target.value)}
                    style={{ width:'100%', height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit' }}>
                    {CAP_BUCKETS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {[
                  { label:'P/E MAX', val:fundPeMax, set:setFundPeMax, ph:'e.g. 25' },
                  { label:'ROE MIN %', val:fundRoeMin, set:setFundRoeMin, ph:'e.g. 15' },
                  { label:'D/E MAX', val:fundDeMax, set:setFundDeMax, ph:'e.g. 1.5' },
                  { label:'REV GROWTH MIN %', val:fundRevMin, set:setFundRevMin, ph:'e.g. 10' },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, marginBottom:4 }}>{f.label}</div>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type="number"
                      style={{ width:'100%', height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, padding:'0 8px', fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button onClick={() => loadFundamentals()}
                  disabled={fundLoading}
                  style={{ height:38, padding:'0 22px', borderRadius:10, background:'var(--grn)', border:'none', color:'#000', fontWeight:800, fontSize:13, cursor:fundLoading ? 'wait' : 'pointer', fontFamily:'inherit', opacity: fundLoading ? 0.7 : 1 }}>
                  {fundLoading ? '⏳ Scanning…' : fundLoaded ? '🔄 Re-scan' : '🔍 Run Scan'}
                </button>
                {fundLoaded && <span style={{ fontSize:11, color:'var(--dim)' }}>{filtered.length} of {fundResults.length} stocks</span>}
                {(fundPeMax || fundRoeMin || fundDeMax || fundRevMin || fundSector !== 'All' || fundCapBucket !== 'All') && (
                  <button onClick={() => { setFundSector('All'); setFundCapBucket('All'); setFundPeMax(''); setFundRoeMin(''); setFundDeMax(''); setFundRevMin(''); }}
                    style={{ height:34, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {!fundLoaded && !fundLoading && (
              <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Fundamental Screener</div>
                <div style={{ fontSize:13, color:'var(--dim)', marginBottom:18 }}>Scans ~80 NSE stocks · P/E · ROE · D/E · Revenue Growth · Market Cap<br/>Set filters above and click Run Scan</div>
                <button onClick={() => loadFundamentals()}
                  style={{ height:40, padding:'0 28px', borderRadius:11, background:'var(--grn)', border:'none', color:'#000', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  🔍 Run Scan
                </button>
              </div>
            )}

            {fundLoading && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Array.from({length:6}).map((_,i) => (
                  <div key={i} style={{ height:44, background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:10, animation:'pulse 1.5s ease-in-out infinite', opacity: 1 - i*0.12 }}/>
                ))}
                <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center' }}>Fetching fundamentals from Yahoo Finance…</div>
              </div>
            )}

            {!fundLoading && fundLoaded && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'2px solid var(--bdr)', background:'var(--surf)' }}>
                      {sortBtn('symbol','Symbol')}
                      {sortBtn('sector','Sector')}
                      {sortBtn('price','Price')}
                      {sortBtn('change_pct','Chg%')}
                      {sortBtn('trailing_pe','P/E')}
                      {sortBtn('price_to_book','P/B')}
                      {sortBtn('roe','ROE%')}
                      {sortBtn('net_margin','Net Margin')}
                      {sortBtn('debt_to_equity','D/E')}
                      {sortBtn('revenue_growth','Rev Growth')}
                      {sortBtn('dividend_yield','Div Yield')}
                      {sortBtn('market_cap','Mkt Cap')}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.symbol} style={{ borderBottom:'1px solid var(--bdr)', transition:'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding:'9px 10px', fontWeight:800 }}>{s.symbol}</td>
                        <td style={{ padding:'9px 10px', color:'var(--dim)', fontSize:11 }}>{s.sector}</td>
                        <td style={{ padding:'9px 10px', textAlign:'right' }}>{s.price != null ? `₹${s.price.toLocaleString('en-IN',{maximumFractionDigits:1})}` : '—'}</td>
                        <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, color: s.change_pct != null ? (s.change_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--dim)' }}>
                          {s.change_pct != null ? `${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color: s.trailing_pe != null ? (s.trailing_pe < 15 ? 'var(--grn)' : s.trailing_pe > 40 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' }}>
                          {s.trailing_pe != null ? `${s.trailing_pe}×` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right' }}>{s.price_to_book != null ? `${s.price_to_book}×` : '—'}</td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color: s.roe != null ? (s.roe > 20 ? 'var(--grn)' : s.roe < 8 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' }}>
                          {s.roe != null ? `${s.roe}%` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color: s.net_margin != null ? (s.net_margin > 15 ? 'var(--grn)' : s.net_margin < 5 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' }}>
                          {s.net_margin != null ? `${s.net_margin}%` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color: s.debt_to_equity != null ? (s.debt_to_equity < 0.5 ? 'var(--grn)' : s.debt_to_equity > 2 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' }}>
                          {s.debt_to_equity != null ? s.debt_to_equity : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color: s.revenue_growth != null ? (s.revenue_growth > 15 ? 'var(--grn)' : s.revenue_growth < 0 ? 'var(--red)' : 'var(--txt)') : 'var(--dim)' }}>
                          {s.revenue_growth != null ? `${s.revenue_growth > 0 ? '+' : ''}${s.revenue_growth}%` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color:'var(--ylw)' }}>
                          {s.dividend_yield != null ? `${s.dividend_yield}%` : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', textAlign:'right', color:'var(--dim)' }}>{fmtCap(s.market_cap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div style={{ textAlign:'center', padding:'32px', color:'var(--dim)' }}>No stocks match current filters</div>
                )}
              </div>
            )}

            <div style={{ fontSize:11, color:'var(--dim2)', marginTop:12 }}>
              Fundamental data from Yahoo Finance · ~80 curated NSE stocks · NOT SEBI REGISTERED · Not investment advice · DYOR · Data may be delayed
            </div>
          </>
        );
      })()}

      {selected  && <DetailDrawer   sig={selected}   onClose={() => setSelected(null)} isElite={isElite} session={session} />}
      {selectedUS && <USDetailDrawer sig={selectedUS} onClose={() => setSelectedUS(null)} isElite={isElite} />}
      {upgradeModal && <UpgradeModal feature={upgradeModal.feature} minPlan={upgradeModal.minPlan} onClose={() => setUpgradeModal(null)} />}
    </>
  );
}
