'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Same India VIX zones/thresholds used by the mstock-automation trading
// scanner (trading/scanner.py) for position sizing — this widget explains
// the real strategy logic, not generic textbook VIX bands.
const ZONES = [
  { key: 'too_calm', label: 'Too Calm',  max: 12,       color: 'var(--dim)',  action: 'No new buys — moves too small to trade' },
  { key: 'normal',   label: 'Normal',    max: 20,       color: 'var(--grn)',  action: 'Full position size' },
  { key: 'elevated', label: 'Elevated',  max: 25,       color: 'var(--ylw)',  action: 'Half position size — fear rising' },
  { key: 'panic',    label: 'Panic',     max: Infinity, color: 'var(--red)',  action: 'No new buys — panic mode' },
] as const;

function zoneFor(vix: number) {
  return ZONES.find(z => vix < z.max) ?? ZONES[ZONES.length - 1];
}

export function VixExplainer({ showLearnMore = true }: { showLearnMore?: boolean }) {
  const [vix, setVix]         = useState<number | null>(null);
  const [changePct, setChg]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prices?symbols=%5EINDIAVIX')
      .then(r => r.json())
      .then((d: Record<string, { price: number | null; change_pct: number | null }>) => {
        setVix(d['^INDIAVIX']?.price ?? null);
        setChg(d['^INDIAVIX']?.change_pct ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const zone = vix != null ? zoneFor(vix) : null;
  // Position within the 0-30+ display range, clamped, for the marker on the segmented bar.
  const markerPct = vix != null ? Math.min(100, Math.max(0, (vix / 30) * 100)) : null;

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 16,
      padding: '18px 20px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>😨 India VIX — Fear Gauge</div>
        {vix != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{vix.toFixed(2)}</span>
            {changePct != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: changePct >= 0 ? 'var(--red)' : 'var(--grn)' }}>
                {changePct >= 0 ? '🔴' : '🟢'} {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>
          Measures expected 30-day volatility on the Nifty — how much fear or calm the market is pricing in.
        </div>
        {showLearnMore && (
          <Link href="/dashboard/vix-explained" style={{ fontSize: 11, fontWeight: 700, color: 'var(--bluL)', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 10 }}>
            Learn more →
          </Link>
        )}
      </div>

      {loading && <div style={{ fontSize: 12, color: 'var(--dim)' }}>⏳ loading…</div>}

      {!loading && vix == null && (
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>VIX data unavailable right now.</div>
      )}

      {!loading && vix != null && zone && (
        <>
          {/* Segmented zone bar with current-value marker */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              {ZONES.map(z => (
                <div key={z.key} style={{ flex: 1, background: z.color, opacity: z.key === zone.key ? 1 : 0.25 }} />
              ))}
            </div>
            {markerPct != null && (
              <div style={{
                position: 'absolute', top: -3, left: `${markerPct}%`, transform: 'translateX(-50%)',
                width: 14, height: 14, borderRadius: '50%', background: zone.color,
                border: '2px solid var(--card-bg)', boxShadow: '0 0 0 1px var(--card-bdr)',
              }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: zone.color }}>{zone.label}</span>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>
              ({ZONES.indexOf(zone) === 0 ? '< 12' : ZONES.indexOf(zone) === ZONES.length - 1 ? '> 25' : `${ZONES[ZONES.indexOf(zone) - 1].max}–${zone.max}`})
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>{zone.action}</div>
        </>
      )}
    </div>
  );
}
