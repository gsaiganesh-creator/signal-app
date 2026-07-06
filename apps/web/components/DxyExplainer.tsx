'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Same DXY trend classification used by the mstock-automation trading
// scanner (trading/scanner.py) for the "FII headwind" score penalty —
// this widget explains the real strategy logic, not generic DXY theory.
const TRENDS = {
  rising:  { label: 'Rising',  color: 'var(--red)', action: 'FII headwind — every Indian stock score gets −1 penalty' },
  flat:    { label: 'Flat',    color: 'var(--dim)', action: 'No penalty — dollar strength roughly unchanged' },
  falling: { label: 'Falling', color: 'var(--grn)', action: 'Tailwind for Indian equities — no penalty' },
} as const;

type TrendKey = keyof typeof TRENDS;

export function DxyExplainer({ showLearnMore = true }: { showLearnMore?: boolean }) {
  const [dxy, setDxy]         = useState<number | null>(null);
  const [trend, setTrend]     = useState<TrendKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dxy')
      .then(r => r.json())
      .then((d: { dxy: number | null; trend: TrendKey | null }) => {
        setDxy(d.dxy);
        setTrend(d.trend);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const info = trend ? TRENDS[trend] : null;

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 16,
      padding: '18px 20px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>💵 US Dollar Index (DXY)</div>
        {dxy != null && <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{dxy.toFixed(2)}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>
          Measures dollar strength against a basket of major currencies — a rising dollar typically pressures FII inflows into Indian equities.
        </div>
        {showLearnMore && (
          <Link href="/dashboard/dxy-explained" style={{ fontSize: 11, fontWeight: 700, color: 'var(--bluL)', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 10 }}>
            Learn more →
          </Link>
        )}
      </div>

      {loading && <div style={{ fontSize: 12, color: 'var(--dim)' }}>⏳ loading…</div>}
      {!loading && (dxy == null || !info) && (
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>DXY data unavailable right now.</div>
      )}

      {!loading && dxy != null && info && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(Object.keys(TRENDS) as TrendKey[]).map(k => (
              <div key={k} style={{ flex: 1, height: 8, borderRadius: 4, background: TRENDS[k].color, opacity: k === trend ? 1 : 0.25 }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: info.color }}>{info.label}</span>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>(5-day MA vs 3 days ago)</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{info.action}</div>
        </>
      )}
    </div>
  );
}
