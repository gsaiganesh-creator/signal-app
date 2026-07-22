'use client';
import { useState, useEffect, useRef } from 'react';

// Rolling count-up, shared by every summary/KPI widget that wants a
// scoreboard-style roll-up instead of a value that just snaps in. Originated
// on the Signals page (int-only), generalized on dashboard/page.tsx to accept
// an optional `format` so it can animate currency strings (fmtL) and
// percentages too, then extracted here so MarketMoodIndex.tsx (and any
// future summary widget) can reuse the exact same animation instead of a
// third reimplementation. Animates from 0 on mount, and from the previous
// value on every subsequent change, ease-out cubic ~650ms by default.
export function AnimatedCount({ value, duration = 650, format, style }: { value: number; duration?: number; format?: (n: number) => string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic: fast start, slows into the final number
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString('en-IN'));
  return <span style={style}>{fmt(display)}</span>;
}
