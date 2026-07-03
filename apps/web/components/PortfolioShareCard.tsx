'use client';

import { useRef, useState } from 'react';

interface Holding {
  symbol: string;
  qty: number;
  pl_pct?: number | null;
  current_price?: number | null;
  avg_price: number;
}

interface Props {
  totalInvested: number;
  totalCurrent: number;
  totalPL: number;
  totalPLPct: number;
  topHoldings: Holding[];
  portfolioName?: string;
}

// Hardcoded colors — CSS vars don't resolve inside html-to-image capture
const C = {
  bg:    '#070D1A',
  surf:  '#0E1628',
  surf2: '#162038',
  bdr:   '#1C2E4A',
  txt:   '#FFFFFF',
  dim:   '#7A8BAA',
  dim2:  '#3A4E6A',
  grn:   '#00D4A0',
  red:   '#FF3B5C',
  blu:   '#1740F5',
  bluL:  '#4F6FFA',
  ylw:   '#FFB800',
};

function fmtINR(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(1)} L`;
  return `₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function PortfolioShareCard({ totalInvested, totalCurrent, totalPL, totalPLPct, topHoldings, portfolioName }: Props) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const up = totalPL >= 0;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  async function capture() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });

      // Web Share API (works on iOS via Capacitor + modern Android)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const res  = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'portfolio-snapshot.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Portfolio — SignalGenie', text: `Portfolio ${up ? '+' : ''}${totalPLPct.toFixed(1)}% · Powered by SignalGenie` });
          setBusy(false); return;
        }
      }
      // Fallback: download
      const a = document.createElement('a');
      a.download = `signal-portfolio-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  const top5 = topHoldings.slice(0, 5);

  return (
    <>
      {/* Trigger button */}
      <button onClick={capture} disabled={busy}
        style={{ height: 36, padding: '0 14px', borderRadius: 8, background: 'var(--surf2)', border: '1px solid var(--bdr)', color: 'var(--txt)', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {busy ? '⏳' : '📤'} {busy ? 'Generating…' : 'Share'}
      </button>

      {/* Off-screen card — captured by html-to-image */}
      <div style={{ position: 'fixed', top: -9999, left: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div ref={cardRef}
          style={{ width: 800, height: 450, background: C.bg, padding: '36px 40px', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden' }}>

          {/* Background glow blobs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: up ? 'rgba(0,212,160,0.06)' : 'rgba(255,59,92,0.06)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(23,64,245,0.08)', filter: 'blur(50px)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blu, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>S</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.txt, letterSpacing: -0.3 }}>SignalGenie</div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: -1 }}>Portfolio Snapshot</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.dim }}>{today}</div>
              {portfolioName && <div style={{ fontSize: 10, color: C.dim2, marginTop: 2 }}>{portfolioName}</div>}
            </div>
          </div>

          {/* Main P&L */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 28, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Current Value</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.txt, letterSpacing: -1.5, lineHeight: 1 }}>{fmtINR(totalCurrent)}</div>
            </div>
            <div style={{ paddingBottom: 6 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: up ? C.grn : C.red }}>
                {up ? '+' : '-'}{fmtINR(totalPL)}
              </div>
              <div style={{ fontSize: 13, color: up ? C.grn : C.red, fontWeight: 700 }}>
                {up ? '▲' : '▼'} {Math.abs(totalPLPct).toFixed(2)}% return
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {[
              { l: 'Invested', v: fmtINR(totalInvested) },
              { l: 'Holdings', v: `${topHoldings.length} stocks` },
              { l: 'Best today', v: (() => { const b = topHoldings.filter(h => h.pl_pct != null).sort((a, b) => (b.pl_pct ?? 0) - (a.pl_pct ?? 0))[0]; return b ? `${b.symbol} ${(b.pl_pct ?? 0) >= 0 ? '+' : ''}${(b.pl_pct ?? 0).toFixed(1)}%` : '—'; })() },
            ].map(s => (
              <div key={s.l} style={{ background: C.surf, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: '10px 14px', flex: 1 }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.txt }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Top holdings */}
          {top5.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: C.dim2, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Top Holdings</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {top5.map(h => {
                  const pct = h.pl_pct ?? 0;
                  const hUp = pct >= 0;
                  return (
                    <div key={h.symbol} style={{ background: hUp ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border: `1px solid ${hUp ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.txt }}>{h.symbol}</span>
                      <span style={{ fontSize: 10, color: C.dim }}>{h.qty} qty</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: hUp ? C.grn : C.red }}>{hUp ? '+' : ''}{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.bdr}` }}>
            <div style={{ fontSize: 9, color: C.dim2 }}>Not SEBI registered · Not investment advice · DYOR</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: 0.3 }}>signal-app.vercel.app</div>
          </div>
        </div>
      </div>
    </>
  );
}
