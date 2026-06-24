'use client';
import { useMemo, useRef, useEffect, useState } from 'react';

interface TmInput { symbol: string; value: number; changePct: number | null; name?: string; }
interface TmNode  extends TmInput { x: number; y: number; w: number; h: number; }

function buildTree(nodes: TmInput[], x: number, y: number, w: number, h: number): TmNode[] {
  if (!nodes.length) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x, y, w, h }];
  const total = nodes.reduce((s, n) => s + n.value, 0);
  let acc = 0, splitIdx = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    acc += nodes[i].value;
    splitIdx = i;
    if (acc >= total / 2) break;
  }
  const leftRatio = nodes.slice(0, splitIdx + 1).reduce((s, n) => s + n.value, 0) / total;
  if (w >= h) {
    const lw = leftRatio * w;
    return [
      ...buildTree(nodes.slice(0, splitIdx + 1), x, y, lw, h),
      ...buildTree(nodes.slice(splitIdx + 1), x + lw, y, w - lw, h),
    ];
  } else {
    const th = leftRatio * h;
    return [
      ...buildTree(nodes.slice(0, splitIdx + 1), x, y, w, th),
      ...buildTree(nodes.slice(splitIdx + 1), x, y + th, w, h - th),
    ];
  }
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * Math.min(1, Math.max(0, t))); }

function tileColor(pct: number | null): string {
  if (pct === null) return '#1a2844';
  // Neutral anchor at 0% → dark blue-gray
  // Positive: neutral → medium green → deep green (5%+)
  // Negative: neutral → medium red → deep red (-5%+)
  if (pct >= 0) {
    const t = Math.min(pct / 4, 1); // saturates at +4%
    const r = lerp(22,  13, t);
    const g = lerp(42, 120, t);
    const b = lerp(66,  48, t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.min(Math.abs(pct) / 4, 1); // saturates at -4%
    const r = lerp(22, 196, t);
    const g = lerp(42,  21, t);
    const b = lerp(66,  21, t);
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(pct: number | null, w: number, h: number): string {
  if (w < 50 || h < 30) return 'rgba(255,255,255,0.7)';
  return '#fff';
}

function badge(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

interface Props {
  items: TmInput[];
  height?: number;
  onTileClick?: (symbol: string) => void;
}

export function TreemapHeatmap({ items, height = 480, onTileClick }: Props) {
  const ref   = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(
    () => [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value),
    [items],
  );

  const tiles = useMemo(
    () => (W > 0 ? buildTree(sorted, 0, 0, W, height) : []),
    [sorted, W, height],
  );

  const live = items.filter(i => i.changePct != null);
  const up   = live.filter(i => (i.changePct ?? 0) > 0).length;
  const down = live.filter(i => (i.changePct ?? 0) < 0).length;
  const flat = live.length - up - down;

  return (
    <div>
      {/* Legend bar */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:3, alignItems:'center' }}>
          {['-4%','-2%','-1%','-0.5%','0','+0.5%','+1%','+2%','+4%'].map((lbl, i) => {
            const pcts = [-4, -2, -1, -0.5, 0, 0.5, 1, 2, 4];
            return (
              <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ width:22, height:14, borderRadius:3, background:tileColor(pcts[i]) }}/>
                <span style={{ fontSize:8.5, color:'var(--dim)' }}>{lbl}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:12, fontSize:11 }}>
          <span style={{ color:'#1f9454', fontWeight:700 }}>▲ {up} up</span>
          <span style={{ color:'var(--dim)' }}>{flat} flat</span>
          <span style={{ color:'#d43030', fontWeight:700 }}>▼ {down} down</span>
        </div>
      </div>

      {/* Treemap container */}
      <div ref={ref} style={{ position:'relative', width:'100%', height, borderRadius:12, overflow:'hidden', background:'#0a1020' }}>
        {tiles.map(t => {
          const tiny  = t.w < 52 || t.h < 32;
          const small = t.w < 90 || t.h < 52;
          const bg    = tileColor(t.changePct);
          const tc    = textColor(t.changePct, t.w, t.h);
          return (
            <div
              key={t.symbol}
              onClick={() => onTileClick?.(t.symbol)}
              title={`${t.symbol}${t.changePct != null ? ` · ${badge(t.changePct)}` : ''}`}
              style={{
                position:'absolute',
                left: t.x + 1, top: t.y + 1,
                width: t.w - 2, height: t.h - 2,
                background: bg,
                borderRadius: 5,
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                cursor: onTileClick ? 'pointer' : 'default',
                overflow:'hidden', padding:3,
                transition:'filter 0.12s',
                userSelect:'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
            >
              {!tiny && (
                <div style={{
                  fontSize: small ? 9 : t.w > 120 ? 15 : 11,
                  fontWeight: 800,
                  color: tc,
                  letterSpacing: 0.2,
                  lineHeight: 1.1,
                  textAlign:'center',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  maxWidth:'100%',
                }}>
                  {t.symbol}
                </div>
              )}
              {!tiny && t.changePct != null && (
                <div style={{
                  fontSize: small ? 8 : t.w > 120 ? 12 : 9.5,
                  fontWeight: 700,
                  color: t.changePct >= 0 ? 'rgba(160,255,200,0.9)' : 'rgba(255,160,160,0.9)',
                  marginTop: 1,
                }}>
                  {badge(t.changePct)}
                </div>
              )}
              {tiny && t.changePct != null && (
                <div style={{ fontSize:7, color:tc, fontWeight:700 }}>
                  {t.changePct >= 0 ? '+' : ''}{t.changePct.toFixed(1)}
                </div>
              )}
            </div>
          );
        })}
        {!W && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dim)', fontSize:13 }}>
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
