'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface DivResult {
  symbol: string;
  ex_div_date: string | null;
  div_yield: number | null;
  annual_div_per_share: number | null;
  days_to_ex: number | null;
}

interface HoldingWithDiv extends DivResult {
  qty: number;
  avg_price: number;
  exchange: string;
  estimated_annual: number | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function DaysChip({ days }: { days: number | null }) {
  if (days == null) return <span style={{ color: 'var(--dim)', fontSize: 11 }}>—</span>;
  if (days < 0) return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', background: 'rgba(122,139,170,0.12)', borderRadius: 6, padding: '2px 8px' }}>Ex-date passed</span>;
  if (days <= 7) return <span style={{ fontSize: 11, fontWeight: 700, color: '#FF5C1A', background: 'rgba(255,92,26,0.12)', border: '1px solid rgba(255,92,26,0.3)', borderRadius: 6, padding: '2px 8px' }}>🔥 {days}d left</span>;
  if (days <= 30) return <span style={{ fontSize: 11, fontWeight: 700, color: '#FFB800', background: 'rgba(255,184,0,0.10)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 6, padding: '2px 8px' }}>{days}d</span>;
  return <span style={{ fontSize: 11, color: 'var(--dim)' }}>{days}d</span>;
}

export default function DividendsPage() {
  const { session, portfolios } = usePortfolio();
  const [rows, setRows]       = useState<HoldingWithDiv[]>([]);
  const [noDivSyms, setNoDivSyms] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [sort, setSort]         = useState<{ col: keyof HoldingWithDiv; dir: 1 | -1 }>({ col: 'days_to_ex', dir: 1 });
  const [tab, setTab]           = useState<'upcoming' | 'all' | 'nodiv'>('upcoming');

  useEffect(() => {
    if (!session || !portfolios.length) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const ids = portfolios.map(p => p.id).join(',');
        // Fetch all India + US holdings
        const hRes = await fetch(
          `${SUPA_URL}/rest/v1/holdings?select=symbol,qty,avg_price,exchange&portfolio_id=in.(${ids})`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
        );
        const holdings: { symbol: string; qty: number; avg_price: number; exchange: string }[] =
          hRes.ok ? await hRes.json() : [];

        if (!holdings.length) { setLoading(false); return; }

        // Deduplicate symbols — keep highest qty per symbol
        const symMap = new Map<string, { qty: number; avg_price: number; exchange: string }>();
        for (const h of holdings) {
          const ex = symMap.get(h.symbol);
          if (!ex || h.qty > ex.qty) symMap.set(h.symbol, { qty: h.qty, avg_price: h.avg_price, exchange: h.exchange });
        }

        // Build Yahoo tickers
        const tickers = Array.from(symMap.entries()).map(([sym, h]) => {
          if (h.exchange === 'NSE') return `${sym}.NS`;
          if (h.exchange === 'BSE') return `${sym}.BO`;
          return sym; // US stocks — no suffix
        });

        // Batch: max 30 per call
        const BATCH = 30;
        const allDiv: DivResult[] = [];
        for (let i = 0; i < tickers.length; i += BATCH) {
          const batch = tickers.slice(i, i + BATCH);
          const r = await fetch(`/api/dividends?symbols=${encodeURIComponent(batch.join(','))}`);
          if (r.ok) {
            const d = await r.json() as { results: DivResult[] };
            allDiv.push(...(d.results ?? []));
          }
        }

        const divMap = new Map(allDiv.map(d => [d.symbol, d]));
        const withDiv: HoldingWithDiv[] = [];
        const noDiv: string[] = [];

        for (const [sym, h] of symMap.entries()) {
          const div = divMap.get(sym);
          if (div) {
            const est = div.annual_div_per_share != null ? div.annual_div_per_share * h.qty : null;
            withDiv.push({ ...div, qty: h.qty, avg_price: h.avg_price, exchange: h.exchange, estimated_annual: est });
          } else {
            noDiv.push(sym);
          }
        }

        setRows(withDiv);
        setNoDivSyms(noDiv);
      } catch (e) {
        setError(String(e));
      }
      setLoading(false);
    })();
  }, [session, portfolios]);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.col] as number | string | null;
    const bv = b[sort.col] as number | string | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
  });

  const upcoming = sorted.filter(r => r.days_to_ex != null && r.days_to_ex >= 0 && r.days_to_ex <= 60);
  const displayed = tab === 'upcoming' ? upcoming : tab === 'all' ? sorted : [];

  const totalEstAnnual = rows.reduce((s, r) => s + (r.estimated_annual ?? 0), 0);
  const avgYield = rows.length > 0
    ? rows.filter(r => r.div_yield != null).reduce((s, r) => s + (r.div_yield ?? 0), 0) / rows.filter(r => r.div_yield != null).length
    : 0;
  const soonest = rows.filter(r => r.days_to_ex != null && r.days_to_ex >= 0).sort((a, b) => (a.days_to_ex ?? 999) - (b.days_to_ex ?? 999))[0];

  function th(label: string, col: keyof HoldingWithDiv) {
    const active = sort.col === col;
    return (
      <th onClick={() => setSort(s => s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: col === 'days_to_ex' ? 1 : -1 })}
        style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: active ? 'var(--txt)' : 'var(--dim)', textAlign: 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--bdr)', background: 'var(--surf2)' }}>
        {label}{active ? (sort.dir === -1 ? ' ▼' : ' ▲') : ''}
      </th>
    );
  }

  if (!session) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Sign in to view dividends</div>
      <Link href="/sign-in" style={{ color: 'var(--bluL)', fontSize: 13 }}>Sign in →</Link>
    </div>
  );

  const card: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(20px)' };

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>💰 Dividends</div>
        <div style={{ fontSize: 13, color: 'var(--dim)' }}>Upcoming ex-dates and estimated payouts across your portfolio</div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,59,92,0.07)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 10, padding: '12px 16px', color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ ...card, height: 90 }}>
              <div style={{ width: 80, height: 11, background: 'var(--surf2)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: 120, height: 22, background: 'var(--surf2)', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ ...card, background: 'linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))', borderColor: 'rgba(0,212,160,0.28)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grn)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Est. Annual Income</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>{totalEstAnnual > 0 ? fmtINR(totalEstAnnual) : '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>across {rows.length} div-paying stocks</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Avg Yield</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, color: 'var(--ylw)' }}>{avgYield > 0 ? `${avgYield.toFixed(2)}%` : '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>portfolio weighted avg</div>
            </div>
            <div style={{ ...card, background: soonest ? 'linear-gradient(135deg,rgba(255,184,0,0.08),transparent)' : undefined, borderColor: soonest ? 'rgba(255,184,0,0.25)' : undefined }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ylw)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Next Ex-Date</div>
              {soonest ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{soonest.symbol}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{fmtDate(soonest.ex_div_date!)} · {soonest.days_to_ex}d away</div>
                </>
              ) : <div style={{ fontSize: 14, color: 'var(--dim)' }}>None in next 60d</div>}
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Stocks Paying</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>{rows.length}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{noDivSyms.length} non-paying in portfolio</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {([
              { key: 'upcoming', label: `Upcoming (60d) · ${upcoming.length}` },
              { key: 'all',      label: `All Paying · ${rows.length}` },
              { key: 'nodiv',    label: `Non-Paying · ${noDivSyms.length}` },
            ] as { key: typeof tab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: tab === t.key ? 'var(--blu)' : 'var(--surf2)',
                  borderColor: tab === t.key ? 'var(--blu)' : 'var(--bdr)',
                  color: tab === t.key ? '#fff' : 'var(--dim)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {tab !== 'nodiv' && (
            displayed.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No upcoming ex-dates in next 60 days</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>Switch to "All Paying" to see all dividend stocks</div>
              </div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {th('Stock', 'symbol')}
                        {th('Ex-Date', 'ex_div_date')}
                        {th('Days To Ex', 'days_to_ex')}
                        {th('Yield %', 'div_yield')}
                        {th('Annual ÷/Share', 'annual_div_per_share')}
                        {th('Qty', 'qty')}
                        {th('Est. Annual', 'estimated_annual')}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(r => (
                        <tr key={r.symbol}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 700 }}>
                            <Link href={`/stocks/${r.symbol.toLowerCase()}`}
                              style={{ color: 'var(--bluL)', textDecoration: 'none' }}>{r.symbol}</Link>
                            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{r.exchange}</div>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', whiteSpace: 'nowrap' }}>
                            {r.ex_div_date ? fmtDate(r.ex_div_date) : '—'}
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)' }}>
                            <DaysChip days={r.days_to_ex} />
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 700, color: 'var(--ylw)' }}>
                            {r.div_yield != null ? `${r.div_yield.toFixed(2)}%` : '—'}
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', color: 'var(--dim)' }}>
                            {r.annual_div_per_share != null ? `₹${r.annual_div_per_share.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', color: 'var(--dim)' }}>
                            {r.qty.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 700, color: 'var(--grn)' }}>
                            {r.estimated_annual != null ? fmtINR(r.estimated_annual) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Non-paying stocks */}
          {tab === 'nodiv' && (
            <div style={card}>
              {noDivSyms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--dim)', fontSize: 13 }}>All holdings pay dividends 🎉</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14 }}>These holdings don&apos;t pay dividends (or data unavailable)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {noDivSyms.map(sym => (
                      <Link key={sym} href={`/stocks/${sym.toLowerCase()}`}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--txt)', textDecoration: 'none' }}>
                        {sym}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 16 }}>
            ⚠️ Dividend data from Yahoo Finance — may lag actual corporate announcements. Always verify with NSE/BSE or company filings. NOT SEBI REGISTERED · Not investment advice.
          </div>
        </>
      )}

      {/* Empty state — no portfolios */}
      {!loading && !error && portfolios.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No portfolio yet</div>
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 20 }}>Upload holdings to see dividend data</div>
          <Link href="/dashboard/portfolio"
            style={{ height: 38, padding: '0 20px', borderRadius: 9, background: 'var(--blu)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Upload Portfolio →
          </Link>
        </div>
      )}
    </>
  );
}
