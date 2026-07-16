'use client';
import { useState, useEffect, useMemo } from 'react';

interface USSignalRow {
  symbol: string;
  name: string;
  sector: string;
  cmp: number | null;
  chg: number | null;
  rsi: number | null;
  ema20: number;
  ema_dist_pct: number;
  entry_low: number;
  entry_high: number;
  target: number;
  sl: number;
  signal: string;
  confidence: number | null;
  score: number;
}

interface USSignalsResponse {
  signals: USSignalRow[];
  count: number;
  cached: boolean;
}

type SortKey = 'symbol' | 'sector' | 'cmp' | 'chg' | 'rsi' | 'signal' | 'confidence';
type SortDir = 'asc' | 'desc';

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 16,
  padding: '18px 20px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
};

function signalBadgeStyle(signal: string): React.CSSProperties {
  if (signal === 'BUY') {
    return { color: 'var(--grn)', background: 'rgba(0,212,160,0.12)', border: '1px solid rgba(0,212,160,0.35)' };
  }
  if (signal === 'SELL') {
    return { color: 'var(--red)', background: 'rgba(255,59,92,0.10)', border: '1px solid rgba(255,59,92,0.32)' };
  }
  return { color: 'var(--dim)', background: 'rgba(122,139,170,0.08)', border: '1px solid rgba(122,139,170,0.2)' };
}

// Display-only mapping — never show a raw BUY/SELL/HOLD scan value to the
// user (SEBI RA registration requirement, not just style). The underlying
// `signal` field itself stays untouched since paper-trading and other
// internal logic branch on the raw value.
function signalLabel(signal: string): string {
  if (signal === 'BUY') return 'Bullish';
  if (signal === 'SELL') return 'Bearish';
  return 'Neutral';
}

export default function USSignalsPage() {
  const [data, setData] = useState<USSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('confidence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/ml/signals/us?limit=20')
      .then(r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((json: USSignalsResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load US signals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const list = data?.signals ?? [];
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey as keyof USSignalRow];
      const bv = b[sortKey as keyof USSignalRow];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'sector', label: 'Sector' },
    { key: 'cmp', label: 'Price' },
    { key: 'chg', label: 'Change%' },
    { key: 'rsi', label: 'RSI' },
    { key: 'signal', label: 'Signal' },
    { key: 'confidence', label: 'Confidence' },
  ];

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>US Signals</div>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 3 }}>
          Technical scan output on the ~100-stock US monitored universe, refreshed daily.
        </div>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
      ) : !rows.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 32 }}>
          No US scan results yet. Check back after the next scheduled scan.
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--dim)', padding: '10px 14px',
                        textAlign: 'left', borderBottom: '1px solid var(--bdr)', textTransform: 'uppercase',
                        letterSpacing: 0.4, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      {col.label}{sortArrow(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.symbol}
                    onMouseEnter={() => setHoveredRow(row.symbol)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: hoveredRow === row.symbol ? 'var(--surf2)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{row.symbol}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)' }}>{row.name}</div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)', fontSize: 12, color: 'var(--dim)' }}>
                      {row.sector}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {row.cmp != null ? `$${row.cmp.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)', fontSize: 12, fontWeight: 700, color: row.chg != null && row.chg >= 0 ? 'var(--grn)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                      {row.chg != null ? `${row.chg >= 0 ? '+' : ''}${row.chg.toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)', fontSize: 12, color: row.rsi != null && row.rsi >= 50 ? 'var(--grn)' : 'var(--red)' }}>
                      {row.rsi != null ? row.rsi.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', ...signalBadgeStyle(row.signal) }}>
                        {signalLabel(row.signal)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(28,46,74,0.4)', fontSize: 12, color: 'var(--txt)' }}>
                      {row.confidence != null ? `${row.confidence}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 14 }}>
        ⚠️ <strong style={{ color: 'var(--ylw)' }}>Not SEC registered</strong> · Not investment advice · Technical scan output only · DYOR
      </div>
    </>
  );
}
