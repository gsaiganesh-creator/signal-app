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

// SVG semicircular gauge — 180° arc, score 0-100 maps left→right
function Gauge({ score, color }: { score: number; color: string }) {
  const CX = 100, CY = 108, R = 72;
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
  const base1 = { x: CX + 7 * Math.cos(toRad(180 - angle + 90)), y: CY - 7 * Math.sin(toRad(180 - angle + 90)) };
  const base2 = { x: CX + 7 * Math.cos(toRad(180 - angle - 90)), y: CY - 7 * Math.sin(toRad(180 - angle - 90)) };

  return (
    <svg width={200} height={120} viewBox="0 0 200 120" style={{ display:'block', margin:'0 auto' }}>
      <path d={arcPath(0, 100)} fill="none" stroke="var(--bdr)" strokeWidth={10} strokeLinecap="round"/>
      {bands.map(b => (
        <path key={b.from} d={arcPath(b.from, b.to)} fill="none" stroke={b.col} strokeWidth={10}
          strokeLinecap={b.from === 0 || b.to === 100 ? 'round' : 'butt'} opacity={0.85}/>
      ))}
      <polygon points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
        fill={color} opacity={0.95}/>
      <circle cx={CX} cy={CY} r={7} fill={color} stroke="var(--surf)" strokeWidth={2}/>
      <text x={CX} y={CY + 22} textAnchor="middle" fontSize={28} fontWeight={900} fill={color}
        style={{ fontFamily:'inherit' }}>{score}</text>
    </svg>
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
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px', minWidth:220 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>
        SIGNAL-MMI
      </div>
      <div style={{ fontSize:10, color:'var(--dim2)', marginBottom:12 }}>Proprietary composite · 5 inputs</div>

      {loading ? (
        <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dim)', fontSize:12 }}>Loading…</div>
      ) : error ? (
        <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)', fontSize:11 }}>Unavailable</div>
      ) : (
        <>
          <Gauge score={score} color={color}/>

          <div style={{ textAlign:'center', marginTop:4 }}>
            <div style={{ fontSize:13, fontWeight:800, color, letterSpacing:0.5 }}>{data?.zone}</div>
            <div style={{ fontSize:10, color:'var(--dim)', marginTop:3, lineHeight:1.4, maxWidth:180, margin:'4px auto 0' }}>{data?.hint}</div>
          </div>

          {data?.subScores && (
            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:7 }}>
              {data.subScores.map(s => (
                <div key={s.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:2 }}>
                    <span style={{ color: s.ok ? 'var(--txt)' : 'var(--dim2)', fontWeight:600 }}>{s.label}</span>
                    <span style={{ color:'var(--dim)', fontFamily:'monospace', fontSize:9 }}>{rawLabel(s)}</span>
                  </div>
                  <div style={{ height:5, background:'var(--bdr)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:3, transition:'width 0.6s ease',
                      width:`${s.ok ? s.score : 0}%`,
                      background: s.ok ? (s.score < 35 ? '#FF3B5C' : s.score < 50 ? '#FF5C1A' : s.score < 65 ? '#FFB800' : '#00D4A0') : 'var(--dim2)',
                    }}/>
                  </div>
                  <div style={{ fontSize:9, color:'var(--dim2)', marginTop:1.5, display:'flex', justifyContent:'space-between' }}>
                    <span>Wt {s.weight}%</span>
                    <span>{s.ok ? `${s.score}/100` : 'unavailable'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data?.asOf && (
            <div style={{ fontSize:9, color:'var(--dim2)', marginTop:10, borderTop:'1px solid var(--bdr)', paddingTop:6 }}>
              {new Date(data.asOf).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} · Not SEBI advice · DYOR
            </div>
          )}
        </>
      )}
    </div>
  );
}
