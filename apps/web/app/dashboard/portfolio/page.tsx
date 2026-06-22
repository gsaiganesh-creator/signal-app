'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchQuote } from '@/lib/api';
import { usePortfolio } from '@/lib/portfolio-context';
import type { RawHolding } from '@/lib/portfolio-context';

type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';

interface Holding extends RawHolding {
  current_price?: number | null;
  change_pct?: number | null;
  signal?: string;
  rsi?: number | null;
  pl?: number;
  pl_pct?: number;
  exchange: Exchange;
}

function classify(signal: string, rsi: number | null, plPct: number) {
  const r = rsi ?? 50;
  if (signal === 'STRONG_BUY' || (signal === 'BUY' && r < 50))
    return { label:'🚀 Momentum', color:'var(--grn)', bg:'rgba(0,212,160,0.1)' };
  if (signal === 'BUY' && r < 62)
    return { label:'🔄 Swingable', color:'var(--bluL)', bg:'rgba(23,64,245,0.1)' };
  if (plPct > 20 && signal !== 'SELL' && signal !== 'STRONG_SELL')
    return { label:'🏛️ Long Term', color:'var(--pur)', bg:'rgba(139,92,246,0.1)' };
  if (signal === 'SELL' || signal === 'STRONG_SELL' || r > 70)
    return { label:'⚠️ Exit Now', color:'var(--red)', bg:'rgba(255,59,92,0.1)' };
  return { label:'⏳ Watch', color:'var(--ylw)', bg:'rgba(255,184,0,0.1)' };
}

function parseCSV(text: string): Array<{ symbol: string; qty: number; avg_price: number; exchange: Exchange }> {
  return text.split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('symbol'))
    .map(l => {
      const [sym, qty, price, exch] = l.split(',').map(s => s.trim().toUpperCase());
      const q = parseInt(qty, 10); const p = parseFloat(price);
      if (!sym || isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return null;
      return { symbol: sym, qty: q, avg_price: p, exchange: (exch as Exchange) || 'NSE' };
    }).filter(Boolean) as Array<{ symbol: string; qty: number; avg_price: number; exchange: Exchange }>;
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };
const inp: React.CSSProperties = { height:40, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:'100%' };

export default function PortfolioPage() {
  const { portfolios, activeId, activePortfolio, holdings: rawHoldings, setActiveId, createPortfolio, refresh: refreshContext } = usePortfolio();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ symbol:'', qty:'', avg_price:'', exchange:'NSE' as Exchange });
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function enrichHoldings(raw: RawHolding[]) {
    if (!raw.length) { setHoldings([]); setLoading(false); return; }
    setLoading(true);
    const enriched = await Promise.all(raw.map(async h => {
      const suffix = (h.exchange === 'NSE' || h.exchange === 'BSE') ? '.NS' : '';
      const q = await fetchQuote(h.symbol + suffix);
      const cur = q?.current_price ?? null;
      const pl = cur != null ? (cur - h.avg_price) * h.qty : undefined;
      const pl_pct = cur != null ? ((cur - h.avg_price) / h.avg_price) * 100 : 0;
      return { ...h, current_price: cur, change_pct: q?.change_pct ?? null, signal: q?.signal ?? 'HOLD', rsi: q?.rsi ?? null, pl, pl_pct, exchange: h.exchange as Exchange } as Holding;
    }));
    setHoldings(enriched);
    setLoading(false);
  }

  useEffect(() => { enrichHoldings(rawHoldings); }, [rawHoldings]);

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setSyncing(true); setUploadMsg('');
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setUploadMsg('❌ No valid rows. Format: SYMBOL,QTY,AVG_PRICE,EXCHANGE'); setSyncing(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadMsg('❌ Not logged in.'); setSyncing(false); return; }
    const inserts = rows.map(r => ({ portfolio_id: activeId, user_id: user.id, symbol: r.symbol, exchange: r.exchange, qty: r.qty, avg_price: r.avg_price }));
    const { error } = await supabase.from('holdings').upsert(inserts, { onConflict: 'portfolio_id,symbol,exchange' });
    if (error) { setUploadMsg(`❌ ${error.message}`); } else { setUploadMsg(`✅ ${rows.length} holdings imported`); await refreshContext(); }
    setSyncing(false); e.target.value = '';
  }

  async function handleAdd() {
    const sym = form.symbol.trim().toUpperCase();
    const qty = parseInt(form.qty, 10);
    const avg = parseFloat(form.avg_price);
    if (!sym || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0 || !activeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('holdings').upsert([{ portfolio_id: activeId, user_id: user.id, symbol: sym, exchange: form.exchange, qty, avg_price: avg }], { onConflict: 'portfolio_id,symbol,exchange' });
    setForm({ symbol:'', qty:'', avg_price:'', exchange:'NSE' }); setAddOpen(false);
    await refreshContext();
  }

  async function handleDelete(id: string) {
    await supabase.from('holdings').delete().eq('id', id);
    await refreshContext();
  }

  async function handleCreatePortfolio() {
    const name = newPortfolioName.trim();
    if (!name) return;
    setCreatingPortfolio(true);
    await createPortfolio(name);
    setNewPortfolioName(''); setShowNewPortfolio(false); setCreatingPortfolio(false);
  }

  const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty, 0);
  const totalPL       = totalCurrent - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const fmt    = (n: number) => n >= 0 ? `+₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}` : `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits:0 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  if (portfolios.length === 0) {
    return (
      <>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>My Portfolio</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Create your first portfolio to get started</div>
        </div>
        <div style={{ ...card, maxWidth:480 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>📂 Create your first portfolio</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20 }}>Name it anything — "Main Portfolio", "Swing Trades", "TFSA".</div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Portfolio name</div>
            <input style={inp} placeholder="My Portfolio" value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePortfolio()}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>
          <button onClick={handleCreatePortfolio} disabled={!newPortfolioName.trim() || creatingPortfolio}
            style={{ height:40, padding:'0 24px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: (!newPortfolioName.trim() || creatingPortfolio) ? 0.5 : 1 }}>
            {creatingPortfolio ? 'Creating…' : 'Create Portfolio →'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hero — referral card style */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.07),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.18)', borderRadius:20, padding:'28px 36px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>My Portfolio</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Upload once.<br/><span style={{ color:'var(--grn)' }}>Track everything.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:440 }}>
            SIGNAL tracks live P&L, runs ML classification on every holding (Momentum / Swing / Long-Term / Exit Now) and fires BUY/SELL signals for stocks you already own.
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:48, fontWeight:900, color: totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)', lineHeight:1 }}>{totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>portfolio return</div>
          <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>{holdings.length} holdings · {fmt(totalPL)}</div>
        </div>
      </div>

      {/* Multiple portfolio benefits card */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📂', color:'var(--bluL)', bg:'rgba(23,64,245,0.08)', border:'rgba(23,64,245,0.2)',
            title:'Multiple Portfolios',
            desc:'Separate "Swing Trades", "Long Term", "ELSS" — each tracked independently with its own P&L and signals.' },
          { icon:'🤖', color:'var(--grn)', bg:'rgba(0,212,160,0.07)', border:'rgba(0,212,160,0.2)',
            title:'ML Classification',
            desc:'Every holding auto-bucketed: Momentum · Swing · Long-Term · Exit Now. Updated daily from RSI + EMA signals.' },
          { icon:'📊', color:'var(--pur)', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)',
            title:'Live P&L Tracking',
            desc:'Real-time unrealised gains, invested value, and sector concentration — all from a single CSV upload.' },
          { icon:'🔔', color:'var(--ylw)', bg:'rgba(255,184,0,0.07)', border:'rgba(255,184,0,0.2)',
            title:'Signals on Your Stocks',
            desc:'Live Signals page filters to only your holdings. Earnings alerts, FII/DII impact — personalised to your portfolio.' },
        ].map(c => (
          <div key={c.title} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:'16px 18px' }}>
            <div style={{ fontSize:22, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:c.color, marginBottom:5 }}>{c.title}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Upload tip */}
      <div style={{ background:'rgba(0,212,160,0.05)', border:'1px solid rgba(0,212,160,0.15)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
        <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--grn)' }}>Tip:</strong> Create separate portfolios for different strategies — e.g. <em>Swing Picks</em>, <em>Core Holdings</em>, <em>F&O Hedges</em>. Switch between them from the top nav. CSV format: <code style={{ background:'var(--surf2)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>SYMBOL, QUANTITY, AVG_PRICE, EXCHANGE</code>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>Holdings</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:2 }}>ML-classified · Live prices via SIGNAL API</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={syncing || !activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Importing…' : '📤 Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleCSV}/>
          <button onClick={() => setAddOpen(o => !o)} disabled={!activeId}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => enrichHoldings(rawHoldings)} disabled={loading}
            style={{ height:36, padding:'0 12px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>🔄</button>
        </div>
      </div>

      {/* Portfolio tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {portfolios.map(p => (
          <button key={p.id} onClick={() => setActiveId(p.id)}
            style={{ height:34, padding:'0 16px', borderRadius:8, fontSize:13, fontWeight: p.id === activeId ? 700 : 500, cursor:'pointer', fontFamily:'inherit', border: p.id === activeId ? '1px solid var(--blu)' : '1px solid var(--bdr)', background: p.id === activeId ? 'rgba(23,64,245,0.1)' : 'transparent', color: p.id === activeId ? 'var(--bluL)' : 'var(--dim)' }}>
            📂 {p.name}
          </button>
        ))}
        {showNewPortfolio ? (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input autoFocus placeholder="Portfolio name…" value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreatePortfolio(); if (e.key === 'Escape') { setShowNewPortfolio(false); setNewPortfolioName(''); } }}
              style={{ height:34, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:160 }}/>
            <button onClick={handleCreatePortfolio} disabled={!newPortfolioName.trim() || creatingPortfolio}
              style={{ height:34, padding:'0 14px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {creatingPortfolio ? '…' : 'Create'}
            </button>
            <button onClick={() => { setShowNewPortfolio(false); setNewPortfolioName(''); }}
              style={{ height:34, padding:'0 10px', borderRadius:8, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowNewPortfolio(true)}
            style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'1px dashed var(--bdr)', background:'transparent', color:'var(--dim)' }}>
            + New Portfolio
          </button>
        )}
      </div>

      {uploadMsg && (
        <div style={{ marginBottom:14, fontSize:13, color: uploadMsg.startsWith('✅') ? 'var(--grn)' : 'var(--red)', background: uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'10px 14px' }}>
          {uploadMsg}
          {uploadMsg.startsWith('❌') && <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>Expected: <code>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code> — e.g. <code>RELIANCE,50,2800,NSE</code></div>}
        </div>
      )}

      {addOpen && (
        <div style={{ ...card, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { k:'symbol', label:'Symbol', ph:'RELIANCE', flex:2, min:100 },
            { k:'qty', label:'Qty', ph:'50', flex:1, min:80, type:'number' },
            { k:'avg_price', label:'Avg Price (₹)', ph:'2800', flex:1, min:100, type:'number' },
          ].map(f => (
            <div key={f.k} style={{ flex:f.flex, minWidth:f.min }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>{f.label}</div>
              <input style={inp} type={f.type ?? 'text'} placeholder={f.ph}
                value={(form as Record<string, string>)[f.k]}
                onChange={e => setForm(p => ({ ...p, [f.k]: f.k === 'symbol' ? e.target.value.toUpperCase() : e.target.value }))}
                onFocus={e => e.target.style.borderColor='var(--blu)'}
                onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
            </div>
          ))}
          <div style={{ flex:1, minWidth:90 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Exchange</div>
            <select style={{ ...inp, appearance:'none' }} value={form.exchange} onChange={e => setForm(f => ({ ...f, exchange: e.target.value as Exchange }))}>
              {(['NSE','BSE','NYSE','NASDAQ'] as Exchange[]).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <button onClick={handleAdd}
            style={{ height:40, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Add →</button>
        </div>
      )}

      {holdings.length > 0 && (
        <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
            { label:'Current Value',  val:`₹${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits:0 })}` },
            { label:'Total P&L', val:fmt(totalPL), sub:fmtPct(totalPLPct), valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', subC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map(m => (
            <div key={m.label} style={card}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:(m as { valC?: string }).valC ?? 'var(--txt)' }}>{m.val}</div>
              {(m as { sub?: string }).sub && <div style={{ fontSize:13, fontWeight:700, color:(m as { subC?: string }).subC, marginTop:3 }}>{(m as { sub?: string }).sub}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>{activePortfolio?.name} · Holdings · ML Classified</div>
          {holdings.length > 0 && <span style={{ fontSize:12, color:'var(--dim)' }}>{holdings.length} stocks</span>}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--dim)', fontSize:14 }}>Loading holdings…</div>
        ) : holdings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📂</div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No holdings in {activePortfolio?.name}</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20 }}>Import a CSV or add stocks manually.</div>
            <div style={{ fontSize:12, color:'var(--dim2)', background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 16px', display:'inline-block', textAlign:'left' }}>
              <strong style={{ color:'var(--dim)' }}>CSV format:</strong><br/>
              <code style={{ color:'var(--bluL)' }}>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code><br/>
              <code style={{ color:'var(--dim)' }}>RELIANCE,50,2800,NSE</code>
            </div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','ML Class','Avg Price','CMP','P&L','Signal',''].map(h => (
                    <th key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const cls = classify(h.signal ?? 'HOLD', h.rsi ?? null, h.pl_pct ?? 0);
                  const plPos = (h.pl ?? 0) >= 0;
                  return (
                    <tr key={h.id}>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>{h.exchange} · {h.qty}u</div>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:cls.bg, color:cls.color, whiteSpace:'nowrap' }}>{cls.label}</span>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>₹{h.avg_price.toLocaleString('en-IN')}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {h.current_price != null ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:700 }}>₹{h.current_price.toLocaleString('en-IN', { maximumFractionDigits:0 })}</div>
                            {h.change_pct != null && <div style={{ fontSize:11, color: h.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>{h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%</div>}
                          </>
                        ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>API offline</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {h.pl != null ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmt(h.pl)}</div>
                            <div style={{ fontSize:11, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmtPct(h.pl_pct ?? 0)}</div>
                          </>
                        ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:5, whiteSpace:'nowrap',
                          background: h.signal?.includes('BUY') ? 'rgba(0,212,160,0.12)' : h.signal?.includes('SELL') ? 'rgba(255,59,92,0.12)' : 'rgba(255,184,0,0.12)',
                          color: h.signal?.includes('BUY') ? 'var(--grn)' : h.signal?.includes('SELL') ? 'var(--red)' : 'var(--ylw)' }}>
                          {h.signal ?? 'HOLD'}
                        </span>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <button onClick={() => handleDelete(h.id)} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14, padding:'2px 4px' }} title="Remove">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14, lineHeight:1.6 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML classifications for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
