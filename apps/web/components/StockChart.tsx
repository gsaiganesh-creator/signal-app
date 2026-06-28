'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Range = '1mo' | '3mo' | '6mo' | '1y';

interface Candle {
  time: number;
  open: number; high: number; low: number; close: number;
  volume: number;
}

interface Props {
  symbol: string;
  exchange: string;
  ema20?: number | null;
  ema50?: number | null;
}

const RANGES: Range[] = ['1mo', '3mo', '6mo', '1y'];
const RANGE_LABEL: Record<Range, string> = { '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y' };

export default function StockChart({ symbol, exchange, ema20, ema50 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [range, setRange]     = useState<Range>('3mo');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true); setError('');

    try {
      const [lc, res] = await Promise.all([
        import('lightweight-charts'),
        fetch(`/api/chart-data?symbol=${symbol}&exchange=${exchange}&range=${range}`),
      ]);

      const { createChart, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } = lc;

      if (!res.ok) { setError('Failed to load chart data'); setLoading(false); return; }
      const { candles }: { candles: Candle[] } = await res.json();
      if (!candles?.length) { setError('No chart data'); setLoading(false); return; }

      // Destroy previous chart
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const el = containerRef.current;
      const chart = createChart(el, {
        width:  el.clientWidth,
        height: 280,
        layout: { background: { color: '#0E1628' }, textColor: '#7A8BAA' },
        grid:   { vertLines: { color: '#1C2E4A' }, horzLines: { color: '#1C2E4A' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#1C2E4A' },
        timeScale:       { borderColor: '#1C2E4A', timeVisible: true },
      });
      chartRef.current = chart;

      // Candlestick series (v5 API)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00D4A0', downColor: '#FF3B5C',
        borderUpColor: '#00D4A0', borderDownColor: '#FF3B5C',
        wickUpColor: '#00D4A0', wickDownColor: '#FF3B5C',
      });

      // Volume histogram
      const volSeries = chart.addSeries(HistogramSeries, {
        color: '#1740F5',
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type UTCTime = any;
      const candleData = candles.map(c => ({
        time: c.time as UTCTime,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      const volData = candles.map(c => ({
        time:  c.time as UTCTime,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0,212,160,0.35)' : 'rgba(255,59,92,0.35)',
      }));

      candleSeries.setData(candleData);
      volSeries.setData(volData);

      // EMA overlays
      if (ema20) {
        const s = chart.addSeries(LineSeries, { color: '#4F6FFA', lineWidth: 1, title: 'EMA20' });
        s.setData(candleData.map(c => ({ time: c.time, value: ema20 })));
      }
      if (ema50) {
        const s = chart.addSeries(LineSeries, { color: '#FFB800', lineWidth: 1, title: 'EMA50' });
        s.setData(candleData.map(c => ({ time: c.time, value: ema50 })));
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);

    } catch (e) { setError(String(e)); }
    setLoading(false);
  }, [symbol, exchange, range, ema20, ema50]);

  useEffect(() => { loadChart(); }, [loadChart]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: range === r ? '#1740F5' : '#162038',
              color:      range === r ? '#fff'    : '#7A8BAA',
            }}>
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0E1628', border: '1px solid #1C2E4A' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: '#0E1628', height: 280 }}>
            <div style={{ fontSize: 13, color: '#7A8BAA' }}>Loading chart…</div>
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#FF3B5C', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{error}</div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: '#7A8BAA', flexWrap: 'wrap' }}>
        <span><span style={{ color: '#00D4A0', fontWeight: 700 }}>▌</span> Bullish</span>
        <span><span style={{ color: '#FF3B5C', fontWeight: 700 }}>▌</span> Bearish</span>
        {ema20 && <span><span style={{ color: '#4F6FFA', fontWeight: 700 }}>—</span> EMA20</span>}
        {ema50 && <span><span style={{ color: '#FFB800', fontWeight: 700 }}>—</span> EMA50</span>}
        <span style={{ marginLeft: 'auto' }}>15-min delayed · Yahoo Finance</span>
      </div>
    </div>
  );
}
