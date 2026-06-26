'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Types ─────────────────────────────────────────────────────────────────────
type EquityType = 'RSU' | 'ESPP';

interface DBGrant {
  id: string; user_id: string; type: EquityType;
  symbol: string; company: string; employer: string;
  shares: number; grant_price: number; vest_date: string | null;
  brokerage: string; notes: string; created_at: string;
}

interface Grant {
  id: string; type: EquityType;
  symbol: string; company: string; employer: string;
  shares: number; grantPrice: number; vestDate: string;
  brokerage: string; notes: string;
}

interface LiveData {
  price: number; change_pct: number;
  rsi14?: number; ema20?: number; ema50?: number; signals?: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BROKERAGES = [
  'Schwab Equity Awards', 'Fidelity NetBenefits', 'E*TRADE (Morgan Stanley)',
  'UBS Financial', 'Computershare', 'Merrill Lynch', 'Charles Schwab',
  'Vanguard', 'Other',
];

const EMPTY_FORM: Omit<Grant, 'id'> = {
  type: 'RSU', symbol: '', company: '', employer: '',
  shares: 0, grantPrice: 0, vestDate: '',
  brokerage: 'Schwab Equity Awards', notes: '',
};

// ── DB ↔ UI mapping ───────────────────────────────────────────────────────────
function dbToGrant(r: DBGrant): Grant {
  return { id: r.id, type: r.type, symbol: r.symbol, company: r.company,
    employer: r.employer, shares: r.shares, grantPrice: r.grant_price,
    vestDate: r.vest_date ?? '', brokerage: r.brokerage, notes: r.notes };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(d: string) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(n);
}
function sigBadge(signals?: string[]) {
  if (!signals?.length) return { label:'N/A', color:'var(--dim)', bg:'rgba(122,139,170,0.1)', border:'rgba(122,139,170,0.2)' };
  const s = signals.join(' ').toLowerCase();
  if (s.includes('buy') || s.includes('momentum') || s.includes('bullish'))
    return { label:'BUY', color:'var(--grn)', bg:'rgba(0,212,160,0.12)', border:'rgba(0,212,160,0.3)' };
  if (s.includes('sell') || s.includes('bearish') || s.includes('exit'))
    return { label:'SELL', color:'var(--red)', bg:'rgba(255,59,92,0.1)', border:'rgba(255,59,92,0.3)' };
  return { label:'HOLD', color:'var(--ylw)', bg:'rgba(255,184,0,0.1)', border:'rgba(255,184,0,0.3)' };
}
function rsiLabel(rsi?: number) {
  if (!rsi) return { txt:'—', color:'var(--dim)' };
  if (rsi < 35) return { txt:'Oversold', color:'var(--grn)' };
  if (rsi > 70) return { txt:'Overbought', color:'var(--red)' };
  return { txt:'Neutral', color:'var(--ylw)' };
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EquityCompPage() {
  const { session } = usePortfolio();
  const [grants,   setGrants]   = useState<Grant[]>([]);
  const [live,     setLive]     = useState<Record<string, LiveData>>({});
  const [usdInr,   setUsdInr]   = useState(84);
  const [addOpen,  setAddOpen]  = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form,     setForm]     = useState<Omit<Grant, 'id'>>(EMPTY_FORM);
  const [liveLoad, setLiveLoad] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  // ── Fetch grants from Supabase ──
  const fetchGrants = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/equity_grants?user_id=eq.${session.user.id}&order=created_at.desc`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const rows: DBGrant[] = await res.json();
      setGrants(rows.map(dbToGrant));
    } catch { /* offline */ }
  }, [session]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  // ── USD/INR ──
  useEffect(() => {
    fetch('/api/prices?symbols=USDINR=X')
      .then(r => r.json())
      .then(d => { if (d['USDINR=X']?.price) setUsdInr(d['USDINR=X'].price); })
      .catch(() => {});
  }, []);

  // ── Live prices + technicals ──
  const fetchLive = useCallback(async (list: Grant[]) => {
    const syms = [...new Set(list.map(g => g.symbol).filter(Boolean))];
    if (!syms.length) return;
    setLiveLoad(true);
    const results: Record<string, LiveData> = {};
    await Promise.all(syms.map(async sym => {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch(`/api/prices?symbols=${sym}`),
          fetch(`/api/stock-detail?symbol=${sym}&exchange=NASDAQ`),
        ]);
        const pData = await pRes.json();
        const dData = await dRes.json();
        results[sym] = {
          price: pData[sym]?.price ?? 0, change_pct: pData[sym]?.change_pct ?? 0,
          rsi14: dData.rsi14, ema20: dData.ema20, ema50: dData.ema50,
          signals: dData.signals ?? [],
        };
      } catch {}
    }));
    setLive(results);
    setLiveLoad(false);
  }, []);

  useEffect(() => {
    fetchLive(grants);
    const iv = setInterval(() => fetchLive(grants), 60_000);
    return () => clearInterval(iv);
  }, [grants, fetchLive]);

  // ── Summary ──
  const totalValue   = grants.reduce((s, g) => s + ((live[g.symbol]?.price ?? g.grantPrice) * g.shares), 0);
  const totalCost    = grants.reduce((s, g) => s + (g.grantPrice * g.shares), 0);
  const totalGain    = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const brokerSet    = [...new Set(grants.map(g => g.brokerage))];

  // ── CRUD ──
  function openAdd()   { setForm(EMPTY_FORM); setEditId(null); setAddOpen(true); setMsg(''); }
  function openEdit(g: Grant) {
    setForm({ type:g.type, symbol:g.symbol, company:g.company, employer:g.employer,
      shares:g.shares, grantPrice:g.grantPrice, vestDate:g.vestDate,
      brokerage:g.brokerage, notes:g.notes });
    setEditId(g.id); setAddOpen(true); setMsg('');
  }

  async function saveGrant() {
    if (!session || !form.symbol || !form.shares || !form.grantPrice) return;
    setSaving(true);
    const body = {
      user_id: session.user.id, type: form.type, symbol: form.symbol.toUpperCase(),
      company: form.company, employer: form.employer, shares: form.shares,
      grant_price: form.grantPrice, vest_date: form.vestDate || null,
      brokerage: form.brokerage, notes: form.notes,
    };
    try {
      let res: Response;
      if (editId) {
        res = await fetch(`${SUPA_URL}/rest/v1/equity_grants?id=eq.${editId}`, {
          method: 'PATCH',
          headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${SUPA_URL}/rest/v1/equity_grants`, {
          method: 'POST',
          headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) { const t = await res.text(); setMsg(`❌ ${t}`); return; }
      setAddOpen(false); setEditId(null);
      await fetchGrants();
    } catch (e) { setMsg(`❌ ${e}`); }
    finally { setSaving(false); }
  }

  async function deleteGrant(id: string) {
    if (!session || !confirm('Remove this grant?')) return;
    await fetch(`${SUPA_URL}/rest/v1/equity_grants?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    await fetchGrants();
  }

  const inp: React.CSSProperties = {
    width:'100%', height:40, borderRadius:10, border:'1px solid var(--bdr)',
    background:'var(--surf2)', color:'var(--txt)', padding:'0 12px',
    fontSize:13, fontFamily:'inherit', outline:'none',
  };
  const card: React.CSSProperties = {
    background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16,
    backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
    boxShadow:'var(--card-shadow)',
  };

  if (!session) {
    return (
      <div style={{ maxWidth:600, margin:'80px auto', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Sign in required</div>
        <div style={{ fontSize:13, color:'var(--dim)' }}>Sign in to track RSU and ESPP grants synced across devices.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>ESPP &amp; RSU Tracker</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            Corporate equity compensation · live market value, unrealised gain &amp; ML signals · synced to cloud
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {liveLoad && <div style={{ fontSize:11, color:'var(--dim)' }}>Refreshing...</div>}
          <button onClick={openAdd}
            style={{ height:38, padding:'0 18px', borderRadius:10, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Grant
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Value (USD)',  val:fmtUSD(totalValue), sub:`≈ ₹${(totalValue*usdInr/100000).toFixed(2)}L`, c:'var(--txt)' },
          { label:'Unrealised Gain',   val:`${totalGain>=0?'+':''}${fmtUSD(totalGain)}`, sub:`${totalGainPct>=0?'+':''}${totalGainPct.toFixed(1)}%`, c:totalGain>=0?'var(--grn)':'var(--red)' },
          { label:'Active Grants',     val:String(grants.length), sub:`${grants.filter(g=>g.type==='RSU').length} RSU · ${grants.filter(g=>g.type==='ESPP').length} ESPP`, c:'var(--txt)' },
          { label:'Brokerages',        val:String(brokerSet.length||'—'), sub:brokerSet.slice(0,2).join(', ')||'None added', c:'var(--pur)' },
        ].map(st => (
          <div key={st.label} style={{ ...card, padding:'16px 18px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>{st.label}</div>
            <div style={{ fontSize:19, fontWeight:900, color:st.c, letterSpacing:-0.5 }}>{st.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{st.sub}</div>
          </div>
        ))}
      </div>

      {/* Grants list */}
      {grants.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:'56px 24px' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>💼</div>
          <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>No grants added yet</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:22, maxWidth:420, margin:'0 auto 22px', lineHeight:1.65 }}>
            Track RSUs from Google, Microsoft, Apple, Infosys or ESPP shares — across Schwab, Fidelity, E*TRADE and more. Live price, unrealised gain and ML signals for each holding. Synced to your account.
          </div>
          <button onClick={openAdd}
            style={{ height:42, padding:'0 24px', borderRadius:10, background:'var(--blu)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Your First Grant
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {grants.map(g => {
            const ld         = live[g.symbol];
            const price      = ld?.price ?? 0;
            const gainUSD    = price ? (price - g.grantPrice) * g.shares : 0;
            const gainPct    = g.grantPrice > 0 ? ((price - g.grantPrice) / g.grantPrice) * 100 : 0;
            const days       = daysSince(g.vestDate);
            const isLTCG     = days >= 365;
            const sig        = sigBadge(ld?.signals);
            const rsi        = rsiLabel(ld?.rsi14);
            const isExp      = expanded === g.id;
            const emaUp      = ld?.ema20 && ld?.ema50 && ld.ema20 > ld.ema50;
            const priceAbEma = price > 0 && ld?.ema50 && price > ld.ema50;

            return (
              <div key={g.id} style={{ ...card, overflow:'hidden' }}>
                {/* Main row */}
                <div style={{ display:'flex', alignItems:'center', padding:'15px 18px', gap:14, flexWrap:'wrap' }}>

                  {/* Type badge */}
                  <div style={{ width:52, height:52, borderRadius:13,
                    background:g.type==='RSU'?'rgba(79,111,250,0.1)':'rgba(0,212,160,0.1)',
                    border:`1px solid ${g.type==='RSU'?'rgba(79,111,250,0.3)':'rgba(0,212,160,0.3)'}`,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:g.type==='RSU'?'var(--bluL)':'var(--grn)' }}>{g.type}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)', marginTop:1 }}>{g.shares}sh</div>
                  </div>

                  {/* Company */}
                  <div style={{ minWidth:130 }}>
                    <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3 }}>{g.symbol}</div>
                    <div style={{ fontSize:11, color:'var(--dim)' }}>{g.company || g.employer || '—'}</div>
                    <div style={{ fontSize:10, color:'var(--dim2)', marginTop:1 }}>{g.brokerage}</div>
                  </div>

                  {/* Price */}
                  <div style={{ minWidth:120 }}>
                    <div style={{ fontSize:15, fontWeight:800 }}>{price ? fmtUSD(price) : '—'}</div>
                    <div style={{ fontSize:11, color:(ld?.change_pct??0)>=0?'var(--grn)':'var(--red)' }}>
                      {ld ? `${ld.change_pct>=0?'+':''}${ld.change_pct.toFixed(2)}%` : 'fetching...'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>grant: {fmtUSD(g.grantPrice)}</div>
                  </div>

                  {/* Gain */}
                  <div style={{ minWidth:115 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:gainUSD>=0?'var(--grn)':'var(--red)' }}>
                      {price ? `${gainUSD>=0?'+':''}${fmtUSD(gainUSD)}` : '—'}
                    </div>
                    <div style={{ fontSize:11, color:gainPct>=0?'var(--grn)':'var(--red)' }}>
                      {price ? `${gainPct>=0?'+':''}${gainPct.toFixed(1)}%` : ''}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>since vest</div>
                  </div>

                  {/* ML Signal */}
                  <div style={{ minWidth:90 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
                      background:sig.bg, border:`1px solid ${sig.border}`, fontSize:11, fontWeight:800, color:sig.color }}>
                      {sig.label}
                    </span>
                    <div style={{ fontSize:10, marginTop:4,
                      color:ld?.ema20&&ld?.ema50?(emaUp?'var(--grn)':'var(--red)'):'var(--dim)', fontWeight:600 }}>
                      {ld?.ema20 && ld?.ema50 ? (emaUp ? '↑ Uptrend' : '↓ Downtrend') : '—'}
                    </div>
                  </div>

                  {/* Tax / holding */}
                  <div style={{ marginLeft:'auto', textAlign:'right', minWidth:130 }}>
                    <div style={{ fontSize:10, padding:'3px 8px', borderRadius:6,
                      background:isLTCG?'rgba(0,212,160,0.1)':'rgba(255,184,0,0.1)',
                      color:isLTCG?'var(--grn)':'var(--ylw)', fontWeight:700, display:'inline-block', marginBottom:3 }}>
                      {isLTCG ? '✓ LTCG eligible' : `⏳ ${Math.max(0,365-days)}d to LTCG`}
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim2)' }}>
                      {days}d held · {g.vestDate ? new Date(g.vestDate).toLocaleDateString('en-IN',{month:'short',year:'numeric'}) : '—'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => setExpanded(isExp ? null : g.id)}
                      style={{ height:30, padding:'0 10px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      {isExp ? '▲' : '▼ Details'}
                    </button>
                    <button onClick={() => openEdit(g)}
                      style={{ height:30, width:30, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      ✏️
                    </button>
                    <button onClick={() => deleteGrant(g.id)}
                      style={{ height:30, width:30, borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded technicals */}
                {isExp && (
                  <div style={{ borderTop:'1px solid var(--card-bdr)', background:'var(--surf2)', padding:'16px 18px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:ld?.signals?.length ? 14 : 0 }}>
                      {[
                        { label:'RSI (14)',     val:ld?.rsi14?.toFixed(1)??'—', sub:rsiLabel(ld?.rsi14).txt, subC:rsiLabel(ld?.rsi14).color },
                        { label:'EMA 20',       val:ld?.ema20?.toFixed(2)??'—', sub:ld?.ema20?(price>ld.ema20?'Above EMA20':'Below EMA20'):'—', subC:ld?.ema20?(price>ld.ema20?'var(--grn)':'var(--red)'):'var(--dim)' },
                        { label:'EMA 50',       val:ld?.ema50?.toFixed(2)??'—', sub:ld?.ema50?(priceAbEma?'Above EMA50':'Below EMA50'):'—', subC:priceAbEma?'var(--grn)':'var(--red)' },
                        { label:'Total Value',  val:price?fmtUSD(price*g.shares):'—', sub:price?`≈ ₹${((price*g.shares*usdInr)/100000).toFixed(2)}L`:'', subC:'var(--dim)' },
                        { label:'Gain/Share',   val:price?`${gainUSD>=0?'+':''}${fmtUSD(price-g.grantPrice)}`:'—', sub:`vs grant ${fmtUSD(g.grantPrice)}`, subC:'var(--dim)' },
                      ].map(m => (
                        <div key={m.label} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:11, padding:'12px 14px' }}>
                          <div style={{ fontSize:10, color:'var(--dim)', marginBottom:4, fontWeight:600 }}>{m.label}</div>
                          <div style={{ fontSize:20, fontWeight:900 }}>{m.val}</div>
                          <div style={{ fontSize:10, color:m.subC, fontWeight:600, marginTop:2 }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    {ld?.signals && ld.signals.length > 0 && (
                      <div>
                        <div style={{ fontSize:10, color:'var(--dim)', marginBottom:6, fontWeight:700, letterSpacing:0.5 }}>ML SIGNALS</div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {ld.signals.map((s, i) => (
                            <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.06)', border:'1px solid var(--card-bdr)' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {g.notes && (
                      <div style={{ marginTop:12, fontSize:12, color:'var(--dim)', borderTop:'1px solid var(--card-bdr)', paddingTop:10 }}>
                        <strong style={{ color:'var(--txt)' }}>Notes: </strong>{g.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop:20, padding:'12px 16px', background:'rgba(255,184,0,0.04)', border:'1px solid rgba(255,184,0,0.14)', borderRadius:12 }}>
        <p style={{ fontSize:11, color:'rgba(255,184,0,0.7)', lineHeight:1.65 }}>
          <strong style={{ color:'var(--ylw)' }}>⚠️ NOT SEBI/SEC REGISTERED.</strong> Prices via Yahoo Finance (may be delayed 15 min). LTCG thresholds shown are for reference — consult a qualified tax advisor for actual filing. Not investment advice. DYOR.
        </p>
      </div>

      {/* Add / Edit Modal */}
      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300 }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'92%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', zIndex:310, background:'var(--card-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid var(--card-bdr)', borderRadius:20, padding:28, boxShadow:'var(--card-shadow)' }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>{editId ? 'Edit' : 'Add'} Equity Grant</div>
              <button onClick={() => setAddOpen(false)}
                style={{ width:30, height:30, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>✕</button>
            </div>

            {msg && (
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, fontSize:13,
                background:msg.startsWith('✅')?'rgba(0,212,160,0.08)':'rgba(255,59,92,0.08)',
                border:`1px solid ${msg.startsWith('✅')?'rgba(0,212,160,0.25)':'rgba(255,59,92,0.25)'}` }}>
                {msg}
              </div>
            )}

            {/* Type toggle */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8, fontWeight:600 }}>Grant Type</div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                {(['RSU','ESPP'] as EquityType[]).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type:t }))}
                    style={{ flex:1, height:42, borderRadius:10,
                      border:`1px solid ${form.type===t?(t==='RSU'?'rgba(79,111,250,0.6)':'rgba(0,212,160,0.6)'):'var(--bdr)'}`,
                      background:form.type===t?(t==='RSU'?'rgba(79,111,250,0.12)':'rgba(0,212,160,0.12)'):'transparent',
                      color:form.type===t?(t==='RSU'?'var(--bluL)':'var(--grn)'):'var(--dim)',
                      fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                    {t === 'RSU' ? '🔒 RSU — Restricted Stock' : '💰 ESPP — Employee Purchase'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', background:'var(--surf2)', padding:'9px 12px', borderRadius:9, lineHeight:1.55 }}>
                {form.type === 'RSU'
                  ? 'Enter FMV (Fair Market Value) at vest date as "Grant Price" — the price your employer reported as income for tax purposes.'
                  : 'Enter your actual purchase price (typically 85% of market price at the start or end of the ESPP offering period).'}
              </div>
            </div>

            {([
              { label:'Stock Symbol *', key:'symbol',   ph:'AAPL, MSFT, GOOG, INFY…', t:'text' },
              { label:'Company Name',   key:'company',  ph:'Apple Inc, Microsoft Corp…', t:'text' },
              { label:'Your Employer',  key:'employer', ph:'If different from the above company', t:'text' },
            ] as { label:string; key:keyof Omit<Grant,'id'>; ph:string; t:string }[]).map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>{f.label}</div>
                <input type={f.t} value={form[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.ph} style={inp} />
              </div>
            ))}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Shares *</div>
                <input type="number" min="0" value={form.shares || ''}
                  onChange={e => setForm(f => ({ ...f, shares:parseFloat(e.target.value)||0 }))}
                  placeholder="e.g. 150" style={inp} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>
                  {form.type === 'RSU' ? 'FMV at Vest (USD) *' : 'Purchase Price (USD) *'}
                </div>
                <input type="number" min="0" step="0.01" value={form.grantPrice || ''}
                  onChange={e => setForm(f => ({ ...f, grantPrice:parseFloat(e.target.value)||0 }))}
                  placeholder="e.g. 185.50" style={inp} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>
                  {form.type === 'RSU' ? 'Vest Date' : 'Purchase Date'}
                </div>
                <input type="date" value={form.vestDate}
                  onChange={e => setForm(f => ({ ...f, vestDate:e.target.value }))}
                  style={{ ...inp, colorScheme:'dark' }} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Brokerage</div>
                <select value={form.brokerage}
                  onChange={e => setForm(f => ({ ...f, brokerage:e.target.value }))}
                  style={inp}>
                  {BROKERAGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, fontWeight:600 }}>Notes (optional)</div>
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}
                rows={2} placeholder="Grant ID, vesting cliff, 4-year schedule, grant batch…"
                style={{ ...inp, height:'auto', padding:'10px 12px', resize:'vertical' }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setAddOpen(false)}
                style={{ flex:1, height:44, borderRadius:12, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={saveGrant} disabled={saving || !form.symbol || !form.shares || !form.grantPrice}
                style={{ flex:2, height:44, borderRadius:12, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  background:(form.symbol&&form.shares&&form.grantPrice)&&!saving?'var(--blu)':'rgba(23,64,245,0.35)' }}>
                {saving ? '⏳ Saving…' : editId ? 'Save Changes' : 'Add Grant'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
