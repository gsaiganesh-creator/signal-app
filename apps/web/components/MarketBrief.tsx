'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceData { price: number | null; change_pct: number | null; }
interface FIIRow    { fii_net: number; dii_net: number; date: string; }

const INDICES = [
  { key: '^NSEI',    label: 'NIFTY 50'   },
  { key: '^BSESN',   label: 'SENSEX'     },
  { key: '^NSEBANK', label: 'BANK NIFTY' },
];
const GLOBAL = [
  { key: '^DJI',  label: 'DOW'  },
  { key: 'GC=F',  label: 'GOLD' },
  { key: 'CL=F',  label: 'CRUDE'},
];

function isMarketOpen(): boolean {
  const now = new Date();
  const ist  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();                        // 0=Sun, 6=Sat
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return day >= 1 && day <= 5 && mins >= 555 && mins < 930; // 9:15–15:30 IST
}

function narrative(
  nifty: PriceData | undefined,
  fiidii: FIIRow | null,
  gold: PriceData | undefined,
  crude: PriceData | undefined,
): string {
  const parts: string[] = [];

  if (nifty?.change_pct != null) {
    const c = nifty.change_pct;
    if      (c >  1)   parts.push(`Nifty strongly up ${c.toFixed(2)}%.`);
    else if (c > 0.25) parts.push(`Nifty mildly positive ${c.toFixed(2)}%.`);
    else if (c < -1)   parts.push(`Nifty under pressure ${c.toFixed(2)}%.`);
    else if (c < -0.25)parts.push(`Nifty slightly weak ${c.toFixed(2)}%.`);
    else               parts.push(`Nifty flat ${c >= 0 ? '+' : ''}${c.toFixed(2)}%.`);
  }

  if (fiidii) {
    const fii = fiidii.fii_net;
    const dii = fiidii.dii_net;
    const crFmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
    if (fii > 500)        parts.push(`FIIs net buyers ${crFmt(fii)}.`);
    else if (fii < -500)  parts.push(`FIIs net sellers ${crFmt(fii)} — DIIs ${dii > 0 ? `countered ${crFmt(dii)}` : 'also sold'}.`);
    else if (dii > 500)   parts.push(`DII support ${crFmt(dii)}.`);
  }

  if (gold?.change_pct != null && Math.abs(gold.change_pct) > 0.3) {
    parts.push(`Gold ${gold.change_pct >= 0 ? '▲' : '▼'} ${Math.abs(gold.change_pct).toFixed(1)}%.`);
  }
  if (crude?.change_pct != null && Math.abs(crude.change_pct) > 0.5) {
    parts.push(`Crude ${crude.change_pct >= 0 ? '▲' : '▼'} ${Math.abs(crude.change_pct).toFixed(1)}%.`);
  }

  return parts.join(' ') || 'Fetching market context…';
}

export function MarketBrief() {
  const [prices,  setPrices]  = useState<Record<string, PriceData>>({});
  const [fiidii,  setFiidii]  = useState<FIIRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [ts,      setTs]      = useState('');
  const [open,    setOpen]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const allTickers = [...INDICES, ...GLOBAL].map(i => i.key).join(',');
    const [priceRes, fiiRes] = await Promise.allSettled([
      fetch(`/api/prices?symbols=${encodeURIComponent(allTickers)}`).then(r => r.json()),
      fetch('/api/fii-dii').then(r => r.json()),
    ]);
    if (priceRes.status === 'fulfilled') setPrices(priceRes.value as Record<string, PriceData>);
    if (fiiRes.status === 'fulfilled')   setFiidii((fiiRes.value as { rows?: FIIRow[] }).rows?.[0] ?? null);
    setOpen(isMarketOpen());
    setTs(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nifty = prices['^NSEI'];
  const story = narrative(nifty, fiidii, prices['GC=F'], prices['CL=F']);

  function crFmt(n: number) {
    const abs = Math.abs(n);
    if (abs >= 10000) return `${n >= 0 ? '+' : '-'}₹${(abs / 10000).toFixed(1)}K Cr`;
    return `${n >= 0 ? '+' : '-'}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  }

  return (
    <div style={{ marginBottom: 16, background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle glow */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(23,64,245,0.06)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Top row: title + status + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2 }}>Market Brief</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: open ? 'rgba(0,212,160,0.1)' : 'rgba(122,139,170,0.12)', border: `1px solid ${open ? 'rgba(0,212,160,0.3)' : 'rgba(122,139,170,0.2)'}` }}>
            {open && <span className="live-dot" />}
            <span style={{ fontSize: 10, fontWeight: 700, color: open ? 'var(--grn)' : 'var(--dim)' }}>{open ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ts && <span style={{ fontSize: 10, color: 'var(--dim2)' }}>{ts}</span>}
          <button onClick={load} disabled={loading}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--bdr)', background: 'var(--surf2)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)' }}>
            {loading ? '⏳' : '↻'}
          </button>
        </div>
      </div>

      {/* Indices row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {INDICES.map(idx => {
          const d   = prices[idx.key];
          const chg = d?.change_pct ?? null;
          const up  = (chg ?? 0) >= 0;
          return (
            <div key={idx.key} style={{ flex: '1 1 120px', minWidth: 100, background: loading ? 'var(--surf2)' : up ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border: `1px solid ${loading ? 'var(--bdr)' : up ? 'rgba(0,212,160,0.22)' : 'rgba(255,59,92,0.22)'}`, borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{idx.label}</div>
              {loading
                ? <div style={{ width: 70, height: 18, borderRadius: 4, background: 'var(--surf2)' }} />
                : <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4, lineHeight: 1 }}>
                    {d?.price != null ? d.price.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </div>}
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: up ? 'var(--grn)' : 'var(--red)' }}>
                {!loading && chg != null ? `${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* FII/DII + Global row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* FII/DII */}
        {fiidii && (
          <div style={{ flex: '1 1 180px', background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>FII / DII</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--dim2)', marginBottom: 1 }}>FII</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: fiidii.fii_net >= 0 ? 'var(--grn)' : 'var(--red)' }}>{crFmt(fiidii.fii_net)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--dim2)', marginBottom: 1 }}>DII</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: fiidii.dii_net >= 0 ? 'var(--grn)' : 'var(--red)' }}>{crFmt(fiidii.dii_net)}</div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--dim2)', marginTop: 4 }}>{fiidii.date}</div>
          </div>
        )}

        {/* Global chips */}
        {GLOBAL.map(g => {
          const d   = prices[g.key];
          const chg = d?.change_pct ?? null;
          const up  = (chg ?? 0) >= 0;
          return (
            <div key={g.key} style={{ flex: '1 1 90px', background: 'var(--surf2)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{g.label}</div>
              {loading
                ? <div style={{ width: 55, height: 16, borderRadius: 4, background: 'var(--bdr)' }} />
                : <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: -0.3 }}>
                    {g.key === 'GC=F' && d?.price != null ? `$${d.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` :
                     g.key === 'CL=F' && d?.price != null ? `$${d.price.toFixed(1)}` :
                     d?.price != null ? d.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                  </div>}
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: up ? 'var(--grn)' : 'var(--red)' }}>
                {!loading && chg != null ? `${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative */}
      {!loading && (
        <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--surf2)', borderRadius: 8, borderLeft: '3px solid var(--blu)' }}>
          {story}
        </div>
      )}
    </div>
  );
}
