'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceRow { price: number | null; change_pct: number | null; }

interface Props { stocks: string[]; sectorLabel: string; }

export function SectorStocksClient({ stocks, sectorLabel }: Props) {
  const [data,    setData]    = useState<Record<string, PriceRow>>({});
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState<'symbol'|'price'|'change'>('change');
  const [dir,     setDir]     = useState<1|-1>(-1);

  useEffect(() => {
    const tickers = stocks.map(s => `${s}.NS`).join(',');
    fetch(`/api/prices?symbols=${encodeURIComponent(tickers)}`)
      .then(r => r.json())
      .then((raw: Record<string, PriceRow>) => {
        // re-key: strip .NS suffix
        const mapped: Record<string, PriceRow> = {};
        for (const [k, v] of Object.entries(raw)) {
          mapped[k.replace('.NS', '')] = v;
        }
        setData(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stocks]);

  function toggleSort(col: typeof sort) {
    if (sort === col) setDir(d => (d === 1 ? -1 : 1));
    else { setSort(col); setDir(col === 'symbol' ? 1 : -1); }
  }

  const rows = [...stocks].sort((a, b) => {
    if (sort === 'symbol')  return dir * a.localeCompare(b);
    if (sort === 'price')   return dir * ((data[a]?.price ?? 0) - (data[b]?.price ?? 0));
    return dir * ((data[a]?.change_pct ?? 0) - (data[b]?.change_pct ?? 0));
  });

  const up   = rows.filter(s => (data[s]?.change_pct ?? 0) >= 0).length;
  const down = rows.length - up;
  const sectorChg = rows.length
    ? rows.reduce((s, sym) => s + (data[sym]?.change_pct ?? 0), 0) / rows.length
    : 0;

  const ThBtn = ({ col, label }: { col: typeof sort; label: string }) => (
    <th onClick={() => toggleSort(col)}
      style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color: sort === col ? 'var(--txt)' : 'var(--dim)', textTransform:'uppercase', letterSpacing:0.4, cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)' }}>
      {label} {sort === col ? (dir === -1 ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <>
      {/* Sector summary */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Stocks', value:`${rows.length}`, color:'var(--txt)' },
          { label:'Sector Avg', value:`${sectorChg >= 0 ? '+' : ''}${sectorChg.toFixed(2)}%`, color: sectorChg >= 0 ? 'var(--grn)' : 'var(--red)' },
          { label:'Advancing', value:`${up}`, color:'var(--grn)' },
          { label:'Declining', value:`${down}`, color:'var(--red)' },
        ].map(m => (
          <div key={m.label} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:10, padding:'10px 16px', flex:'1 1 100px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:18, fontWeight:900, color:m.color }}>{loading && m.label !== 'Stocks' ? '…' : m.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <ThBtn col="symbol" label="Symbol" />
                <ThBtn col="price"  label="Price" />
                <ThBtn col="change" label="Change %" />
                <th style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.4, borderBottom:'1px solid var(--bdr)', background:'var(--surf2)' }}>Links</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sym, i) => {
                const d   = data[sym];
                const chg = d?.change_pct ?? null;
                const up  = (chg ?? 0) >= 0;
                return (
                  <tr key={sym} style={{ borderBottom:`1px solid var(--bdr)`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'10px 12px' }}>
                      <Link href={`/stocks/${sym}`} style={{ fontSize:13, fontWeight:800, color:'var(--txt)', textDecoration:'none' }}>{sym}</Link>
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:700 }}>
                      {loading ? <span style={{ display:'inline-block', width:70, height:16, borderRadius:4, background:'var(--surf2)' }} /> :
                        d?.price != null ? `₹${d.price.toLocaleString('en-IN', { maximumFractionDigits:2 })}` : '—'}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      {loading
                        ? <span style={{ display:'inline-block', width:55, height:16, borderRadius:4, background:'var(--surf2)' }} />
                        : chg != null
                          ? <span style={{ fontSize:13, fontWeight:800, color: up ? 'var(--grn)' : 'var(--red)' }}>
                              {up ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                            </span>
                          : <span style={{ color:'var(--dim)' }}>—</span>}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <Link href={`/stocks/${sym}`}
                          style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', textDecoration:'none' }}>
                          Chart →
                        </Link>
                        <Link href={`/stocks/compare?a=${sym}&b=${rows.find(s => s !== sym) ?? 'NIFTY'}`}
                          style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', textDecoration:'none' }}>
                          vs
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top movers */}
      {!loading && Object.keys(data).length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { label:`Top Gainer in ${sectorLabel}`, sym: [...stocks].sort((a,b) => (data[b]?.change_pct??-999) - (data[a]?.change_pct??-999))[0], dir: 'up' as const },
            { label:`Top Loser in ${sectorLabel}`,  sym: [...stocks].sort((a,b) => (data[a]?.change_pct??999)  - (data[b]?.change_pct??999))[0],  dir: 'dn' as const },
          ].map(({ label, sym, dir }) => {
            const d   = sym ? data[sym] : null;
            const chg = d?.change_pct ?? null;
            return (
              <Link key={label} href={`/stocks/${sym}`} style={{ textDecoration:'none' }}>
                <div style={{ background: dir === 'up' ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${dir === 'up' ? 'rgba(0,212,160,0.22)' : 'rgba(255,59,92,0.22)'}`, borderRadius:12, padding:'12px 16px' }}>
                  <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:16, fontWeight:900, color:'var(--txt)', marginBottom:2 }}>{sym ?? '—'}</div>
                  {chg != null && <div style={{ fontSize:13, fontWeight:800, color: dir === 'up' ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
