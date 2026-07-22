'use client';
import { useEffect, useState, useCallback } from 'react';
import { AnimatedCount } from '@/lib/animated-count';

interface Sub {
  key: string; label: string; score: number; weight: number;
  raw: number | null; rawUnit: string; ok: boolean;
}
interface MmiData {
  score: number; zone: string; zoneColor: string; hint: string;
  subScores: Sub[]; asOf: string;
  sources: Record<string, boolean>;
}

function rawLabel(s: Sub): string {
  if (!s.ok || s.raw == null) return '—';
  const r = s.raw;
  if (s.key === 'momentum') return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`;
  if (s.key === 'fii')      return `${r >= 0 ? '+' : '−'}₹${Math.abs(r / 100).toFixed(0)}Cr`;
  if (s.key === 'breadth')  return `${Math.round(r * 100)}% adv`;
  return `${r.toFixed(1)}`;
}

function barColor(score: number): string {
  if (score < 35) return '#FF3B5C';
  if (score < 50) return '#FF5C1A';
  if (score < 65) return '#FFB800';
  return '#00D4A0';
}

const SHORT: Record<string, string> = {
  momentum: 'Momentum', fii: 'FII / DII', vix: 'VIX', breadth: 'Breadth', delivery: 'Delivery'
};

// Compact semicircular gauge — smaller footprint for narrow card
function Gauge({ score, color }: { score: number; color: string }) {
  const CX = 60, CY = 62, R = 44;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number) => ({
    x: CX + R * Math.cos(toRad(180 - deg)),
    y: CY - R * Math.sin(toRad(180 - deg)),
  });
  const bands = [
    { from: 0,  to: 24,  col: '#FF3B5C' },
    { from: 24, to: 44,  col: '#FF5C1A' },
    { from: 44, to: 55,  col: '#FFB800' },
    { from: 55, to: 74,  col: '#7FD957' },
    { from: 74, to: 100, col: '#00D4A0' },
  ];
  const arcPath = (from: number, to: number) => {
    const s = pt(from * 1.8), e = pt(to * 1.8);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${(to - from) * 1.8 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };
  const angle = score * 1.8;
  const tip = pt(angle);
  const b1 = { x: CX + 5 * Math.cos(toRad(180 - angle + 90)), y: CY - 5 * Math.sin(toRad(180 - angle + 90)) };
  const b2 = { x: CX + 5 * Math.cos(toRad(180 - angle - 90)), y: CY - 5 * Math.sin(toRad(180 - angle - 90)) };
  return (
    <svg width={120} height={74} viewBox="0 0 120 74" style={{ display:'block' }}>
      <path d={arcPath(0, 100)} fill="none" stroke="var(--bdr)" strokeWidth={8} strokeLinecap="round"/>
      {bands.map(b => (
        <path key={b.from} d={arcPath(b.from, b.to)} fill="none" stroke={b.col} strokeWidth={8}
          strokeLinecap={b.from === 0 || b.to === 100 ? 'round' : 'butt'} opacity={0.9}/>
      ))}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={color}/>
      <circle cx={CX} cy={CY} r={5} fill={color} stroke="var(--surf2)" strokeWidth={2}/>
    </svg>
  );
}

// Horizontal bars — one row per signal. Fill animates 0 → target% with a
// springy overshoot-then-settle (.mmi-bar-fill + --mmi-target custom prop,
// see globals.css "SIGNAL-MMI BOUNCY BAR FILL") instead of a flat linear
// fill — founder's ask for the bars to feel "bouncy (horizontally)".
// `key={s.key}-${pct}` forces a fresh element (and therefore a fresh
// animation run) whenever the underlying score changes on refresh, not just
// on first mount.
function HBar({ subs }: { subs: Sub[] }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
      {subs.map(s => {
        const col = s.ok ? barColor(s.score) : 'var(--dim2)';
        const pct = s.ok ? s.score : 0;
        return (
          <div key={s.key}>
            {/* label row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
              <span style={{ fontSize:12, fontWeight:600, color: s.ok ? 'var(--txt)' : 'var(--dim2)' }}>
                {SHORT[s.key] ?? s.key}
              </span>
              <span style={{ fontSize:11, color:'var(--dim)', fontFamily:'monospace' }}>
                {s.ok ? `${s.score}/100` : '—'}{s.ok && s.raw != null ? `  ${rawLabel(s)}` : ''}
              </span>
            </div>
            {/* bar track */}
            <div style={{ height:8, background:'var(--bdr)', borderRadius:99, overflow:'hidden' }}>
              <div
                key={`${s.key}-${pct}`}
                className="mmi-bar-fill"
                style={{
                  '--mmi-target': `${pct}%`,
                  height:'100%', borderRadius:99,
                  background: s.ok
                    ? `linear-gradient(90deg, ${col}99, ${col})`
                    : 'var(--dim2)',
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketMoodIndex() {
  const [data,    setData]  = useState<MmiData | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error,   setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/market-mood');
      if (r.ok) { setData(await r.json()); setError(false); }
      else setError(true);
    } catch { setError(true); }
    setLoad(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  const score = data?.score ?? 50;
  const color = data?.zoneColor ?? '#FFB800';

  return (
    /* BENTO CARD — genuine summary tile (5 inputs rolled into one score),
       so it carries the same standing shimmer fx as the other summary
       widgets (dashboard/page.tsx KPI strip, Market Cap Mix). --sigfx-color
       is pinned to the SAME zone color driving the score/gauge/zone label
       just below (bearish red / neutral gold / bullish green, from the API's
       zoneColor) — "nail polish" per-widget color, not the shared violet. */
    <div className="sigfx-shimmer" style={{
      background: 'linear-gradient(145deg,rgba(23,64,245,0.06),var(--surf))',
      border: '1px solid rgba(23,64,245,0.18)',
      borderRadius: 18, padding: '18px 22px',
      height: '100%', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
      '--sigfx-color': color,
    } as React.CSSProperties}>
      {/* subtle glow orb */}
      <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(23,64,245,0.10) 0%,transparent 65%)', pointerEvents:'none' }}/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, position:'relative' }}>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--txt)', letterSpacing:0.5 }}>SIGNAL-MMI</div>
        <div style={{ fontSize:10, color:'var(--dim2)', background:'var(--bdr)', padding:'2px 7px', borderRadius:99 }}>Proprietary · 5 inputs</div>
      </div>

      {loading ? (
        <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dim)', fontSize:13 }}>Loading…</div>
      ) : error ? (
        <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)', fontSize:13 }}>Unavailable</div>
      ) : (
        <div style={{ position:'relative' }}>

          {/* TOP ROW — gauge left, score+zone right */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
            <Gauge score={score} color={color}/>
            <div>
              <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, lineHeight:1, color }}>
                <AnimatedCount value={score} format={n => n.toFixed(1)} />
              </div>
              <div style={{ fontSize:14, fontWeight:800, color, marginTop:2 }}>{data?.zone}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:4, lineHeight:1.5 }}>{data?.hint}</div>
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height:1, background:'var(--bdr)', marginBottom:14 }}/>

          {/* HORIZONTAL BARS */}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
            Input Signals
          </div>
          {data?.subScores && <HBar subs={data.subScores}/>}
          {data?.asOf && (
            <div style={{ fontSize:10, color:'var(--dim2)', marginTop:14, paddingTop:8, borderTop:'1px solid var(--bdr)' }}>
              Updated {new Date(data.asOf).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} · Not SEBI advice · DYOR
            </div>
          )}

        </div>
      )}
    </div>
  );
}
