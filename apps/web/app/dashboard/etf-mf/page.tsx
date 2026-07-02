'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
const CAT_BDR: Record<string, string> = {
  'Index':'rgba(23,64,245,0.38)',   'Midcap':'rgba(139,92,246,0.38)',
  'Sectoral':'rgba(255,92,26,0.38)','Gold':'rgba(255,184,0,0.45)',
  'Debt':'rgba(0,212,160,0.35)',    'Flexi Cap':'rgba(0,212,160,0.35)',
  'Large Cap':'rgba(23,64,245,0.35)','Small Cap':'rgba(255,59,92,0.38)',
  'Mid Cap':'rgba(139,92,246,0.35)','ELSS':'rgba(255,184,0,0.38)',
};
const CAT_ACCENT: Record<string, string> = {
  'Index':'var(--bluL)','Midcap':'var(--pur)','Sectoral':'var(--org)',
  'Gold':'var(--ylw)','Debt':'var(--grn)','Flexi Cap':'var(--grn)',
  'Large Cap':'var(--bluL)','Small Cap':'var(--red)','Mid Cap':'var(--pur)','ELSS':'var(--ylw)',
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

interface MFHolding {
  id: string;
  scheme_code: string;
  scheme_name: string;
  units: number;
  avg_nav: number;
  current_nav?: number | null;
  nav_date?: string;
  created_at: string;
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ETFMFPage() {
  const [tab, setTab] = useState<'etf'|'mf'|'compare'|'holdings'|'sip'>('etf');

  // ── SIP Calculator ─────────────────────────────────────────────────────────
  const [sipMonthly, setSipMonthly]   = useState('5000');
  const [sipReturn,  setSipReturn]    = useState('12');
  const [sipYears,   setSipYears]     = useState('15');
  const [sipStepUp,  setSipStepUp]    = useState('10');

  function calcSIP(monthly: number, annualReturn: number, years: number, stepUpPct: number) {
    const r = annualReturn / 12 / 100;
    let corpus = 0; let totalInvested = 0;
    const data: { year: number; corpus: number; invested: number }[] = [];
    for (let y = 1; y <= years; y++) {
      const monthlyAmt = monthly * Math.pow(1 + stepUpPct / 100, y - 1);
      for (let m = 0; m < 12; m++) {
        corpus = corpus * (1 + r) + monthlyAmt;
        totalInvested += monthlyAmt;
      }
      data.push({ year: y, corpus: Math.round(corpus), invested: Math.round(totalInvested) });
    }
    return data;
  }

  function calcLumpsum(total: number, annualReturn: number, years: number) {
    return Math.round(total * Math.pow(1 + annualReturn / 100, years));
  }

  // Best ETFs — live prices
  const [etfPrices, setEtfPrices] = useState<Record<string, { price: number; chg: number }>>({});
  const [etfLoading, setEtfLoading] = useState(true);

  // ── Session ──────────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── ETF Holdings (localStorage — unchanged) ───────────────────────────────
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addKind] = useState<'etf'|'mf'>('etf');
  const [addLabel, setAddLabel] = useState('');
  const [addUnits, setAddUnits] = useState('');
  const [addBuy, setAddBuy] = useState('');
  const [addCurrent, setAddCurrent] = useState('');

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

  // ── MF Holdings (Supabase + MFAPI) ───────────────────────────────────────
  const [mfHoldings, setMfHoldings]   = useState<MFHolding[]>([]);
  const [mfLoading, setMfLoading]     = useState(false);
  const [mfSaving, setMfSaving]       = useState(false);

  // Search state
  const [mfQuery, setMfQuery]         = useState('');
  const [mfResults, setMfResults]     = useState<{ schemeCode: string; schemeName: string }[]>([]);
  const [mfSearching, setMfSearching] = useState(false);
  const [mfSelected, setMfSelected]   = useState<{ schemeCode: string; schemeName: string } | null>(null);
  const [mfUnits, setMfUnits]         = useState('');
  const [mfAvgNav, setMfAvgNav]       = useState('');
  const [showMfForm, setShowMfForm]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMFHoldings = useCallback(async (sess: Session) => {
    setMfLoading(true);
    const res = await fetch(`${SUPA_URL}/rest/v1/mf_holdings?user_id=eq.${sess.user.id}&select=*&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${sess.access_token}` },
    });
    if (!res.ok) { setMfLoading(false); return; }
    const rows: MFHolding[] = await res.json();
    setMfHoldings(rows);
    // Fetch live NAVs
    const updated = await Promise.all(rows.map(async r => {
      const nr = await fetch(`/api/mf-nav?code=${r.scheme_code}`);
      if (!nr.ok) return r;
      const { nav, date } = await nr.json();
      return { ...r, current_nav: nav ?? null, nav_date: date };
    }));
    setMfHoldings(updated);
    setMfLoading(false);
  }, []);

  useEffect(() => {
    if (session && tab === 'holdings') loadMFHoldings(session);
  }, [session, tab, loadMFHoldings]);

  // Debounced MF search
  function handleMfSearch(q: string) {
    setMfQuery(q);
    setMfSelected(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setMfResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setMfSearching(true);
      const res = await fetch(`/api/mf-search?q=${encodeURIComponent(q)}`);
      setMfResults(res.ok ? await res.json() : []);
      setMfSearching(false);
    }, 350);
  }

  async function handleAddMF() {
    if (!session || !mfSelected || !mfUnits || !mfAvgNav) return;
    setMfSaving(true);
    const res = await fetch(`${SUPA_URL}/rest/v1/mf_holdings`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, scheme_code: mfSelected.schemeCode, scheme_name: mfSelected.schemeName, units: parseFloat(mfUnits), avg_nav: parseFloat(mfAvgNav) }),
    });
    if (res.ok) {
      setMfSelected(null); setMfQuery(''); setMfUnits(''); setMfAvgNav(''); setMfResults([]); setShowMfForm(false);
      loadMFHoldings(session);
    }
    setMfSaving(false);
  }

  async function handleRemoveMF(id: string) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/mf_holdings?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    setMfHoldings(prev => prev.filter(h => h.id !== id));
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
    border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13,
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
        {(['etf','mf','compare','holdings','sip'] as const).map(t => {
          const labels: Record<string, string> = { etf:'📈 Best ETFs', mf:'🏦 Best MFs', compare:'ETF vs MF', holdings:`💼 My Holdings (${holdings.length})`, sip:'🧮 SIP Calculator' };
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
                <div key={e.sym} className="hover-lift" style={{ background:`linear-gradient(145deg,${CAT_COLORS[e.cat] ?? 'rgba(23,64,245,0.1)'},var(--card-bg))`, border:`1px solid ${CAT_BDR[e.cat] ?? 'var(--card-bdr)'}`, borderTop:`2px solid ${CAT_BDR[e.cat] ?? 'var(--bluL)'}`, borderRadius:14, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background: CAT_COLORS[e.cat] ?? 'rgba(23,64,245,0.1)', border:`1px solid ${CAT_BDR[e.cat] ?? 'var(--card-bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0, color: CAT_ACCENT[e.cat] ?? 'var(--txt)' }}>
                      {e.name.slice(0,3).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800 }}>{e.name}</div>
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{e.full}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background: CAT_COLORS[e.cat] ?? 'rgba(23,64,245,0.1)', border:`1px solid ${CAT_BDR[e.cat] ?? 'var(--card-bdr)'}`, color: CAT_ACCENT[e.cat] ?? 'var(--txt)', flexShrink:0 }}>{e.cat}</span>
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
                    <div key={m.name} className="hover-lift" style={{ background:`linear-gradient(145deg,${CAT_COLORS[m.cat] ?? 'rgba(23,64,245,0.08)'},var(--card-bg))`, border:`1px solid ${CAT_BDR[m.cat] ?? 'var(--card-bdr)'}`, borderLeft:`3px solid ${CAT_BDR[m.cat] ?? 'var(--bluL)'}`, borderRadius:13, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background: CAT_COLORS[m.cat] ?? 'rgba(23,64,245,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>
                        {m.amc.slice(0,3).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:800 }}>{m.name}</span>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)', border:'1px solid var(--card-bdr)' }}>{m.type}</span>
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
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:20, marginBottom:20 }}>
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
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
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
          {/* CAMS Auto-Import Coming Soon Banner */}
          <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(23,64,245,0.08))', border:'1px solid rgba(139,92,246,0.3)', borderRadius:14, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🔗</div>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--pur)', marginBottom:2 }}>CAMS Auto-Import — Coming Soon</div>
              <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5 }}>
                One-tap import of all your MFs via PAN + OTP (no CSV, no upload). In progress with CAMS tech partnership.
              </div>
            </div>
            <span style={{ fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:20, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', flexShrink:0 }}>COMING SOON</span>
          </div>

          {/* ── MF Holdings (Supabase + MFAPI live NAV) ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800 }}>🏦 Mutual Fund Portfolio</div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>Live NAV from AMFI · Saved to your account</div>
              </div>
              <button onClick={() => { setShowMfForm(v => !v); setMfQuery(''); setMfResults([]); setMfSelected(null); setMfUnits(''); setMfAvgNav(''); }}
                style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {showMfForm ? '✕ Cancel' : '+ Add Fund'}
              </button>
            </div>

            {/* Add MF form */}
            {showMfForm && (
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
                {/* Search */}
                <div style={{ marginBottom:12, position:'relative' }}>
                  <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>SEARCH FUND</div>
                  <input value={mfQuery} onChange={e => handleMfSearch(e.target.value)}
                    placeholder="e.g. SBI Small Cap, Parag Parikh Flexi…"
                    style={{ ...inp, paddingRight: mfSearching ? 32 : 12 }} />
                  {mfSearching && <span style={{ position:'absolute', right:10, top:30, fontSize:12, color:'var(--dim)' }}>…</span>}
                  {mfResults.length > 0 && !mfSelected && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
                      {mfResults.map(r => (
                        <div key={r.schemeCode}
                          onClick={() => { setMfSelected(r); setMfQuery(r.schemeName); setMfResults([]); }}
                          style={{ padding:'10px 14px', cursor:'pointer', fontSize:12, borderBottom:'1px solid rgba(28,46,74,0.4)', lineHeight:1.4 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(23,64,245,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div style={{ fontWeight:700 }}>{r.schemeName}</div>
                          <div style={{ color:'var(--dim)', fontSize:10, marginTop:2 }}>Code: {r.schemeCode}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Units + Avg NAV */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>UNITS HELD</div>
                    <input type="number" value={mfUnits} onChange={e => setMfUnits(e.target.value)} placeholder="e.g. 250.432" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>AVG BUY NAV (₹)</div>
                    <input type="number" value={mfAvgNav} onChange={e => setMfAvgNav(e.target.value)} placeholder="e.g. 148.50" style={inp} />
                  </div>
                </div>
                {mfSelected && <div style={{ fontSize:11, color:'var(--grn)', marginBottom:10 }}>✓ {mfSelected.schemeName}</div>}
                <button onClick={handleAddMF}
                  disabled={mfSaving || !mfSelected || !mfUnits || !mfAvgNav}
                  style={{ height:38, padding:'0 20px', borderRadius:9, background:'var(--grn)', border:'none', color:'#000', fontSize:13, fontWeight:800, cursor: mfSaving || !mfSelected || !mfUnits || !mfAvgNav ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: mfSaving || !mfSelected || !mfUnits || !mfAvgNav ? 0.5 : 1 }}>
                  {mfSaving ? 'Saving…' : 'Add to Portfolio'}
                </button>
              </div>
            )}

            {/* MF summary */}
            {mfHoldings.length > 0 && (() => {
              const totInv = mfHoldings.reduce((s, h) => s + h.units * h.avg_nav, 0);
              const totCur = mfHoldings.reduce((s, h) => s + h.units * (h.current_nav ?? h.avg_nav), 0);
              const totPL  = totCur - totInv;
              const totPct = totInv > 0 ? (totPL / totInv) * 100 : 0;
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
                  {[
                    { l:'Invested',      v: fmtINR(totInv), c:'var(--txt)' },
                    { l:'Current Value', v: fmtINR(totCur), c:'var(--txt)' },
                    { l:'Total P&L',     v: (totPL >= 0 ? '+' : '') + fmtINR(totPL), c: totPL >= 0 ? 'var(--grn)' : 'var(--red)' },
                    { l:'Return',        v: (totPct >= 0 ? '+' : '') + totPct.toFixed(2) + '%', c: totPct >= 0 ? 'var(--grn)' : 'var(--red)' },
                  ].map(s => (
                    <div key={s.l} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'12px 14px' }}>
                      <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, marginBottom:4 }}>{s.l}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* MF list */}
            {mfLoading ? (
              <div style={{ textAlign:'center', padding:24, color:'var(--dim)', fontSize:13 }}>Loading…</div>
            ) : !mfHoldings.length ? (
              <div style={{ textAlign:'center', padding:'32px 20px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, color:'var(--dim)', fontSize:13 }}>
                No funds yet. Search and add above.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {mfHoldings.map(h => {
                  const invested = h.units * h.avg_nav;
                  const current  = h.units * (h.current_nav ?? h.avg_nav);
                  const gain     = current - invested;
                  const ret      = invested > 0 ? (gain / invested) * 100 : 0;
                  const r        = h.current_nav != null ? rec(ret) : null;
                  return (
                    <div key={h.id} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'14px 18px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, flexShrink:0, color:'var(--pur)' }}>MF</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:800, marginBottom:2, lineHeight:1.3 }}>{h.scheme_name}</div>
                          <div style={{ fontSize:11, color:'var(--dim)', marginBottom:10 }}>
                            {h.units} units · Avg NAV ₹{h.avg_nav.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                            {h.current_nav != null && ` · Live NAV ₹${h.current_nav.toLocaleString('en-IN', { maximumFractionDigits: 4 })}`}
                            {h.nav_date && <span style={{ color:'var(--dim2)' }}> ({h.nav_date})</span>}
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
                            {[
                              { l:'Invested',   v: fmtINR(invested), c:'var(--txt)' },
                              { l:'Value',      v: fmtINR(current),  c:'var(--txt)' },
                              { l:'Gain/Loss',  v: (gain >= 0 ? '+' : '') + fmtINR(gain), c: gain >= 0 ? 'var(--grn)' : 'var(--red)' },
                              { l:'Return',     v: (ret >= 0 ? '+' : '') + ret.toFixed(2) + '%', c: ret >= 0 ? 'var(--grn)' : 'var(--red)' },
                            ].map(s => (
                              <div key={s.l} style={{ background:'var(--surf2)', borderRadius:8, padding:'7px 10px' }}>
                                <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, marginBottom:2 }}>{s.l}</div>
                                <div style={{ fontSize:13, fontWeight:800, color: h.current_nav != null ? s.c : 'var(--dim)' }}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                          {r && <div style={{ marginTop:10, padding:'7px 12px', borderRadius:8, background:r.bg, border:`1px solid ${r.color}40`, fontSize:12, fontWeight:700, color:r.color }}>{r.label}</div>}
                          {h.current_nav == null && <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>NAV unavailable — MFAPI may not have this fund.</div>}
                        </div>
                        <button onClick={() => handleRemoveMF(h.id)}
                          style={{ width:26, height:26, borderRadius:6, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', cursor:'pointer', fontSize:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border:'none', borderTop:'1px solid var(--bdr)', margin:'8px 0 24px' }} />

          {/* ── ETF Holdings (localStorage — unchanged) ── */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800 }}>📈 ETF Portfolio</div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>Live prices from NSE · Stored locally</div>
              </div>
              <button onClick={() => setShowAdd(!showAdd)} style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {showAdd ? '✕ Cancel' : '+ Add ETF'}
              </button>
            </div>

            {showAdd && (
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>NSE SYMBOL</div>
                    <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="NIFTYBEES" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>UNITS</div>
                    <input type="number" value={addUnits} onChange={e => setAddUnits(e.target.value)} placeholder="100" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>AVG BUY PRICE (₹)</div>
                    <input type="number" value={addBuy} onChange={e => setAddBuy(e.target.value)} placeholder="220.50" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600 }}>CURRENT PRICE (₹, optional)</div>
                    <input type="number" value={addCurrent} onChange={e => setAddCurrent(e.target.value)} placeholder="265.00" style={inp} />
                  </div>
                </div>
                <button onClick={addHolding} style={{ height:38, padding:'0 20px', borderRadius:9, background:'var(--grn)', border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  Add ETF
                </button>
              </div>
            )}

            {holdings.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px 20px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, color:'var(--dim)', fontSize:13 }}>
                No ETFs yet. Add above.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {holdings.map(h => {
                  const invested = h.units * h.buyPrice;
                  const current  = h.currentPrice ? h.units * h.currentPrice : null;
                  const gain     = current != null ? current - invested : null;
                  const ret      = gain != null ? (gain / invested) * 100 : null;
                  const r        = ret != null ? rec(ret) : null;
                  return (
                    <div key={h.id} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'14px 18px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, flexShrink:0, color:'var(--bluL)' }}>ETF</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, marginBottom:2 }}>{h.label}</div>
                          <div style={{ fontSize:11, color:'var(--dim)', marginBottom:10 }}>{h.units} units · Avg ₹{h.buyPrice.toLocaleString('en-IN')}</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
                            {[
                              { l:'Invested', v:`₹${invested.toLocaleString('en-IN', { maximumFractionDigits:0 })}`, c:'var(--txt)' },
                              ...(current != null ? [
                                { l:'Value',     v:`₹${current.toLocaleString('en-IN', { maximumFractionDigits:0 })}`, c:'var(--txt)' },
                                { l:'Gain/Loss', v:`${gain! >= 0 ? '+' : ''}₹${Math.round(gain!).toLocaleString('en-IN')}`, c: gain! >= 0 ? 'var(--grn)' : 'var(--red)' },
                                { l:'Return',    v:`${ret! >= 0 ? '+' : ''}${ret!.toFixed(1)}%`, c: ret! >= 0 ? 'var(--grn)' : 'var(--red)' },
                              ] : []),
                            ].map(s => (
                              <div key={s.l} style={{ background:'var(--surf2)', borderRadius:8, padding:'7px 10px' }}>
                                <div style={{ fontSize:9, color:'var(--dim)', fontWeight:700, marginBottom:2 }}>{s.l}</div>
                                <div style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                          {r && <div style={{ marginTop:10, padding:'7px 12px', borderRadius:8, background:r.bg, border:`1px solid ${r.color}40`, fontSize:12, fontWeight:700, color:r.color }}>{r.label}</div>}
                        </div>
                        <button onClick={() => removeHolding(h.id)} style={{ width:26, height:26, borderRadius:6, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', cursor:'pointer', fontSize:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
            ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Keep/Review/Exit based on absolute return only · DYOR
          </div>
        </>
      )}

      {/* ══ TAB: SIP CALCULATOR ══ */}
      {tab === 'sip' && (() => {
        const monthly = parseFloat(sipMonthly) || 5000;
        const ret     = parseFloat(sipReturn)  || 12;
        const years   = Math.min(Math.max(parseInt(sipYears) || 15, 1), 40);
        const stepUp  = parseFloat(sipStepUp)  || 0;

        const sipData    = calcSIP(monthly, ret, years, stepUp);
        const finalCorpus = sipData[sipData.length - 1]?.corpus ?? 0;
        const finalInvested = sipData[sipData.length - 1]?.invested ?? 0;
        const wealthGain = finalCorpus - finalInvested;
        const maxCorpus  = Math.max(...sipData.map(d => d.corpus));

        // Comparisons (using same total invested as SIP)
        const lumpCorpus = calcLumpsum(finalInvested, ret, years);
        const fdCorpus   = calcLumpsum(finalInvested, 7.1, years);
        const ppfCorpus  = calcLumpsum(finalInvested, 7.1, years); // same as FD for simplicity

        const crFmt = (n: number) => {
          if (n >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`;
          if (n >= 1e5) return `₹${(n/1e5).toFixed(1)} L`;
          return `₹${n.toLocaleString('en-IN')}`;
        };

        const sInp: React.CSSProperties = {
          width:'100%', height:40, borderRadius:8, background:'var(--surf2)',
          border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14,
          padding:'0 12px', fontFamily:'inherit', outline:'none', fontWeight:600,
        };

        return (
          <>
            {/* Inputs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:14, marginBottom:24 }}>
              {[
                { label:'Monthly SIP (₹)', value: sipMonthly, set: setSipMonthly, type:'number', hint:'How much you invest every month' },
                { label:'Expected Return (%/yr)', value: sipReturn, set: setSipReturn, type:'number', hint:'Nifty 50 avg ~12%, small cap ~15%' },
                { label:'Tenure (years)', value: sipYears, set: setSipYears, type:'number', hint:'1 – 40 years' },
                { label:'Step-up (%/yr)', value: sipStepUp, set: setSipStepUp, type:'number', hint:'Increase SIP annually (0 = flat)' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>{f.label}</div>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} style={sInp} />
                  <div style={{ fontSize:10, color:'var(--dim2)', marginTop:4 }}>{f.hint}</div>
                </div>
              ))}
            </div>

            {/* Result cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
              {[
                { l:'Maturity Value',   v: crFmt(finalCorpus),   c:'var(--grn)',  bg:'rgba(0,212,160,0.08)',  bdr:'rgba(0,212,160,0.3)' },
                { l:'Total Invested',   v: crFmt(finalInvested), c:'var(--txt)',  bg:'var(--surf)',           bdr:'var(--bdr)' },
                { l:'Wealth Created',   v: crFmt(wealthGain),    c:'var(--ylw)',  bg:'rgba(255,184,0,0.08)',  bdr:'rgba(255,184,0,0.3)' },
                { l:'Gain Multiple',    v: finalInvested > 0 ? `${(finalCorpus/finalInvested).toFixed(1)}×` : '—',
                                         c:'var(--bluL)', bg:'rgba(23,64,245,0.08)', bdr:'rgba(23,64,245,0.25)' },
              ].map(s => (
                <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bdr}`, borderRadius:14, padding:'16px 18px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{s.l}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:s.c, letterSpacing:-0.5 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Year-by-year bar chart */}
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>
                Corpus Growth · Year-by-Year
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:160, overflowX:'auto', paddingBottom:24, position:'relative' }}>
                {sipData.map(d => {
                  const barH    = maxCorpus > 0 ? (d.corpus / maxCorpus) * 140 : 0;
                  const invH    = maxCorpus > 0 ? (d.invested / maxCorpus) * 140 : 0;
                  const gainH   = Math.max(0, barH - invH);
                  const showLbl = years <= 20 || d.year % 5 === 0;
                  return (
                    <div key={d.year} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:'1 0 auto', minWidth: years > 25 ? 16 : 22, maxWidth:40, position:'relative' }}
                      title={`Year ${d.year}: ${crFmt(d.corpus)} (invested ${crFmt(d.invested)})`}>
                      <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'stretch', borderRadius:'3px 3px 0 0', overflow:'hidden' }}>
                        <div style={{ height:gainH, background:'var(--grn)', opacity:0.85 }} />
                        <div style={{ height:invH,  background:'var(--blu)', opacity:0.7 }} />
                      </div>
                      {showLbl && (
                        <div style={{ fontSize:9, color:'var(--dim)', marginTop:4, position:'absolute', bottom:-18, textAlign:'center', whiteSpace:'nowrap' }}>Y{d.year}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'var(--dim)' }}>
                <span><span style={{ color:'var(--blu)', fontWeight:700 }}>▌</span> Invested</span>
                <span><span style={{ color:'var(--grn)', fontWeight:700 }}>▌</span> Gains</span>
              </div>
            </div>

            {/* Comparison table */}
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>
                What if you invested {crFmt(finalInvested)} as a lump sum?
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                {[
                  { l:`SIP (${ret}% p.a.)${stepUp > 0 ? ` +${stepUp}% step-up` : ''}`, v: crFmt(finalCorpus), c:'var(--grn)', best: true },
                  { l:`Lump Sum (${ret}% p.a.)`,  v: crFmt(lumpCorpus), c: lumpCorpus > finalCorpus ? 'var(--grn)' : 'var(--dim)' },
                  { l:'FD / Debt (7.1% p.a.)',     v: crFmt(fdCorpus),   c:'var(--dim)' },
                  { l:'PPF (7.1% p.a., tax-free)', v: crFmt(ppfCorpus),  c:'var(--dim)' },
                ].map(s => (
                  <div key={s.l} style={{ background: s.best ? 'rgba(0,212,160,0.06)' : 'var(--surf2)', border:`1px solid ${s.best ? 'rgba(0,212,160,0.25)' : 'var(--bdr)'}`, borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, marginBottom:5, lineHeight:1.4 }}>{s.l}</div>
                    <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
                    {s.best && <div style={{ fontSize:9, color:'var(--grn)', fontWeight:700, marginTop:4 }}>YOUR SIP PLAN</div>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--dim2)', marginTop:12 }}>
                Lump sum assumes investing total SIP corpus ({crFmt(finalInvested)}) on Day 1. FD/PPF rates indicative.
              </div>
            </div>

            {/* SIP Tips */}
            <div style={{ background:'rgba(23,64,245,0.05)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:14, padding:'14px 18px' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:10 }}>💡 Power of compounding — key insights</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  `Starting just 5 years earlier can 2× your final corpus at the same monthly amount.`,
                  `Step-up SIP of 10%/yr typically beats a flat SIP by 40–60% over 15+ years.`,
                  `₹5,000/mo for 25 years at 12% → ~₹94L. Starting at ₹2,000 and stepping up 15% → similar corpus.`,
                  `Rule of thumb: money doubles every ~6 years at 12% p.a. (Rule of 72).`,
                ].map((t, i) => (
                  <div key={i} style={{ fontSize:12, color:'var(--dim)', display:'flex', gap:8 }}>
                    <span style={{ color:'var(--bluL)', flexShrink:0 }}>→</span>{t}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
              Projections are illustrative. Actual mutual fund returns vary. Not SEBI registered · DYOR
            </div>
          </>
        );
      })()}
    </>
  );
}
