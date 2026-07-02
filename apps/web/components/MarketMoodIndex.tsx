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
  if (s.key === 'fii')      return `${r >= 0 ? '+' : '−'}₹${Math.abs(r/100).toFixed(0)}Cr`;
  if (s.key === 'breadth')  return `${Math.round(r * 100)}% ↑`;
  return `${r.toFixed(1)}`;
}

function barColor(score: number): string {
  if (score < 35) return '#FF3B5C';
  if (score < 50) return '#FF5C1A';
  if (score < 65) return '#FFB800';
  return '#00D4A0';
}

// Compact semicircular gauge
function Gauge({ score, color }: { score: number; color: string }) {
  const CX = 80, CY = 86, R = 58;
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
    const large = (to - from) * 1.8 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const angle = score * 1.8;
  const tip = pt(angle);
  const base1 = { x: CX + 6 * Math.cos(toRad(180 - angle + 90)), y: CY - 6 * Math.sin(toRad(180 - angle + 90)) };
  const base2 = { x: CX + 6 * Math.cos(toRad(180 - angle - 90)), y: CY - 6 * Math.sin(toRad(180 - angle - 90)) };

  return (
    <svg width={160} height={100} viewBox="0 0 160 100" style={{ display:'block' }}>
      <path d={arcPath(0, 100)} fill="none" stroke="var(--bdr)" strokeWidth={9} strokeLinecap="round"/>
      {bands.map(b => (
        <path key={b.from} d={arcPath(b.from, b.to)} fill="none" stroke={b.col} strokeWidth={9}
          strokeLinecap={b.from === 0 || b.to === 100 ? 'round' : 'butt'} opacity={0.85}/>
      ))}
      <polygon points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`} fill={color} opacity={0.95}/>
      <circle cx={CX} cy={CY} r={6} fill={color} stroke="var(--surf)" strokeWidth={2}/>
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize={26} fontWeight={900} fill={color}
        style={{ fontFamily:'inherit' }}>{score}</text>
    </svg>
  );
}

// Vertical bar chart for sub-scores
function BarChart({ subs }: { subs: Sub[] }) {
  const BAR_H = 90;
  const SHORT: Record<string, string> = {
    momentum: 'Momo', fii: 'FII', vix: 'VIX', breadth: 'A/D', delivery: 'Delvr'
  };
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8, height: BAR_H + 52, paddingTop:4 }}>
      {subs.map(s => {
        const h = s.ok ? Math.max(4, (s.score / 100) * BAR_H) : 4;
        const col = s.ok ? barColor(s.score) : 'var(--dim2)';
        return (
          <div key={s.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            {/* value label above bar */}
            <div style={{ fontSize:10, fontWeight:700, color: s.ok ? col : 'var(--dim2)', minHeight:14, lineHeight:1 }}>
              {s.ok ? s.score : '—'}
            </div>
            {/* bar track */}
            <div style={{ width:'100%', height: BAR_H, display:'flex', alignItems:'flex-end', background:'var(--bdr)', borderRadius:6, overflow:'hidden', position:'relative' }}>
              <div style={{ width:'100%', height:`${h}px`, background:col, borderRadius:6, transition:'height 0.6s ease' }}/>
            </div>
            {/* short label */}
            <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)', textAlign:'center', lineHeight:1.2 }}>
              {SHORT[s.key] ?? s.key}
            </div>
            {/* raw value */}
            <div style={{ fontSize:8, color:'var(--dim2)', textAlign:'center', lineHeight:1 }}>
              {rawLabel(s)}
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
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 20px', height:'100%', boxSizing:'border-box' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.8 }}>SIGNAL-MMI</div>
        <div style={{ fontSize:10, color:'var(--dim2)' }}>Proprietary · 5 inputs</div>
      </div>

      {loading ? (
        <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dim)', fontSize:12 }}>Loading…</div>
      ) : error ? (
        <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)', fontSize:12 }}>Unavailable</div>
      ) : (
        /* TWO-COLUMN LAYOUT */
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>

          {/* LEFT — gauge + zone */}
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Gauge score={score} color={color}/>
            <div style={{ textAlign:'center', marginTop:6 }}>
              <div style={{ fontSize:13, fontWeight:800, color, letterSpacing:0.4 }}>{data?.zone}</div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:4, lineHeight:1.45, maxWidth:140 }}>{data?.hint}</div>
            </div>
          </div>

          {/* RIGHT — vertical bar chart */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
              Input Signals
            </div>
            {data?.subScores && <BarChart subs={data.subScores}/>}
            {data?.asOf && (
              <div style={{ fontSize:9, color:'var(--dim2)', marginTop:8, borderTop:'1px solid var(--bdr)', paddingTop:5 }}>
                {new Date(data.asOf).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} · Not SEBI advice
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
