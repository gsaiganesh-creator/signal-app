'use client';
import { useEffect, useState, useCallback } from 'react';

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

// Compact semicircular gauge
function Gauge({ score, color }: { score: number; color: string }) {
  const CX = 84, CY = 90, R = 62;
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
  const b1 = { x: CX + 7 * Math.cos(toRad(180 - angle + 90)), y: CY - 7 * Math.sin(toRad(180 - angle + 90)) };
  const b2 = { x: CX + 7 * Math.cos(toRad(180 - angle - 90)), y: CY - 7 * Math.sin(toRad(180 - angle - 90)) };
  return (
    <svg width={168} height={106} viewBox="0 0 168 106" style={{ display:'block' }}>
      <path d={arcPath(0, 100)} fill="none" stroke="var(--bdr)" strokeWidth={10} strokeLinecap="round"/>
      {bands.map(b => (
        <path key={b.from} d={arcPath(b.from, b.to)} fill="none" stroke={b.col} strokeWidth={10}
          strokeLinecap={b.from === 0 || b.to === 100 ? 'round' : 'butt'} opacity={0.9}/>
      ))}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={color}/>
      <circle cx={CX} cy={CY} r={7} fill={color} stroke="var(--surf2)" strokeWidth={2}/>
      <text x={CX} y={CY + 20} textAnchor="middle" fontSize={28} fontWeight={900} fill={color}
        style={{ fontFamily:'inherit' }}>{score}</text>
    </svg>
  );
}

// Horizontal bars — one row per signal
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
              <div style={{
                height:'100%', width:`${pct}%`, borderRadius:99,
                background: s.ok
                  ? `linear-gradient(90deg, ${col}99, ${col})`
                  : 'var(--dim2)',
                transition:'width 0.7s ease',
              }}/>
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
    /* BENTO CARD */
    <div style={{
      background: 'linear-gradient(145deg,rgba(23,64,245,0.06),var(--surf))',
      border: '1px solid rgba(23,64,245,0.18)',
      borderRadius: 18, padding: '18px 22px',
      height: '100%', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>
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
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', position:'relative' }}>

          {/* LEFT — gauge + label */}
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', minWidth:160 }}>
            <Gauge score={score} color={color}/>
            <div style={{ textAlign:'center', marginTop:2 }}>
              <div style={{ fontSize:14, fontWeight:800, color, letterSpacing:0.3 }}>{data?.zone}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:5, lineHeight:1.5, maxWidth:148 }}>{data?.hint}</div>
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ width:1, alignSelf:'stretch', background:'var(--bdr)', flexShrink:0, marginTop:4 }}/>

          {/* RIGHT — horizontal bars */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
              Input Signals
            </div>
            {data?.subScores && <HBar subs={data.subScores}/>}
            {data?.asOf && (
              <div style={{ fontSize:10, color:'var(--dim2)', marginTop:14, paddingTop:8, borderTop:'1px solid var(--bdr)' }}>
                Updated {new Date(data.asOf).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} · Not SEBI advice · DYOR
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
