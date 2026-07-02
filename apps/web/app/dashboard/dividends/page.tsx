'use client';
import { useState, useEffect } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';
import { StockDetailSheet } from '@/components/StockDetailSheet';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface DivResult {
  symbol: string;
  ex_div_date: string | null;
  div_yield: number | null;
  annual_div_per_share: number | null;
  days_to_ex: number | null;
  source?: 'live' | 'history';
}

interface HoldingWithDiv extends DivResult {
  qty: number;
  avg_price: number;
  exchange: string;
  estimated_annual: number | null;
}

interface NSELeader {
  symbol: string; name: string; sector: string;
  price: number | null; div_yield: number | null;
  dps: number | null; market_cap: number | null;
  payout_ratio: number | null;
}

// Curated NSE high-dividend universe
const NSE_DIV_UNIVERSE = [
  'VEDL','COALINDIA','ONGC','BPCL','HINDPETRO','IOC','NMDC','REC','PFC',
  'POWERGRID','NTPC','ITC','HINDUNILVR','NESTLEIND','CASTROLIND','CUMMINSIND',
  'MOIL','NATIONALUM','TATASTEEL','JSWSTEEL','COALINDIA','IRFC',
].filter((v,i,a)=>a.indexOf(v)===i);

// Known consistent payers (hardcoded — streak in years)
const ARISTOCRATS = [
  { symbol:'HINDUNILVR', name:'HUL',          streak:'30+ yrs', note:'Uninterrupted since 1994' },
  { symbol:'NESTLEIND',  name:'Nestle India',  streak:'25+ yrs', note:'Decades of consistent payouts' },
  { symbol:'ITC',        name:'ITC Ltd',       streak:'30+ yrs', note:'Never missed since 1990s' },
  { symbol:'INFOSYS',    name:'Infosys',       streak:'20+ yrs', note:'Paid since listing in 1993' },
  { symbol:'TCS',        name:'TCS',           streak:'18+ yrs', note:'+ special dividends in bumper years' },
  { symbol:'POWERGRID',  name:'Power Grid',    streak:'15+ yrs', note:'Steady PSU compounder' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function DaysChip({ days, source }: { days: number | null; source?: string }) {
  if (days == null) return <span style={{ color: 'var(--dim)', fontSize: 11 }}>—</span>;
  if (days < 0) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', background: 'rgba(122,139,170,0.12)', borderRadius: 6, padding: '2px 8px' }}>
      {source === 'history' ? 'From history' : 'Ex-date passed'}
    </span>
  );
  if (days <= 7) return <span style={{ fontSize: 11, fontWeight: 700, color: '#FF5C1A', background: 'rgba(255,92,26,0.12)', border: '1px solid rgba(255,92,26,0.3)', borderRadius: 6, padding: '2px 8px' }}>🔥 {days}d left</span>;
  if (days <= 30) return <span style={{ fontSize: 11, fontWeight: 700, color: '#FFB800', background: 'rgba(255,184,0,0.10)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 6, padding: '2px 8px' }}>{days}d</span>;
  return <span style={{ fontSize: 11, color: 'var(--dim)' }}>{days}d</span>;
}

export default function DividendsPage() {
  const { session, portfolios } = usePortfolio();
  const [rows, setRows]             = useState<HoldingWithDiv[]>([]);
  const [noDivSyms, setNoDivSyms]   = useState<string[]>([]);
  const [noDivHoldings, setNoDivHoldings] = useState<{ symbol: string; exchange: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [sort, setSort]             = useState<{ col: keyof HoldingWithDiv; dir: 1 | -1 }>({ col: 'days_to_ex', dir: 1 });
  const [tab, setTab]               = useState<'upcoming' | 'all' | 'leaders'>('upcoming');
  const [detailSym, setDetailSym]   = useState<{ symbol: string; exchange: string } | null>(null);
  const [leaders,       setLeaders]       = useState<NSELeader[]>([]);
  const [leadersLoading,setLeadersLoading]= useState(false);
  const [leadersLoaded, setLeadersLoaded] = useState(false);
  const [leaderSort, setLeaderSort] = useState<{ col: keyof NSELeader; dir: 1|-1 }>({ col:'div_yield', dir:-1 });

  useEffect(() => {
    if (!session || !portfolios.length) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const ids = portfolios.map(p => p.id).join(',');
        const hRes = await fetch(
          `${SUPA_URL}/rest/v1/holdings?select=symbol,qty,avg_price,exchange&portfolio_id=in.(${ids})`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
        );
        const holdings: { symbol: string; qty: number; avg_price: number; exchange: string }[] =
          hRes.ok ? await hRes.json() : [];

        if (!holdings.length) { setLoading(false); return; }

        const symMap = new Map<string, { qty: number; avg_price: number; exchange: string }>();
        for (const h of holdings) {
          const ex = symMap.get(h.symbol);
          if (!ex || h.qty > ex.qty) symMap.set(h.symbol, { qty: h.qty, avg_price: h.avg_price, exchange: h.exchange });
        }

        const tickers = Array.from(symMap.entries()).map(([sym, h]) => {
          if (h.exchange === 'NSE') return `${sym}.NS`;
          if (h.exchange === 'BSE') return `${sym}.BO`;
          return sym;
        });

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
        const noDivH: { symbol: string; exchange: string }[] = [];

        for (const [sym, h] of symMap.entries()) {
          const div = divMap.get(sym);
          if (div) {
            const est = div.annual_div_per_share != null ? div.annual_div_per_share * h.qty : null;
            withDiv.push({ ...div, qty: h.qty, avg_price: h.avg_price, exchange: h.exchange, estimated_annual: est });
          } else {
            noDiv.push(sym);
            noDivH.push({ symbol: sym, exchange: h.exchange });
          }
        }

        setRows(withDiv);
        setNoDivSyms(noDiv);
        setNoDivHoldings(noDivH);

        // Auto-switch to relevant tab
        const upcoming = withDiv.filter(r => r.days_to_ex != null && r.days_to_ex >= 0 && r.days_to_ex <= 60);
        if (upcoming.length === 0 && withDiv.length > 0) setTab('all');
      } catch (e) {
        setError(String(e));
      }
      setLoading(false);
    })();
  }, [session, portfolios]);

  async function loadLeaders() {
    if (leadersLoaded || leadersLoading) return;
    setLeadersLoading(true);
    try {
      const batch = NSE_DIV_UNIVERSE.join(',');
      const r = await fetch(`/api/fundamental-scan?symbols=${encodeURIComponent(batch)}`);
      if (!r.ok) return;
      const d = await r.json() as { results: { symbol:string; name:string; sector:string; price:number|null; dividend_yield:number|null; market_cap:number|null; payout_ratio:number|null }[] };
      const mapped: NSELeader[] = d.results
        .filter(s => s.dividend_yield != null && s.dividend_yield > 0)
        .map(s => ({
          symbol: s.symbol, name: s.name ?? s.symbol, sector: s.sector ?? '—',
          price: s.price, div_yield: s.dividend_yield,
          dps: (s.price != null && s.dividend_yield != null) ? +(s.price * s.dividend_yield / 100).toFixed(2) : null,
          market_cap: s.market_cap, payout_ratio: s.payout_ratio,
        }))
        .sort((a, b) => (b.div_yield ?? 0) - (a.div_yield ?? 0));
      setLeaders(mapped);
      setLeadersLoaded(true);
    } finally {
      setLeadersLoading(false);
    }
  }

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
  const yieldRows = rows.filter(r => r.div_yield != null);
  const avgYield  = yieldRows.length > 0 ? yieldRows.reduce((s, r) => s + (r.div_yield ?? 0), 0) / yieldRows.length : 0;
  const soonest   = rows.filter(r => r.days_to_ex != null && r.days_to_ex >= 0).sort((a, b) => (a.days_to_ex ?? 999) - (b.days_to_ex ?? 999))[0];

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
      <a href="/sign-in" style={{ color: 'var(--bluL)', fontSize: 13 }}>Sign in →</a>
    </div>
  );

  const card: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-bdr)',
    borderRadius: 14,
    padding: '18px 20px',
    backdropFilter: 'blur(20px)',
  };

  return (
    <>
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
          {/* Data coverage notice when Yahoo has no data */}
          {!loading && rows.length === 0 && noDivSyms.length > 0 && (
            <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.22)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ylw)', marginBottom: 4 }}>Limited dividend data for Indian stocks</div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6 }}>
                  Yahoo Finance has sparse coverage for NSE dividend data. Your holdings are listed below under &quot;Non-Paying / Unknown&quot;.
                  Check <a href="https://www.nseindia.com/companies-listing/corporate-filings-dividends" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bluL)', textDecoration: 'none' }}>NSEIndia</a> or{' '}
                  <a href="https://www.moneycontrol.com/stocks/dividends/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bluL)', textDecoration: 'none' }}>MoneyControl</a> for accurate ex-dates.
                </div>
              </div>
            </div>
          )}

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
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{noDivSyms.length} non-paying / unknown</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {([
              { key: 'upcoming', label: `Upcoming (60d) · ${upcoming.length}` },
              { key: 'all',      label: `All Paying · ${rows.length}` },
              { key: 'leaders',  label: '🏆 NSE Dividend Leaders' },
            ] as { key: typeof tab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'leaders') loadLeaders(); }}
                style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: tab === t.key ? 'var(--blu)' : 'var(--surf2)',
                  borderColor: tab === t.key ? 'var(--blu)' : 'var(--bdr)',
                  color: tab === t.key ? '#fff' : 'var(--dim)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Portfolio holding table — Upcoming / All Paying */}
          {(tab === 'upcoming' || tab === 'all') && (
            displayed.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No upcoming ex-dates in next 60 days</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  {rows.length > 0 ? 'Switch to "All Paying" to see all dividend stocks' : 'Switch to "NSE Dividend Leaders" to explore top-yield stocks'}
                </div>
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
                            <button onClick={() => setDetailSym({ symbol: r.symbol, exchange: r.exchange })}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--bluL)', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', textAlign: 'left' }}>
                              {r.symbol}
                            </button>
                            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
                              {r.exchange}{r.source === 'history' && <span style={{ color: 'rgba(122,139,170,0.7)', marginLeft: 4 }}>• hist</span>}
                            </div>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', whiteSpace: 'nowrap' }}>{r.ex_div_date ? fmtDate(r.ex_div_date) : '—'}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)' }}><DaysChip days={r.days_to_ex} source={r.source} /></td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 700, color: 'var(--ylw)' }}>{r.div_yield != null ? `${r.div_yield.toFixed(2)}%` : '—'}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', color: 'var(--dim)' }}>{r.annual_div_per_share != null ? `₹${r.annual_div_per_share.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', color: 'var(--dim)' }}>{r.qty.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 700, color: 'var(--grn)' }}>{r.estimated_annual != null ? fmtINR(r.estimated_annual) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* NSE Dividend Leaders tab */}
          {tab === 'leaders' && (
            <>
              {/* Aristocrats strip */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ylw)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>🏅 Consistent Payers — 15+ Years</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
                  {ARISTOCRATS.map(a => (
                    <button key={a.symbol} onClick={() => setDetailSym({ symbol: a.symbol, exchange: 'NSE' })}
                      style={{ textAlign: 'left', background: 'linear-gradient(135deg,rgba(255,184,0,0.07),var(--surf))', border: '1px solid rgba(255,184,0,0.22)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)', marginBottom: 3 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ylw)', fontWeight: 700 }}>{a.streak}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3, lineHeight: 1.4 }}>{a.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Top yield table */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grn)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>📊 Top Yield — NSE Universe · Sorted by Yield %</div>

              {leadersLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3,4,5].map(i => <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--surf2)', animation: 'pulse 1.4s infinite' }}/>)}
                </div>
              ) : leaders.length === 0 && leadersLoaded ? (
                <div style={{ ...card, textAlign: 'center', padding: '30px 20px', color: 'var(--dim)', fontSize: 13 }}>No data — Yahoo Finance may be slow. Try again in a moment.</div>
              ) : leaders.length > 0 ? (
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {(['symbol','name','sector','price','div_yield','dps','payout_ratio','market_cap'] as (keyof NSELeader)[]).map((col, i) => {
                            const labels: Record<string, string> = { symbol:'Stock', name:'Name', sector:'Sector', price:'CMP', div_yield:'Yield %', dps:'Annual DPS', payout_ratio:'Payout %', market_cap:'Mkt Cap' };
                            const active = leaderSort.col === col;
                            return (
                              <th key={col} onClick={() => setLeaderSort(s => s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: -1 })}
                                style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: active ? 'var(--txt)' : 'var(--dim)', textAlign: i < 3 ? 'left' : 'right', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--bdr)', background: 'var(--surf2)' }}>
                                {labels[col]}{active ? (leaderSort.dir === -1 ? ' ▼' : ' ▲') : ''}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {[...leaders].sort((a,b) => {
                          const av = a[leaderSort.col] as number|string|null;
                          const bv = b[leaderSort.col] as number|string|null;
                          if (av == null && bv == null) return 0;
                          if (av == null) return 1; if (bv == null) return -1;
                          return (av < bv ? -1 : av > bv ? 1 : 0) * leaderSort.dir;
                        }).map((r, idx) => (
                          <tr key={r.symbol}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', fontWeight: 800 }}>
                              <button onClick={() => setDetailSym({ symbol: r.symbol, exchange: 'NSE' })}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--bluL)', fontWeight: 800, fontSize: 13, fontFamily: 'inherit' }}>
                                {idx + 1}. {r.symbol}
                              </button>
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', fontSize: 12, color: 'var(--dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', fontSize: 11, color: 'var(--dim2)' }}>{r.sector}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', textAlign: 'right', fontWeight: 600 }}>₹{r.price?.toLocaleString('en-IN', { maximumFractionDigits: 1 }) ?? '—'}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', textAlign: 'right', fontWeight: 800, color: (r.div_yield ?? 0) >= 5 ? 'var(--grn)' : 'var(--ylw)' }}>
                              {r.div_yield != null ? `${r.div_yield.toFixed(2)}%` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', textAlign: 'right', color: 'var(--dim)' }}>
                              {r.dps != null ? `₹${r.dps.toFixed(2)}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', textAlign: 'right', fontSize: 12, color: 'var(--dim)' }}>
                              {r.payout_ratio != null ? `${(r.payout_ratio * 100).toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', textAlign: 'right', fontSize: 12, color: 'var(--dim)' }}>
                              {r.market_cap != null ? (r.market_cap >= 1e11 ? `₹${(r.market_cap/1e11).toFixed(1)}L Cr` : r.market_cap >= 1e9 ? `₹${(r.market_cap/1e9).toFixed(0)}Cr` : '—') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 12 }}>
                Yield % = annual DPS / current price · Annual DPS computed from price × yield · Payout % = dividends / earnings · Data from Yahoo Finance · Click any stock for full detail · NOT SEBI REGISTERED · Not investment advice.
              </div>
            </>
          )}

          <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 16 }}>
            ⚠️ Dividend data from Yahoo Finance — may lag actual corporate announcements. &quot;hist&quot; = computed from past 12 months dividend events. Always verify with NSE/BSE or company filings. NOT SEBI REGISTERED · Not investment advice.
          </div>
        </>
      )}

      {/* Empty state — no portfolios */}
      {!loading && !error && portfolios.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No portfolio yet</div>
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 20 }}>Upload holdings to see dividend data</div>
          <a href="/dashboard/portfolio"
            style={{ height: 38, padding: '0 20px', borderRadius: 9, background: 'var(--blu)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Upload Portfolio →
          </a>
        </div>
      )}

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
