'use client';

import { useState } from 'react';

interface IncomeRow { year: string; revenue: number|null; gross: number|null; ebit: number|null; net: number|null }
interface BalanceRow { year: string; assets: number|null; liab: number|null; equity: number|null; debt: number|null; cash: number|null; de: number|null }
interface FinData { income: IncomeRow[]; balance: BalanceRow[]; }

function fmt(n: number | null, currency = '₹'): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${currency}${(n / 1e7 / 1e5).toFixed(1)} L Cr`;
  if (abs >= 1e9)  return `${currency}${(n / 1e7).toFixed(0)} Cr`;
  if (abs >= 1e7)  return `${currency}${(n / 1e7).toFixed(2)} Cr`;
  return `${currency}${n.toLocaleString('en-IN')}`;
}

function pctColor(n: number | null, prev: number | null) {
  if (n == null || prev == null || prev === 0) return 'var(--dim)';
  return n > prev ? 'var(--grn)' : n < prev ? 'var(--red)' : 'var(--dim)';
}

function growthPct(curr: number|null, prev: number|null): string {
  if (curr == null || prev == null || prev === 0) return '';
  const g = ((curr - prev) / Math.abs(prev)) * 100;
  return `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign:'right', padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{children}</th>
);
const TD = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <td style={{ textAlign:'right', padding:'6px 10px', fontSize:12, color: color ?? 'var(--txt)', whiteSpace:'nowrap' }}>{children}</td>
);

export function FinancialsSection({ symbol, exchange }: { symbol: string; exchange: string }) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<'income'|'balance'>('income');
  const [data, setData]     = useState<FinData | null>(null);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState(false);

  async function load() {
    if (data || loading) return;
    setLoad(true);
    try {
      const r = await fetch(`/api/financials?symbol=${symbol}&exchange=${exchange}`);
      if (r.ok) setData(await r.json());
      else setError(true);
    } catch { setError(true); }
    setLoad(false);
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, marginBottom:20, overflow:'hidden' }}>
      <button onClick={toggle} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', color:'var(--txt)' }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:'var(--dim)' }}>Financial Statements</span>
        <span style={{ fontSize:14, color:'var(--dim)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding:'0 18px 18px' }}>
          {/* Tab bar */}
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            {(['income','balance'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700, background: tab===t ? 'var(--blu)' : 'var(--surf2)', border:`1px solid ${tab===t ? 'var(--blu)' : 'var(--bdr)'}`, color: tab===t ? '#fff' : 'var(--dim)', cursor:'pointer', textTransform:'capitalize' }}>
                {t === 'income' ? 'P&L' : 'Balance Sheet'}
              </button>
            ))}
          </div>

          {loading && <div style={{ textAlign:'center', padding:20, fontSize:12, color:'var(--dim)' }}>Loading…</div>}
          {error   && <div style={{ textAlign:'center', padding:20, fontSize:12, color:'var(--red)' }}>Failed to load financials</div>}

          {data && tab === 'income' && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                    <th style={{ textAlign:'left', padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase' }}>Year</th>
                    <TH>Revenue</TH><TH>Gross Profit</TH><TH>EBIT</TH><TH>Net Profit</TH>
                  </tr>
                </thead>
                <tbody>
                  {data.income.map((row, i) => {
                    const prev = data.income[i - 1];
                    return (
                      <tr key={row.year} style={{ borderBottom:'1px solid var(--bdr)22' }}>
                        <td style={{ padding:'6px 10px', fontSize:12, fontWeight:700, color:'var(--txt)' }}>{row.year}</td>
                        <TD>{fmt(row.revenue)}</TD>
                        <TD color={pctColor(row.gross, prev?.gross)}>
                          {fmt(row.gross)}{prev && <span style={{ fontSize:10, marginLeft:4, opacity:0.7 }}>{growthPct(row.gross, prev.gross)}</span>}
                        </TD>
                        <TD color={pctColor(row.ebit, prev?.ebit)}>{fmt(row.ebit)}</TD>
                        <TD color={pctColor(row.net, prev?.net)}>
                          {fmt(row.net)}{prev && <span style={{ fontSize:10, marginLeft:4, opacity:0.7 }}>{growthPct(row.net, prev.net)}</span>}
                        </TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data && tab === 'balance' && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
                    <th style={{ textAlign:'left', padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase' }}>Year</th>
                    <TH>Total Assets</TH><TH>Total Liab</TH><TH>Equity</TH><TH>LT Debt</TH><TH>Cash</TH><TH>D/E</TH>
                  </tr>
                </thead>
                <tbody>
                  {data.balance.map(row => (
                    <tr key={row.year} style={{ borderBottom:'1px solid var(--bdr)22' }}>
                      <td style={{ padding:'6px 10px', fontSize:12, fontWeight:700, color:'var(--txt)' }}>{row.year}</td>
                      <TD>{fmt(row.assets)}</TD>
                      <TD>{fmt(row.liab)}</TD>
                      <TD>{fmt(row.equity)}</TD>
                      <TD color={row.debt && row.debt > 0 ? 'var(--red)' : undefined}>{fmt(row.debt)}</TD>
                      <TD color='var(--grn)'>{fmt(row.cash)}</TD>
                      <TD color={row.de != null ? (row.de > 1 ? 'var(--red)' : row.de < 0.5 ? 'var(--grn)' : 'var(--ylw)') : undefined}>
                        {row.de != null ? row.de.toFixed(2) : '—'}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop:10, fontSize:10, color:'var(--dim2)' }}>Annual figures · Yahoo Finance · Not SEBI advice</div>
        </div>
      )}
    </div>
  );
}
