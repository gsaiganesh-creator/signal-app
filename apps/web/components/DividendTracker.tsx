'use client';

import { useState } from 'react';

interface Holding { symbol: string; exchange: string; qty: number; avg_price: number }

interface DivData {
  symbol: string;
  ex_div_date: string | null;
  div_yield: number | null;
  annual_div_per_share: number | null;
  days_to_ex: number | null;
}

interface EnrichedDiv extends DivData {
  qty: number;
  avg_price: number;
  annual_income: number | null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export function DividendTracker({ holdings }: { holdings: Holding[] }) {
  const [open, setOpen]       = useState(false);
  const [rows, setRows]       = useState<EnrichedDiv[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState(false);

  async function load() {
    if (loaded || loading || !holdings.length) return;
    setLoading(true);
    try {
      const syms = holdings
        .map(h => `${h.symbol}${h.exchange === 'BSE' ? '.BO' : '.NS'}`)
        .join(',');
      const r = await fetch(`/api/dividends?symbols=${encodeURIComponent(syms)}`);
      if (!r.ok) { setError(true); setLoading(false); return; }
      const { results } = await r.json() as { results: DivData[] };

      const map = new Map(results.map(d => [d.symbol, d]));
      const enriched: EnrichedDiv[] = [];
      for (const h of holdings) {
        const d = map.get(h.symbol);
        if (!d) continue;
        enriched.push({
          ...d,
          qty: h.qty,
          avg_price: h.avg_price,
          annual_income: d.annual_div_per_share != null ? +(d.annual_div_per_share * h.qty).toFixed(2) : null,
        });
      }
      // Sort: upcoming ex-dates first, then by yield desc
      enriched.sort((a, b) => {
        const aUp = a.days_to_ex != null && a.days_to_ex >= 0;
        const bUp = b.days_to_ex != null && b.days_to_ex >= 0;
        if (aUp && !bUp) return -1;
        if (!aUp && bUp) return  1;
        if (aUp && bUp)  return (a.days_to_ex ?? 999) - (b.days_to_ex ?? 999);
        return (b.div_yield ?? 0) - (a.div_yield ?? 0);
      });

      setRows(enriched);
      setLoaded(true);
    } catch { setError(true); }
    setLoading(false);
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  const totalIncome = rows.reduce((s, r) => s + (r.annual_income ?? 0), 0);
  const upcoming    = rows.filter(r => r.days_to_ex != null && r.days_to_ex >= 0 && r.days_to_ex <= 60);

  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, marginBottom:20, overflow:'hidden' }}>
      <button onClick={toggle} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', color:'var(--txt)', fontFamily:'inherit' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:'var(--dim)' }}>Dividend Tracker</span>
          {loaded && upcoming.length > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'rgba(255,184,0,0.15)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.3)' }}>
              {upcoming.length} ex-date{upcoming.length > 1 ? 's' : ''} in 60d
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {loaded && totalIncome > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color:'var(--grn)' }}>
              Est ₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits:0 })}/yr
            </span>
          )}
          <span style={{ fontSize:14, color:'var(--dim)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▾</span>
        </div>
      </button>

      {open && (
        <div style={{ padding:'0 18px 18px' }}>
          {loading && <div style={{ textAlign:'center', padding:20, fontSize:12, color:'var(--dim)' }}>Loading dividend data…</div>}
          {error   && <div style={{ padding:12, fontSize:12, color:'var(--red)' }}>Failed to load dividend data.</div>}

          {loaded && rows.length === 0 && (
            <div style={{ padding:12, fontSize:12, color:'var(--dim)', textAlign:'center' }}>
              No dividend data available for current holdings.
            </div>
          )}

          {loaded && rows.length > 0 && (
            <>
              {/* Summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
                {[
                  { label:'Div-paying stocks', value: `${rows.length} of ${holdings.length}` },
                  { label:'Ex-dates in 60d', value: String(upcoming.length), color: upcoming.length > 0 ? 'var(--ylw)' : undefined },
                  { label:'Est annual income', value: totalIncome > 0 ? `₹${totalIncome.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—', color:'var(--grn)' },
                ].map(c => (
                  <div key={c.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'10px 12px', border:'1px solid var(--bdr)' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, marginBottom:4 }}>{c.label}</div>
                    <div style={{ fontSize:16, fontWeight:800, color: c.color ?? 'var(--txt)' }}>{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                      {['Symbol','Qty','Ex-Date','Days','Yield','Annual Div/Share','Est Income/yr'].map(h => (
                        <th key={h} style={{ padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textAlign: h === 'Symbol' ? 'left' : 'right', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const upcoming60 = r.days_to_ex != null && r.days_to_ex >= 0 && r.days_to_ex <= 60;
                      return (
                        <tr key={r.symbol} style={{ borderBottom:'1px solid var(--bdr)22', background: upcoming60 ? 'rgba(255,184,0,0.03)' : 'transparent' }}>
                          <td style={{ padding:'8px 10px', fontSize:13, fontWeight:700 }}>
                            {r.symbol}
                            {upcoming60 && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:'rgba(255,184,0,0.15)', color:'var(--ylw)' }}>EX-DATE</span>}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--dim)' }}>{r.qty}</td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color: upcoming60 ? 'var(--ylw)' : 'var(--txt)', fontWeight: upcoming60 ? 700 : 400 }}>
                            {r.ex_div_date ? fmtDate(r.ex_div_date) : '—'}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color: r.days_to_ex != null && r.days_to_ex >= 0 && r.days_to_ex <= 60 ? 'var(--ylw)' : 'var(--dim)' }}>
                            {r.days_to_ex != null ? (r.days_to_ex >= 0 ? `${r.days_to_ex}d` : 'Past') : '—'}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--grn)', fontWeight:600 }}>
                            {r.div_yield != null ? `${r.div_yield}%` : '—'}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right' }}>
                            {r.annual_div_per_share != null ? `₹${r.annual_div_per_share.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--grn)', fontWeight:600 }}>
                            {r.annual_income != null && r.annual_income > 0 ? `₹${r.annual_income.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop:10, fontSize:10, color:'var(--dim2)' }}>
                Annual income = dividend rate × qty held · Yahoo Finance · Ex-dates approximate · Not investment advice
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
