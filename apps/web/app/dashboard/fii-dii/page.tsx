'use client';
import { useState, useEffect } from 'react';

interface DbRow {
  date: string;
  fii_buy: number; fii_sell: number; fii_net: number;
  dii_buy: number; dii_sell: number; dii_net: number;
  fetched_at: string;
}

function crore(n: number): string {
  const abs = Math.abs(n).toFixed(0);
  return (n >= 0 ? '+' : '-') + '₹' + Number(abs).toLocaleString('en-IN') + ' Cr';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function mlImpact(fiiNet: number, diiNet: number): { text: string; color: string } {
  const net = fiiNet + diiNet;
  if (fiiNet > 1000 && diiNet > 0)
    return { text: `FII + DII both buying — strong institutional support. SIGNAL applies +8% confidence boost to large-cap and banking BUY signals.`, color: 'var(--grn)' };
  if (fiiNet < -1500)
    return { text: `Heavy FII selling (${crore(fiiNet)}) — SIGNAL applies -10% confidence penalty on large-cap BUY signals. DII ${diiNet >= 0 ? 'buying absorbs some pressure' : 'also selling — double headwind'}.`, color: 'var(--red)' };
  if (fiiNet < -500)
    return { text: `Moderate FII selling — SIGNAL applies -6% confidence penalty on banking stocks. DII buying (${crore(diiNet)}) provides partial support.`, color: 'var(--ylw)' };
  if (net > 2000)
    return { text: `Strong combined institutional buying (${crore(net)} net) — SIGNAL boosts confidence on broad market BUY signals.`, color: 'var(--grn)' };
  return { text: `Neutral institutional flow — SIGNAL applies no directional adjustment. Watch tomorrow's data for trend confirmation.`, color: 'var(--dim)' };
}

export default function FIIDIIPage() {
  const [rows, setRows]       = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [lastUpdated, setUpdated] = useState('');

  useEffect(() => {
    fetch('/api/fii-dii')
      .then(r => r.json())
      .then((d: { rows?: DbRow[]; error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setRows(d.rows ?? []);
        if (d.rows?.length) setUpdated(new Date(d.rows[0].fetched_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }));
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const today    = rows[0];
  const recent5  = rows.slice(0, 5);
  const fii5net  = recent5.reduce((s, r) => s + r.fii_net, 0);
  const dii5net  = recent5.reduce((s, r) => s + r.dii_net, 0);

  // Bar width: scale relative to max abs net across history
  const maxAbs = Math.max(1, ...rows.map(r => Math.max(Math.abs(r.fii_net), Math.abs(r.dii_net))));
  function barW(v: number) { return Math.round((Math.abs(v) / maxAbs) * 100); }

  const impact = today ? mlImpact(today.fii_net, today.dii_net) : null;

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>FII / DII Flow</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Institutional money movement — India&apos;s biggest market driver · Source: NSE</div>
        </div>
        {lastUpdated && <div style={{ fontSize:11, color:'var(--dim)', padding:'4px 10px', borderRadius:6, background:'var(--surf2)', border:'1px solid var(--card-bdr)' }}>Updated {lastUpdated}</div>}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:56, color:'var(--dim)' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📡</div>
          Fetching live data from NSE…
        </div>
      )}

      {error && (
        <div style={{ background:'rgba(255,59,92,0.07)', border:'1px solid rgba(255,59,92,0.2)', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:4 }}>NSE fetch failed</div>
          <div style={{ fontSize:12, color:'var(--dim)' }}>{error} — Showing cached data if available.</div>
        </div>
      )}

      {!loading && today && (
        <>
          {/* Today label */}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
            Latest · {fmtDate(today.date)}
          </div>

          {/* Big FII + DII cards */}
          <div className="g2" style={{ display:'grid', gap:16, marginBottom:20 }}>
            {[
              {
                label:'FII — Foreign Institutional',
                net: today.fii_net, buy: today.fii_buy, sell: today.fii_sell,
                fiveNet: fii5net,
                desc: today.fii_net >= 0 ? 'Equity net buying · Cash segment' : 'Equity net selling · Cash segment',
              },
              {
                label:'DII — Domestic Institutional',
                net: today.dii_net, buy: today.dii_buy, sell: today.dii_sell,
                fiveNet: dii5net,
                desc: today.dii_net >= 0 ? 'Equity net buying · Cash segment' : 'Equity net selling · Cash segment',
              },
            ].map(c => {
              const pos = c.net >= 0;
              return (
                <div key={c.label} style={{ background: pos ? 'rgba(0,212,160,0.03)' : 'rgba(255,59,92,0.03)', border:`1px solid ${pos ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:16, padding:24 }}>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:'var(--dim)', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:36, fontWeight:900, letterSpacing:-1.5, marginBottom:4, color: pos ? 'var(--grn)' : 'var(--red)' }}>
                    {crore(c.net)}
                  </div>
                  <div style={{ fontSize:12, color:'var(--dim)' }}>{c.desc}</div>
                  <div style={{ height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden', margin:'12px 0' }}>
                    <div style={{ height:'100%', borderRadius:4, width:`${barW(c.net)}%`, background: pos ? 'var(--grn)' : 'var(--red)', transition:'width 0.5s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:4 }}>
                    <span style={{ color:'var(--dim)' }}>Buy: ₹{c.buy.toLocaleString('en-IN', { maximumFractionDigits:0 })} Cr</span>
                    <span style={{ color:'var(--dim)' }}>Sell: ₹{c.sell.toLocaleString('en-IN', { maximumFractionDigits:0 })} Cr</span>
                  </div>
                  <div style={{ marginTop:12, fontSize:12, color:'var(--dim)' }}>
                    5-day net: <span style={{ color: c.fiveNet >= 0 ? 'var(--grn)' : 'var(--red)', fontWeight:700 }}>{crore(c.fiveNet)}</span>
                    {' · '}{c.fiveNet >= 0 ? 'Consistent buying' : 'Persistent selling'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ML impact box */}
          {impact && (
            <div style={{ background:'rgba(23,64,245,0.06)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>📊 SIGNAL ML — institutional flow impact</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>
                <span style={{ color:impact.color, fontWeight:600 }}>◉ </span>{impact.text}
              </div>
            </div>
          )}

          {/* History table */}
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Recent Trading Days</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>{rows.length} days tracked</span>
            </div>

            {/* Column headers */}
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 100px 1fr 100px', gap:8, fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
              <span>Date</span><span>FII</span><span style={{ textAlign:'right' }}>FII ₹Cr</span>
              <span>DII</span><span style={{ textAlign:'right' }}>DII ₹Cr</span>
            </div>

            {rows.map(row => {
              const fiiPos = row.fii_net >= 0;
              const diiPos = row.dii_net >= 0;
              return (
                <div key={row.date} style={{ display:'grid', gridTemplateColumns:'80px 1fr 100px 1fr 100px', alignItems:'center', gap:8, padding:'9px 0', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                  <span style={{ fontSize:12, color:'var(--dim)' }}>{fmtDate(row.date)}</span>
                  <div style={{ height:12, borderRadius:3, overflow:'hidden', background:'var(--surf2)' }}>
                    <div style={{ height:'100%', width:`${barW(row.fii_net)}%`, borderRadius:3, background: fiiPos ? 'rgba(0,212,160,0.5)' : 'rgba(255,59,92,0.5)', transition:'width 0.4s' }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color: fiiPos ? 'var(--grn)' : 'var(--red)', textAlign:'right' }}>
                    {fiiPos ? '+' : ''}{row.fii_net.toFixed(0)}
                  </span>
                  <div style={{ height:12, borderRadius:3, overflow:'hidden', background:'var(--surf2)' }}>
                    <div style={{ height:'100%', width:`${barW(row.dii_net)}%`, borderRadius:3, background: diiPos ? 'rgba(0,212,160,0.5)' : 'rgba(255,59,92,0.5)', transition:'width 0.4s' }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color: diiPos ? 'var(--grn)' : 'var(--red)', textAlign:'right' }}>
                    {diiPos ? '+' : ''}{row.dii_net.toFixed(0)}
                  </span>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--dim)', fontSize:13 }}>
                No history yet — data accumulates each day the page is visited.
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !today && !error && (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
          <div style={{ fontSize:14, fontWeight:700 }}>No data yet</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:6 }}>NSE API may be down or the market is closed. Try again during trading hours.</div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Cash segment equity data from NSE public API · History accumulates daily · For informational purposes only · DYOR
      </div>
    </>
  );
}
