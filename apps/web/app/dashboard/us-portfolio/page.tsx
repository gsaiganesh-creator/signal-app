'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };
const inp:  React.CSSProperties = { height:36, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 10px', fontFamily:'inherit', outline:'none' };

interface USHolding { id: string; symbol: string; exchange: string; qty: number; avg_price: number; portfolio_id: string; portfolio_name?: string; }
type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;

const INDICES = [
  { name:'S&P 500', sym:'^GSPC' }, { name:'Nasdaq', sym:'^IXIC' },
  { name:'Dow Jones', sym:'^DJI' }, { name:'VIX', sym:'^VIX' },
];

// Curated momentum/swing picks by sector
const MOMENTUM_PICKS = {
  'AI & Tech':     [{ sym:'NVDA',desc:'AI chip leader' },{ sym:'MSFT',desc:'Azure + Copilot' },{ sym:'META',desc:'Ad revenue + AI' },{ sym:'GOOGL',desc:'Search + Gemini' },{ sym:'AMZN',desc:'Cloud + AI infra' }],
  'Financials':    [{ sym:'JPM',desc:'Banking giant' },{ sym:'V',desc:'Payments network' },{ sym:'GS',desc:'Investment bank' },{ sym:'BRK-B',desc:'Buffett holding co.' }],
  'Momentum ETFs': [{ sym:'QQQ',desc:'Nasdaq-100 ETF' },{ sym:'SPY',desc:'S&P 500 ETF' },{ sym:'SOXX',desc:'Semiconductor ETF' },{ sym:'ARKK',desc:'Innovation ETF' }],
  'High Growth':   [{ sym:'TSLA',desc:'EV + Energy + AI' },{ sym:'PLTR',desc:'AI data analytics' },{ sym:'COIN',desc:'Crypto exchange' },{ sym:'APP',desc:'Mobile advertising' }],
};

function parseCSV(text: string): Omit<USHolding, 'id' | 'portfolio_id' | 'portfolio_name'>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let headerIdx = -1, symI = -1, qtyI = -1, priceI = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const row = lines[i].split(',').map(c => c.replace(/^"|"$/g,'').trim().toLowerCase());
    const s = row.findIndex(c => ['symbol','ticker','stock'].includes(c));
    const q = row.findIndex(c => ['qty','quantity','shares'].includes(c));
    const p = row.findIndex(c => ['avg_price','price','cost','average_price'].includes(c));
    if (s >= 0 && q >= 0) { headerIdx=i; symI=s; qtyI=q; priceI=p>=0?p:-1; break; }
  }
  const out: Omit<USHolding, 'id' | 'portfolio_id' | 'portfolio_name'>[] = [];
  for (let i = (headerIdx >= 0 ? headerIdx+1 : 0); i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g,'').trim());
    const sym  = (headerIdx>=0 ? cols[symI] : cols[0])?.toUpperCase() ?? '';
    const qty  = parseFloat((headerIdx>=0 ? cols[qtyI] : cols[1] ?? '0').replace(/,/g,''));
    const avg  = parseFloat((headerIdx>=0 && priceI>=0 ? cols[priceI] : cols[2] ?? '0').replace(/[$,]/g,''));
    if (!sym || sym.length > 10 || isNaN(qty) || qty <= 0) continue;
    out.push({ symbol:sym, exchange:'NYSE', qty, avg_price: (!isNaN(avg) && avg>0) ? avg : 0.001 });
  }
  return out;
}

export default function USPortfolioPage() {
  const { portfolios, session, createPortfolio } = usePortfolio();
  const [allHoldings, setAllHoldings] = useState<USHolding[]>([]);
  const [prices, setPrices]           = useState<PriceMap>({});
  const [idxPrices, setIdxPrices]     = useState<PriceMap>({});
  const [momentumPrices, setMomentumPrices] = useState<PriceMap>({});
  const [usdInr, setUsdInr]           = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState('');
  const [activePortId, setActivePortId] = useState<string | null>(null);
  const [viewMode, setViewMode]       = useState<'merged' | 'by-portfolio'>('merged');
  const [addForm, setAddForm]         = useState({ symbol:'', qty:'', avg_price:'', portfolio_id:'' });
  const [addOpen, setAddOpen]         = useState(false);
  const [newPortName, setNewPortName] = useState('');
  const [creatingPort, setCreatingPort] = useState(false);
  const [selectedHolding, setSelected] = useState<USHolding | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPortId, setUploadPortId] = useState<string | null>(null);

  // US portfolios = portfolios that have any NYSE/NASDAQ holdings (or all portfolios for add target)
  const allPortIds = portfolios.map(p => p.id);

  // Fetch all US holdings across all portfolios
  const fetchHoldings = useCallback(async () => {
    if (!session || !allPortIds.length) return;
    try {
      const ids = allPortIds.join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/holdings?select=id,symbol,exchange,qty,avg_price,portfolio_id&portfolio_id=in.(${ids})&exchange=in.(NYSE,NASDAQ)&order=symbol`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const rows: { id:string; symbol:string; exchange:string; qty:number; avg_price:number; portfolio_id:string }[] = await res.json();
      const portMap = Object.fromEntries(portfolios.map(p => [p.id, p.name]));
      setAllHoldings(rows.map(r => ({ ...r, portfolio_name: portMap[r.portfolio_id] ?? 'Unknown' })));
    } catch { /* offline */ }
  }, [session, allPortIds.join(','), portfolios]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  // Fetch prices for all US holdings + USD/INR
  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return;
    setLoading(true);
    try {
      const all = [...syms, 'USDINR=X'];
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(all.join(','))}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data: PriceMap = await res.json();
        setPrices(data);
        if (data['USDINR=X']?.price) setUsdInr(data['USDINR=X'].price);
      }
    } catch { /* timeout */ }
    setLoading(false);
  }, []);

  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(INDICES.map(i => i.sym).join(','))}`);
      if (res.ok) setIdxPrices(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchMomentum = useCallback(async () => {
    const all = Object.values(MOMENTUM_PICKS).flat().map(s => s.sym);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(all.join(','))}`);
      if (res.ok) setMomentumPrices(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIndices(); fetchMomentum(); }, [fetchIndices, fetchMomentum]);
  useEffect(() => {
    const syms = [...new Set(allHoldings.map(h => h.symbol))];
    if (syms.length) fetchPrices(syms);
    else { setPrices({}); setLoading(false); }
  }, [allHoldings, fetchPrices]);

  // Set default add-form portfolio
  useEffect(() => {
    if (!addForm.portfolio_id && portfolios.length) {
      setAddForm(f => ({ ...f, portfolio_id: portfolios[0].id }));
    }
    if (!uploadPortId && portfolios.length) setUploadPortId(portfolios[0].id);
  }, [portfolios]);

  // Derived metrics — all holdings merged
  const merged = allHoldings;
  const totalInvestedUSD = merged.reduce((s, h) => s + (h.avg_price > 0.01 ? h.avg_price * h.qty : 0), 0);
  const totalCurrentUSD  = merged.reduce((s, h) => {
    const p = prices[h.symbol]?.price;
    return p != null ? s + p * h.qty : s;
  }, 0);
  const hasAllPrices = merged.every(h => prices[h.symbol]?.price != null);
  const totalPLUSD   = hasAllPrices ? totalCurrentUSD - totalInvestedUSD : null;
  const totalPLPct   = (totalPLUSD != null && totalInvestedUSD > 0) ? (totalPLUSD / totalInvestedUSD * 100) : null;
  const dayPL        = merged.reduce((s, h) => {
    const p = prices[h.symbol];
    if (!p?.price || !p?.change_pct) return s;
    const prevClose = p.price / (1 + p.change_pct / 100);
    return s + (p.price - prevClose) * h.qty;
  }, 0);
  const inrEquiv     = usdInr && totalCurrentUSD > 0 ? totalCurrentUSD * usdInr : null;

  async function handleAdd() {
    if (!session || !addForm.portfolio_id) return;
    const sym = addForm.symbol.trim().toUpperCase();
    const qty = parseFloat(addForm.qty);
    const avg = parseFloat(addForm.avg_price);
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(avg) || avg <= 0) { setMsg('⚠ Fill all fields'); return; }
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
        method:'POST',
        headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json', Prefer:'return=representation' },
        body: JSON.stringify({ symbol: sym, exchange:'NYSE', qty, avg_price: avg, portfolio_id: addForm.portfolio_id }),
      });
      if (!res.ok) { const t=await res.text(); setMsg(`❌ ${t}`); return; }
      setMsg(`✅ Added ${sym}`);
      setAddForm(f => ({ ...f, symbol:'', qty:'', avg_price:'' }));
      setAddOpen(false);
      await fetchHoldings();
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  async function handleDelete(h: USHolding) {
    if (!session) return;
    await fetch(`${SUPA_URL}/rest/v1/holdings?id=eq.${h.id}`, {
      method:'DELETE',
      headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}` },
    });
    setAllHoldings(prev => prev.filter(x => x.id !== h.id));
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session || !uploadPortId) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setMsg('❌ Could not parse CSV'); return; }
    let added = 0;
    for (const r of rows) {
      const res = await fetch(`${SUPA_URL}/rest/v1/holdings`, {
        method:'POST',
        headers: { apikey: SUPA_KEY, Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json', Prefer:'return=minimal' },
        body: JSON.stringify({ ...r, portfolio_id: uploadPortId }),
      });
      if (res.ok) added++;
    }
    setMsg(`✅ Imported ${added}/${rows.length} holdings`);
    e.target.value = '';
    await fetchHoldings();
  }

  async function handleCreatePortfolio() {
    if (!newPortName.trim()) return;
    setCreatingPort(true);
    const result = await createPortfolio(newPortName.trim());
    setCreatingPort(false);
    if (result.error) { setMsg(`❌ ${result.error}`); return; }
    setNewPortName('');
    setMsg(`✅ Created "${newPortName.trim()}"`);
    if (result.id) { setAddForm(f => ({ ...f, portfolio_id: result.id! })); setUploadPortId(result.id); }
  }

  // Group by portfolio for by-portfolio view
  const byPortfolio = portfolios.map(p => ({
    portfolio: p,
    holdings: allHoldings.filter(h => h.portfolio_id === p.id),
  })).filter(g => g.holdings.length > 0);

  // Displayed holdings
  const displayHoldings = viewMode === 'merged' ? merged :
    (activePortId ? allHoldings.filter(h => h.portfolio_id === activePortId) : merged);

  const allMomentumSyms = Object.values(MOMENTUM_PICKS).flat().map(s => s.sym);

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>🇺🇸 US Portfolio</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            {merged.length} holdings across {byPortfolio.length || portfolios.length} portfolios
            {usdInr ? ` · USD/INR ₹${usdInr.toFixed(2)}` : ''}
            {loading && ' · ⏳ refreshing…'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => setAddOpen(true)}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Stock
          </button>
          <button onClick={() => fileRef.current?.click()}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            📂 Import CSV
          </button>
          <input type="file" ref={fileRef} accept=".csv,.txt" style={{ display:'none' }} onChange={handleCSV} />
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:9, background: msg.startsWith('✅') ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${msg.startsWith('✅') ? 'rgba(0,212,160,0.25)' : 'rgba(255,59,92,0.25)'}`, fontSize:13 }}>
          {msg} <button onClick={() => setMsg('')} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', float:'right' }}>✕</button>
        </div>
      )}

      {/* US Indices bar */}
      <div style={{ ...card, padding:'12px 18px', marginBottom:16 }}>
        <div className="g4" style={{ display:'grid', gap:10 }}>
          {INDICES.map(idx => {
            const p = idxPrices[idx.sym];
            const isVIX = idx.sym === '^VIX';
            const chg = p?.change_pct ?? null;
            const col = chg == null ? 'var(--dim)' : isVIX ? (chg > 0 ? 'var(--red)' : 'var(--grn)') : (chg >= 0 ? 'var(--grn)' : 'var(--red)');
            return (
              <div key={idx.sym}>
                <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, marginBottom:3 }}>{idx.name}</div>
                <div style={{ fontSize:15, fontWeight:800 }}>{p?.price != null ? p.price.toLocaleString('en-US',{maximumFractionDigits:2}) : '—'}</div>
                <div style={{ fontSize:11, fontWeight:700, color:col }}>{chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      {merged.length > 0 && (
        <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`$${totalInvestedUSD.toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: usdInr ? `₹${(totalInvestedUSD*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Current Value',  val: totalCurrentUSD > 0 ? `$${totalCurrentUSD.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', sub: inrEquiv ? `₹${inrEquiv.toLocaleString('en-IN',{maximumFractionDigits:0})} equiv` : '', color:'var(--txt)' },
            { label:'Unrealised P&L', val: totalPLUSD != null ? `${totalPLUSD >= 0 ? '+' : '-'}$${Math.abs(totalPLUSD).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—',
              sub: totalPLPct != null ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(2)}%` : '', color: totalPLUSD != null ? (totalPLUSD >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' },
            { label:"Today's P&L",   val: `${dayPL >= 0 ? '+' : '-'}$${Math.abs(dayPL).toLocaleString('en-US',{maximumFractionDigits:0})}`, sub:'1-day change', color: dayPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map(m => (
            <div key={m.label} style={card}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color:m.color }}>{m.val}</div>
              {m.sub && <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Holdings table */}
      {merged.length > 0 ? (
        <div style={{ ...card, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Holdings</div>
            <div style={{ display:'flex', gap:8 }}>
              {/* View mode toggle */}
              {byPortfolio.length > 1 && ['merged','by-portfolio'].map(m => (
                <button key={m} onClick={() => setViewMode(m as typeof viewMode)}
                  style={{ height:30, padding:'0 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    background: viewMode === m ? 'var(--blu)' : 'var(--surf2)',
                    color: viewMode === m ? '#fff' : 'var(--dim)',
                    border: `1px solid ${viewMode === m ? 'var(--blu)' : 'var(--bdr)'}` }}>
                  {m === 'merged' ? '🔀 Merged' : '📂 By Portfolio'}
                </button>
              ))}
              {/* Portfolio filter */}
              {viewMode === 'by-portfolio' && (
                <select value={activePortId ?? ''} onChange={e => setActivePortId(e.target.value || null)}
                  style={{ ...inp, height:30, fontSize:11 }}>
                  <option value="">All portfolios</option>
                  {byPortfolio.map(g => <option key={g.portfolio.id} value={g.portfolio.id}>{g.portfolio.name}</option>)}
                </select>
              )}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Portfolio','Shares','Avg Cost','CMP','P&L $','P&L %',''].map((h, i) => (
                    <th key={i} className={i === 1 ? 'mob-hide' : ''} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayHoldings.map(h => {
                  const p = prices[h.symbol];
                  const cmp = p?.price ?? null;
                  const chg = p?.change_pct ?? null;
                  const pl = (cmp != null && h.avg_price > 0.01) ? (cmp - h.avg_price) * h.qty : null;
                  const plPct = (pl != null && h.avg_price > 0.01) ? (cmp! - h.avg_price) / h.avg_price * 100 : null;
                  const plPos = pl == null || pl >= 0;
                  return (
                    <tr key={h.id} onClick={() => setSelected(h)} style={{ cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:10, color:'var(--dim)' }}>{h.exchange} · {h.qty} shares</div>
                      </td>
                      <td className="mob-hide" style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:11, color:'var(--dim)' }}>
                        {h.portfolio_name}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13 }}>{h.qty}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontSize:13, whiteSpace:'nowrap' }}>${h.avg_price.toFixed(2)}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap' }}>
                        {cmp != null ? (
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>${cmp.toFixed(2)}</div>
                            {chg != null && <div style={{ fontSize:10, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>}
                          </div>
                        ) : <span style={{ color:'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                        {pl != null ? `${pl >= 0 ? '+' : '-'}$${Math.abs(pl).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                        {plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                        <button onClick={e => { e.stopPropagation(); handleDelete(h); }}
                          style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && (
        <div style={{ ...card, textAlign:'center', padding:'40px 20px', marginBottom:20 }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🇺🇸</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No US holdings yet</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Add stocks via the form or import a CSV from your broker</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            <button onClick={() => setAddOpen(true)} style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Stock</button>
            <button onClick={() => fileRef.current?.click()} style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>📂 Import CSV</button>
          </div>
        </div>
      )}

      {/* Momentum & Swing Picks */}
      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Momentum & Sector Picks</div>
        <div style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>Popular US stocks to watch — not SEBI/SEC advice · DYOR</div>
        {Object.entries(MOMENTUM_PICKS).map(([sector, picks]) => (
          <div key={sector} style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{sector}</div>
            <div className="g4" style={{ display:'grid', gap:8 }}>
              {picks.map(pick => {
                const p = momentumPrices[pick.sym];
                const chg = p?.change_pct ?? null;
                const isPos = chg == null || chg >= 0;
                return (
                  <div key={pick.sym} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${isPos ? 'var(--grn)' : 'var(--red)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>{pick.sym}</div>
                      {chg != null && <div style={{ fontSize:11, fontWeight:700, color: isPos ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>}
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, marginTop:3 }}>{p?.price != null ? `$${p.price.toFixed(2)}` : '—'}</div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{pick.desc}</div>
                    <button onClick={() => { setAddForm(f => ({ ...f, symbol: pick.sym })); setAddOpen(true); }}
                      style={{ marginTop:7, width:'100%', height:26, borderRadius:6, background:'rgba(79,111,250,0.12)', border:'1px solid rgba(79,111,250,0.3)', color:'var(--bluL)', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      + Add to Portfolio
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Create new US portfolio */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Create US Portfolio</div>
        <div style={{ fontSize:11, color:'var(--dim)', marginBottom:12 }}>Track separate broker accounts (Schwab, Webull, IBKR, etc.)</div>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="e.g. Schwab US Stocks" value={newPortName} onChange={e => setNewPortName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreatePortfolio()}
            style={{ ...inp, flex:1 }} />
          <button onClick={handleCreatePortfolio} disabled={!newPortName.trim() || creatingPort}
            style={{ height:36, padding:'0 14px', borderRadius:8, background:'var(--grn)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: (!newPortName.trim() || creatingPort) ? 0.5 : 1 }}>
            {creatingPort ? 'Creating…' : 'Create'}
          </button>
        </div>
        {portfolios.length > 0 && (
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:6 }}>
            {portfolios.map(p => (
              <span key={p.id} style={{ fontSize:11, padding:'3px 10px', borderRadius:12, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)' }}>
                📂 {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add holding modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:18, padding:24, width:'min(400px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)' }}>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:18 }}>Add US Stock</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>PORTFOLIO</div>
                <select value={addForm.portfolio_id} onChange={e => setAddForm(f => ({ ...f, portfolio_id:e.target.value }))}
                  style={{ ...inp, width:'100%' }}>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>SYMBOL (e.g. AAPL, NVDA)</div>
                <input autoFocus value={addForm.symbol} onChange={e => setAddForm(f => ({ ...f, symbol:e.target.value.toUpperCase() }))}
                  placeholder="AAPL" style={{ ...inp, width:'100%' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>SHARES</div>
                  <input type="number" value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty:e.target.value }))}
                    placeholder="10" style={{ ...inp, width:'100%' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>AVG COST ($)</div>
                  <input type="number" value={addForm.avg_price} onChange={e => setAddForm(f => ({ ...f, avg_price:e.target.value }))}
                    placeholder="150.00" style={{ ...inp, width:'100%' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleAdd}
                  style={{ flex:1, height:38, borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Add Stock
                </button>
                <button onClick={() => setAddOpen(false)}
                  style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock detail modal */}
      {selectedHolding && (() => {
        const h = selectedHolding;
        const p = prices[h.symbol];
        const cmp = p?.price ?? null;
        const chg = p?.change_pct ?? null;
        const pl = (cmp != null && h.avg_price > 0.01) ? (cmp - h.avg_price) * h.qty : null;
        const plPct = (pl != null && h.avg_price > 0.01) ? (cmp! - h.avg_price) / h.avg_price * 100 : null;
        const plPos = pl == null || pl >= 0;
        return (
          <div onClick={() => setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:20, padding:24, width:'min(440px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)', maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900 }}>{h.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--dim)' }}>{h.portfolio_name} · {h.exchange} · {h.qty} shares</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--dim)', fontSize:15 }}>✕</button>
              </div>
              {cmp != null && (
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
                  <div style={{ fontSize:26, fontWeight:900 }}>${cmp.toFixed(2)}</div>
                  {chg != null && <div style={{ fontSize:13, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}% today</div>}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'Avg Cost', val:`$${h.avg_price.toFixed(2)}`, sub:'per share' },
                  { label:'CMP', val: cmp != null ? `$${cmp.toFixed(2)}` : '—', sub: chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% today` : '' },
                  { label:'Invested', val:`$${(h.avg_price*h.qty).toFixed(0)}`, sub: usdInr ? `≈ ₹${(h.avg_price*h.qty*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '' },
                  { label:'Current Value', val: cmp != null ? `$${(cmp*h.qty).toFixed(0)}` : '—', sub: (cmp && usdInr) ? `≈ ₹${(cmp*h.qty*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '' },
                ].map(m => (
                  <div key={m.label} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:9, padding:'9px 12px' }}>
                    <div style={{ fontSize:9.5, color:'var(--dim)', fontWeight:700, marginBottom:3 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize:14, fontWeight:800 }}>{m.val}</div>
                    {m.sub && <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{m.sub}</div>}
                  </div>
                ))}
              </div>
              {pl != null && (
                <div style={{ background: plPos ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${plPos ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:9, padding:'12px 14px', display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>UNREALISED P&L</div>
                    <div style={{ fontSize:20, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{plPos ? '+' : '-'}${Math.abs(pl).toFixed(0)}</div>
                    {usdInr && <div style={{ fontSize:10, color:'var(--dim)' }}>≈ {plPos ? '+' : '-'}₹{(Math.abs(pl)*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)' }}>RETURN</div>
                    <div style={{ fontSize:20, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}</div>
                  </div>
                </div>
              )}
              <button onClick={() => { handleDelete(h); setSelected(null); }}
                style={{ width:'100%', height:38, borderRadius:9, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.25)', color:'var(--red)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                🗑️ Remove from Portfolio
              </button>
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
        ⚠️ Prices from Yahoo Finance · Delayed 15-20 min · NOT SEC registered · Not investment advice · DYOR
      </div>
    </div>
  );
}
