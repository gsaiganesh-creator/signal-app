'use client';
import type { TechResult } from '@/lib/technical-types';

// RSI(14) / vs 50D EMA / Bias tile row, shown inside an expanded card on the
// forex and commodities pages. Caller owns the isOpen/stopPropagation wrapping.
export function TechTiles({ tech }: { tech: TechResult | undefined }) {
  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--card-bdr)', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
      <div>
        <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>RSI(14)</div>
        <div style={{ fontSize:13, fontWeight:800 }}>{tech?.rsi14 != null ? tech.rsi14.toFixed(1) : '—'}</div>
      </div>
      <div>
        <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>vs 50D EMA</div>
        <div style={{ fontSize:13, fontWeight:800, color: tech?.ema_gap_pct != null ? (tech.ema_gap_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
          {tech?.ema_gap_pct != null ? `${tech.ema_gap_pct >= 0 ? '+' : ''}${tech.ema_gap_pct.toFixed(2)}%` : '—'}
        </div>
      </div>
      <div>
        <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>Bias</div>
        <div style={{ fontSize:12, fontWeight:800 }}>
          {tech?.bias === 'bullish' ? '🟢 Bullish' : tech?.bias === 'bearish' ? '🔴 Bearish' : '⚪ —'}
        </div>
      </div>
    </div>
  );
}
