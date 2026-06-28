'use client';

import { useEffect, useState, useCallback } from 'react';

interface MmiComponent {
  label: string;
  score: number;
  max: number;
  signal: string;
  level?: number | null;
  pct_vs_ema?: number | null;
  net_5d_cr?: number | null;
}

interface MmiData {
  score: number;
  label: string;
  components: { nifty: MmiComponent; vix: MmiComponent; fii: MmiComponent };
  computed_at: string;
}

function scoreColor(s: number): string {
  if (s <= 20) return '#FF3B5C';
  if (s <= 40) return '#FF5C1A';
  if (s <= 60) return '#FFB800';
  if (s <= 80) return '#7EC8A4';
  return '#00D4A0';
}

function signalText(c: MmiComponent): string {
  if (c.pct_vs_ema != null) return `${c.pct_vs_ema >= 0 ? '+' : ''}${c.pct_vs_ema}% vs EMA`;
  if (c.level != null)       return `VIX ${c.level}`;
  if (c.net_5d_cr != null)   return `${c.net_5d_cr >= 0 ? '+' : ''}₹${Math.abs(c.net_5d_cr).toLocaleString('en-IN')} Cr`;
  return c.signal;
}

const ZONE_LABELS = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
const ZONE_COLORS = ['#FF3B5C', '#FF5C1A', '#FFB800', '#7EC8A4', '#00D4A0'];

export function MarketMoodIndex() {
  const [data, setData]     = useState<MmiData | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(false);

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
    const t = setInterval(load, 5 * 60_000); // refresh every 5 min
    return () => clearInterval(t);
  }, [load]);

  const score = data?.score ?? 50;
  const color = scoreColor(score);

  return (
    <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5 }}>SIGNAL Market Mood</div>
          <div style={{ fontSize:10, color:'var(--dim2)', marginTop:2 }}>Nifty EMA · India VIX · FII Flow</div>
        </div>
        {data && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:11, fontWeight:700, color, marginTop:2 }}>{data.label}</div>
          </div>
        )}
        {loading && <div style={{ fontSize:13, color:'var(--dim)' }}>Loading…</div>}
        {error   && <div style={{ fontSize:11, color:'var(--red)' }}>Unavailable</div>}
      </div>

      {/* Gradient bar */}
      <div style={{ position:'relative', marginBottom:18 }}>
        <div style={{
          height:10, borderRadius:5,
          background:'linear-gradient(to right,#FF3B5C,#FF5C1A,#FFB800,#7EC8A4,#00D4A0)',
        }} />
        {/* Score tick */}
        <div style={{
          position:'absolute', left:`${score}%`, top:-4,
          transform:'translateX(-50%)',
          width:4, height:18, background:'#fff', borderRadius:2,
          boxShadow:'0 0 6px rgba(0,0,0,0.6)',
          pointerEvents:'none',
        }} />
        {/* Zone labels */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          {ZONE_LABELS.map((l, i) => (
            <div key={l} style={{
              fontSize:9, color: Math.floor(score / 20) === i ? ZONE_COLORS[i] : 'var(--dim2)',
              fontWeight: Math.floor(score / 20) === i ? 700 : 400,
              textAlign: i === 0 ? 'left' : i === ZONE_LABELS.length - 1 ? 'right' : 'center',
              flex:1,
            }}>{l.split(' ').join('\n')}</div>
          ))}
        </div>
      </div>

      {/* Component pills */}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {([data.components.nifty, data.components.vix, data.components.fii] as MmiComponent[]).map(c => {
            const pct   = Math.round((c.score / c.max) * 100);
            const clr   = scoreColor(Math.round((c.score / c.max) * 100));
            return (
              <div key={c.label} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.4, marginBottom:4 }}>{c.label}</div>
                {/* Mini bar */}
                <div style={{ height:3, borderRadius:2, background:'var(--bdr)', marginBottom:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:clr, borderRadius:2 }} />
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:clr }}>{signalText(c)}</div>
                <div style={{ fontSize:9, color:'var(--dim)', marginTop:1 }}>{c.score}/{c.max} pts</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop:10, fontSize:9, color:'var(--dim2)' }}>
        Refreshes every 15 min · Not SEBI advice
      </div>
    </div>
  );
}
