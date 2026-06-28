'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Range = '1mo' | '3mo' | '6mo' | '1y';

interface HoldingInput { symbol: string; exchange: string; qty: number; avg_price: number; }

interface Props { holdings: HoldingInput[]; }

const RANGES: Range[] = ['1mo', '3mo', '6mo', '1y'];
const RANGE_LABEL: Record<Range, string> = { '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y' };

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function PortfolioChart({ holdings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [range, setRange]         = useState<Range>('3mo');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [invested, setInvested]   = useState(0);
  const [currentVal, setCurrentVal] = useState(0);

  const load = useCallback(async () => {
    if (!containerRef.current || !holdings.length) return;
    setLoading(true); setError('');

    try {
      const [lc, res] = await Promise.all([
        import('lightweight-charts'),
        fetch('/api/portfolio-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ holdings, range }),
        }),
      ]);

      if (!res.ok) { setError('Failed to load history'); setLoading(false); return; }
      const { series, invested: inv }: { series: { time: number; value: number }[]; invested: number } = await res.json();
      if (!series.length) { setError('No historical data'); setLoading(false); return; }

      setInvested(inv);
      setCurrentVal(series[series.length - 1]?.value ?? 0);

      const { createChart, LineSeries } = lc;

      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const el = containerRef.current;
      const chart = createChart(el, {
        width:  el.clientWidth,
        height: 220,
        layout: { background: { color: 'transparent' }, textColor: '#7A8BAA' },
        grid:   { vertLines: { color: '#1C2E4A' }, horzLines: { color: '#1C2E4A' } },
        rightPriceScale: { borderColor: '#1C2E4A' },
        timeScale: { borderColor: '#1C2E4A', timeVisible: false },
        handleScroll: false,
        handleScale: false,
      });
      chartRef.current = chart;

      // Portfolio value line
      const lastVal = series[series.length - 1]?.value ?? inv;
      const up      = lastVal >= inv;

      const valSeries = chart.addSeries(LineSeries, {
        color:     up ? '#00D4A0' : '#FF3B5C',
        lineWidth: 2,
        title:     'Value',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      valSeries.setData(series.map(d => ({ time: d.time as any, value: d.value })));

      // Invested baseline — flat horizontal line
      const invSeries = chart.addSeries(LineSeries, {
        color:     '#FFB800',
        lineWidth: 1,
        lineStyle: 2, // dashed
        title:     'Invested',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invSeries.setData(series.map(d => ({ time: d.time as any, value: inv })));

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);

    } catch (e) { setError(String(e)); }
    setLoading(false);
  }, [holdings, range]);

  useEffect(() => { load(); }, [load]);

  const pnl    = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const up     = pnl >= 0;

  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Portfolio Performance</div>
          {currentVal > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{fmtINR(currentVal)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--grn)' : 'var(--red)' }}>{up ? '+' : ''}{fmtINR(pnl)} ({up ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: range === r ? 'var(--blu)' : 'var(--surf2)', color: range === r ? '#fff' : 'var(--dim)' }}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'var(--bg)', height: 220 }}>
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>Loading performance data…</span>
          </div>
        )}
        {error && !loading && (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--red)' }}>{error}</div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--dim)', flexWrap: 'wrap' }}>
        <span><span style={{ color: up ? 'var(--grn)' : 'var(--red)', fontWeight: 700 }}>—</span> Portfolio Value</span>
        <span><span style={{ color: '#FFB800', fontWeight: 700 }}>- -</span> Invested ({fmtINR(invested)})</span>
        <span style={{ marginLeft: 'auto' }}>15-min delayed · Assumes current holdings held entire period</span>
      </div>
    </div>
  );
}
