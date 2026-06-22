'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchQuote } from '@/lib/api';

type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';

interface Holding {
  id: string;
  symbol: string;
  exchange: Exchange;
  qty: number;
  avg_price: number;
  current_price?: number | null;
  change_pct?: number | null;
  signal?: string;
  rsi?: number | null;
  pl?: number;
  pl_pct?: number;
  ml_class?: string;
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
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().startsWith('symbol'))
    .map(l => {
      const [sym, qty, price, exch] = l.split(',').map(s => s.trim().toUpperCase());
      const q = parseInt(qty, 10);
      const p = parseFloat(price);
      if (!sym || isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return null;
      return { symbol: sym, qty: q, avg_price: p, exchange: (exch as Exchange) || 'NSE' };
    })
    .filter(Boolean) as Array<{ symbol: string; qty: number; avg_price: number; exchange: Exchange }>;
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [addOpen,  setAddOpen]  = useState(false);
  const [form,     setForm]     = useState({ symbol:'', qty:'', avg_price:'', exchange:'NSE' as Exchange });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function getOrCreatePortfolio(userId: string) {
    let { data } = await supabase
      .from('portfolios').select('id').eq('user_id', userId).limit(1).single();
    if (!data) {
      const { data: created } = await supabase
        .from('portfolios').insert({ user_id: userId, name:'My Portfolio', broker:'manual' }).select('id').single();
      data = created;
    }
    return data?.id ?? null;
  }

  async function loadHoldings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const portfolioId = await getOrCreatePortfolio(user.id);
    if (!portfolioId) { setLoading(false); return; }

    const { data: rows } = await supabase
      .from('holdings')
      .select('id, symbol, exchange, qty, avg_price, ml_class')
      .eq('portfolio_id', portfolioId)
      .order('symbol');

    if (!rows?.length) { setLoading(false); return; }

    const enriched = await Promise.all(rows.map(async h => {
      const suffix = (h.exchange === 'NSE' || h.exchange === 'BSE') ? '.NS' : '';
      const q = await fetchQuote(h.symbol + suffix);
      const cur = q?.current_price ?? null;
      const pl = cur != null ? (cur - h.avg_price) * h.qty : undefined;
      const pl_pct = cur != null ? ((cur - h.avg_price) / h.avg_price) * 100 : 0;
      const cls = classify(q?.signal ?? 'HOLD', q?.rsi ?? null, pl_pct);
      return {
        ...h,
        current_price: cur,
        change_pct: q?.change_pct ?? null,
        signal: q?.signal ?? 'HOLD',
        rsi: q?.rsi ?? null,
        pl,
        pl_pct,
        ml_class: cls.label,
        exchange: h.exchange as Exchange,
      } as Holding;
    }));

    setHoldings(enriched);
    setLoading(false);
  }

  useEffect(() => { loadHoldings(); }, []);

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing(true); setUploadMsg('');
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setUploadMsg('❌ No valid rows found. Format: SYMBOL,QTY,AVG_PRICE,EXCHANGE'); setSyncing(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadMsg('❌ Not logged in.'); setSyncing(false); return; }
    const portfolioId = await getOrCreatePortfolio(user.id);
    if (!portfolioId) { setSyncing(false); return; }

    const inserts = rows.map(r => ({ portfolio_id: portfolioId, user_id: user.id, symbol: r.symbol, exchange: r.exchange, qty: r.qty, avg_price: r.avg_price }));
    const { error } = await supabase.from('holdings').upsert(inserts, { onConflict: 'portfolio_id,symbol,exchange' });
    if (error) { setUploadMsg(`❌ ${error.message}`); } else { setUploadMsg(`✅ ${rows.length} holdings imported`); await loadHoldings(); }
    setSyncing(false);
    e.target.value = '';
  }

  async function handleAdd() {
    const sym = form.symbol.trim().toUpperCase();
    const qty = parseInt(form.qty, 10);
    const avg = parseFloat(form.avg_price);
    if (!sym || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const portfolioId = await getOrCreatePortfolio(user.id);
    if (!portfolioId) return;

    await supabase.from('holdings').upsert(
      [{ portfolio_id: portfolioId, user_id: user.id, symbol: sym, exchange: form.exchange, qty, avg_price: avg }],
      { onConflict: 'portfolio_id,symbol,exchange' }
    );
    setForm({ symbol:'', qty:'', avg_price:'', exchange:'NSE' });
    setAddOpen(false);
    await loadHoldings();
  }

  async function handleDelete(id: string) {
    await supabase.from('holdings').delete().eq('id', id);
    setHoldings(h => h.filter(x => x.id !== id));
  }

  const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const totalCurrent  = holdings.reduce((s, h) => s + (h.current_price ?? h.avg_price) * h.qty, 0);
  const totalPL       = totalCurrent - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  const fmt = (n: number) => n >= 0 ? `+₹${n.toLocaleString('en-IN', { maximumFractionDigits:0 })}` : `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits:0 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  const inp: React.CSSProperties = { height:40, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none', width:'100%' };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>My Portfolio</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>ML-classified holdings · Live prices via SIGNAL API</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={syncing}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Importing…' : '📤 Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleCSV}/>
          <button onClick={() => setAddOpen(o => !o)}
            style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => { setSyncing(true); loadHoldings().then(() => setSyncing(false)); }} disabled={syncing}
            style={{ height:36, padding:'0 12px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            🔄
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div style={{ marginBottom:14, fontSize:13, color: uploadMsg.startsWith('✅') ? 'var(--grn)' : 'var(--red)', background: uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.07)' : 'rgba(255,59,92,0.07)', border:`1px solid ${uploadMsg.startsWith('✅') ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'10px 14px' }}>
          {uploadMsg}
          {uploadMsg.startsWith('❌') && <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>Expected format: <code>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code><br/>Example: <code>RELIANCE,50,2800,NSE</code></div>}
        </div>
      )}

      {/* Add form */}
      {addOpen && (
        <div style={{ ...card, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:100 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Symbol</div>
            <input style={inp} placeholder="RELIANCE" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>
          <div style={{ flex:1, minWidth:80 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Qty</div>
            <input style={inp} type="number" placeholder="50" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>
          <div style={{ flex:1, minWidth:100 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Avg Price (₹)</div>
            <input style={inp} type="number" placeholder="2800" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>
          <div style={{ flex:1, minWidth:90 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>Exchange</div>
            <select style={{ ...inp, appearance:'none' }} value={form.exchange} onChange={e => setForm(f => ({ ...f, exchange: e.target.value as Exchange }))}>
              {(['NSE','BSE','NYSE','NASDAQ'] as Exchange[]).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <button onClick={handleAdd}
            style={{ height:40, padding:'0 20px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            Add →
          </button>
        </div>
      )}

      {/* Summary cards */}
      {holdings.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`₹${totalInvested.toLocaleString('en-IN',{maximumFractionDigits:0})}`, sub:null, subC:'var(--dim)' },
            { label:'Current Value',  val:`₹${totalCurrent.toLocaleString('en-IN',{maximumFractionDigits:0})}`,  sub:null, subC:'var(--dim)' },
            { label:'Total P&L',      val:fmt(totalPL), sub:fmtPct(totalPLPct), subC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map(m => (
            <div key={m.label} style={card}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:(m as {valC?:string}).valC ?? 'var(--txt)' }}>{m.val}</div>
              {m.sub && <div style={{ fontSize:13, fontWeight:700, color:m.subC, marginTop:3 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Holdings table */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>Holdings · ML Classified</div>
          {holdings.length > 0 && <span style={{ fontSize:12, color:'var(--dim)' }}>{holdings.length} stocks</span>}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--dim)', fontSize:14 }}>Loading holdings…</div>
        ) : holdings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📂</div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No holdings yet</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20 }}>Import a CSV or add stocks manually to get started.</div>
            <div style={{ fontSize:12, color:'var(--dim2)', background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 16px', display:'inline-block', textAlign:'left' }}>
              <strong style={{ color:'var(--dim)' }}>CSV format:</strong><br/>
              <code style={{ color:'var(--bluL)' }}>SYMBOL,QUANTITY,AVG_PRICE,EXCHANGE</code><br/>
              <code style={{ color:'var(--dim)' }}>RELIANCE,50,2800,NSE</code><br/>
              <code style={{ color:'var(--dim)' }}>HDFCBANK,30,1580,NSE</code>
            </div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Stock','ML Class','Avg Price','CMP','P&L','Signal',''].map(h => (
                  <th key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
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
                      <div style={{ fontSize:11, color:'var(--dim)' }}>{h.exchange} · {h.qty} units</div>
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:cls.bg, color:cls.color }}>{cls.label}</span>
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13, fontWeight:600 }}>
                      ₹{h.avg_price.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      {h.current_price != null ? (
                        <>
                          <div style={{ fontSize:13, fontWeight:700 }}>₹{h.current_price.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                          {h.change_pct != null && <div style={{ fontSize:11, color: h.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>{h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%</div>}
                        </>
                      ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>API offline</span>}
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      {h.pl != null ? (
                        <>
                          <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmt(h.pl)}</div>
                          <div style={{ fontSize:11, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{fmtPct(h.pl_pct ?? 0)}</div>
                        </>
                      ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:5, background: h.signal?.includes('BUY') ? 'rgba(0,212,160,0.12)' : h.signal?.includes('SELL') ? 'rgba(255,59,92,0.12)' : 'rgba(255,184,0,0.12)', color: h.signal?.includes('BUY') ? 'var(--grn)' : h.signal?.includes('SELL') ? 'var(--red)' : 'var(--ylw)' }}>{h.signal ?? 'HOLD'}</span>
                    </td>
                    <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                      <button onClick={() => handleDelete(h.id)} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14, padding:'2px 4px' }} title="Remove">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14, lineHeight:1.6 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · ML classifications are for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
