'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supa = createClient();

interface Holding {
  id: string;
  symbol: string;
  exchange: string;
  qty: number;
  avg_price: number;
  purchase_date: string | null;
  portfolio_id: string;
}

interface HoldingWithPrice extends Holding {
  current_price: number | null;
  gain: number | null;
  gain_pct: number | null;
  days_held: number | null;
  tax_type: 'STCG' | 'LTCG' | null;
  tax_rate: number | null;
  tax_amount: number | null;
}

function daysBetween(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000);
}

function fmtP(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtN(n: number | null, prefix = '₹') {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${prefix}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CapitalGainsPage() {
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [portfolioId, setPortId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      // Get portfolios
      const { data: portfolios } = await supa
        .from('portfolios')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(10);
      if (!portfolios?.length) { setLoading(false); return; }
      const ids = portfolios.map(p => p.id);
      setPortId(ids[0]);

      // Fetch holdings (with purchase_date)
      const { data: rows, error: err } = await supa
        .from('holdings')
        .select('id,symbol,exchange,qty,avg_price,purchase_date,portfolio_id')
        .in('portfolio_id', ids)
        .in('exchange', ['NSE','BSE']);
      if (err || !rows?.length) { setLoading(false); return; }

      // Fetch live prices in one batch
      const symbols = [...new Set(rows.map(r => `${r.symbol}.${r.exchange === 'BSE' ? 'BO' : 'NS'}`.trim()))];
      let priceMap: Record<string, number> = {};
      try {
        const priceRes = await fetch(`/api/prices?symbols=${symbols.join(',')}`);
        if (priceRes.ok) {
          const pd = await priceRes.json() as Record<string, { price?: number; regularMarketPrice?: number }>;
          for (const [k, v] of Object.entries(pd)) {
            const bare = k.replace(/\.(NS|BO)$/i, '');
            priceMap[bare] = v.price ?? v.regularMarketPrice ?? 0;
          }
        }
      } catch { /* prices unavailable */ }

      const enriched: HoldingWithPrice[] = rows.map(h => {
        const cp     = priceMap[h.symbol] ?? null;
        const gain   = cp != null ? (cp - h.avg_price) * h.qty : null;
        const gainPct= cp != null && h.avg_price > 0 ? ((cp - h.avg_price) / h.avg_price) * 100 : null;
        const days   = h.purchase_date ? daysBetween(h.purchase_date) : null;
        const isLTCG = days != null && days >= 365;
        const taxRate  = gain != null && gain > 0 ? (isLTCG ? 10 : 15) : null;
        const taxAmount = (gain != null && gain > 0 && taxRate)
          ? (isLTCG ? Math.max(0, gain - 100000) * 0.10 : gain * 0.15)
          : null;
        return {
          ...h,
          current_price: cp,
          gain,
          gain_pct: gainPct,
          days_held: days,
          tax_type: days == null ? null : (isLTCG ? 'LTCG' : 'STCG'),
          tax_rate: taxRate,
          tax_amount: taxAmount,
        };
      });
      setHoldings(enriched);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalGain  = holdings.reduce((s, h) => s + (h.gain ?? 0), 0);
  const stcg       = holdings.filter(h => h.tax_type === 'STCG' && (h.gain ?? 0) > 0);
  const ltcg       = holdings.filter(h => h.tax_type === 'LTCG' && (h.gain ?? 0) > 0);
  const stcgTax    = stcg.reduce((s, h) => s + (h.tax_amount ?? 0), 0);
  const ltcgTax    = ltcg.reduce((s, h) => s + (h.tax_amount ?? 0), 0);
  const stcgGain   = stcg.reduce((s, h) => s + (h.gain ?? 0), 0);
  const ltcgGain   = ltcg.reduce((s, h) => s + (h.gain ?? 0), 0);
  const noDate     = holdings.filter(h => !h.purchase_date);

  const cardStyle = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--dim)' }}>Loading holdings…</div>
  );
  if (error) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--red)' }}>{error}</div>
  );

  return (
    <div style={{ padding:'24px 20px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:900, margin:0, letterSpacing:-0.4 }}>Capital Gains Report</h1>
        <p style={{ fontSize:13, color:'var(--dim)', margin:'6px 0 0' }}>
          Estimated tax liability for FY 2025–26 · NSE/BSE holdings only
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Total Unrealised Gain', value: fmtN(totalGain), color: totalGain >= 0 ? 'var(--grn)' : 'var(--red)' },
          { label:'STCG Gains (<1 yr)', value: fmtN(stcgGain), color: stcgGain >= 0 ? 'var(--ylw)' : 'var(--red)' },
          { label:'STCG Tax Est @ 15%', value: fmtN(stcgTax), color:'var(--red)' },
          { label:'LTCG Gains (≥1 yr)', value: fmtN(ltcgGain), color: ltcgGain >= 0 ? 'var(--grn)' : 'var(--red)' },
          { label:'LTCG Tax Est @ 10%', value: fmtN(ltcgTax), color:'var(--red)', sub: 'above ₹1L exemption' },
          { label:'Total Est Tax', value: fmtN(stcgTax + ltcgTax), color:'var(--red)' },
        ].map(c => (
          <div key={c.label} style={cardStyle}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.4, marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:20, fontWeight:900, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div style={cardStyle}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:14 }}>Holdings Breakdown</div>
        {holdings.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'var(--dim)', fontSize:13 }}>No India holdings found.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                  {['Symbol','Qty','Buy Price','Current','Gain','Held','Tax Type','Est Tax'].map(h => (
                    <th key={h} style={{ padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textAlign: h === 'Symbol' ? 'left' : 'right', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.id} style={{ borderBottom:'1px solid var(--bdr)22' }}>
                    <td style={{ padding:'8px 10px', fontSize:12, fontWeight:700 }}>{h.symbol}<span style={{ fontSize:10, color:'var(--dim)', marginLeft:4 }}>{h.exchange}</span></td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--dim)' }}>{h.qty}</td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right' }}>{fmtP(h.avg_price)}</td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right' }}>{h.current_price != null ? fmtP(h.current_price) : '—'}</td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color: (h.gain ?? 0) >= 0 ? 'var(--grn)' : 'var(--red)', fontWeight:700 }}>
                      {fmtN(h.gain)}{h.gain_pct != null && <span style={{ fontSize:10, marginLeft:4, opacity:0.7 }}>({h.gain_pct >= 0 ? '+' : ''}{h.gain_pct.toFixed(1)}%)</span>}
                    </td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--dim)' }}>
                      {h.purchase_date ? `${h.days_held}d` : <span style={{ color:'var(--org)', fontSize:10 }}>No date</span>}
                    </td>
                    <td style={{ padding:'8px 10px', textAlign:'right' }}>
                      {h.tax_type ? (
                        <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, background: h.tax_type === 'LTCG' ? 'rgba(0,212,160,0.1)' : 'rgba(255,184,0,0.1)', color: h.tax_type === 'LTCG' ? 'var(--grn)' : 'var(--ylw)' }}>{h.tax_type}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding:'8px 10px', fontSize:12, textAlign:'right', color:'var(--red)' }}>
                      {h.tax_amount != null && h.tax_amount > 0 ? fmtN(h.tax_amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning if missing purchase dates */}
      {noDate.length > 0 && (
        <div style={{ marginTop:16, background:'rgba(255,92,26,0.08)', border:'1px solid rgba(255,92,26,0.3)', borderRadius:10, padding:'12px 16px', fontSize:12, color:'var(--org)' }}>
          ⚠ {noDate.length} holding{noDate.length > 1 ? 's' : ''} missing purchase date — STCG/LTCG classification unavailable.
          Add <code>purchase_date</code> to your holdings in portfolio settings.
        </div>
      )}

      <div style={{ marginTop:20, padding:'12px 16px', background:'var(--surf2)', borderRadius:10, fontSize:11, color:'var(--dim)', lineHeight:1.7 }}>
        <strong>Tax assumptions:</strong> STCG &lt;1 year @ 15% flat. LTCG ≥1 year @ 10% on gains above ₹1L annual exemption (Budget 2024 rates).
        Losses not offset. Surcharge/cess not included. Consult a CA for actual tax filing.
        Not SEBI registered · Not investment advice · DYOR.
      </div>
    </div>
  );
}
