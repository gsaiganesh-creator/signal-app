'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };
const inp: React.CSSProperties = { height:38, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 12px', fontFamily:'inherit', outline:'none' };

interface USHolding { id: string; symbol: string; qty: number; avg_price: number; }
interface PriceData { price: number | null; change_pct: number | null; }

const US_INDICES = [
  { name:'S&P 500', sym:'^GSPC' },
  { name:'Nasdaq',  sym:'^IXIC' },
  { name:'Dow Jones', sym:'^DJI' },
  { name:'VIX',     sym:'^VIX'  },
];

const SECTOR_ETFS: Record<string, string[]> = {
  'Technology':   ['AAPL','MSFT','NVDA','GOOGL','META','AMZN'],
  'Finance':      ['JPM','BAC','GS','MS','BRK-B','V'],
  'Healthcare':   ['JNJ','UNH','PFE','ABBV','LLY','MRK'],
  'Energy':       ['XOM','CVX','COP','EOG','SLB'],
  'Consumer':     ['AMZN','TSLA','HD','MCD','NKE','SBUX'],
};

function parseUSCsv(text: string): USHolding[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: USHolding[] = [];
  let headerIdx = -1;
  let symI = -1, qtyI = -1, priceI = -1;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const row = lines[i].split(',').map(c => c.replace(/^"|"$/g,'').trim().toLowerCase());
    const sIdx = row.findIndex(c => c === 'symbol' || c === 'ticker' || c === 'stock');
    const qIdx = row.findIndex(c => c === 'qty' || c === 'quantity' || c === 'shares');
    const pIdx = row.findIndex(c => c === 'avg_price' || c === 'price' || c === 'cost' || c === 'average_price');
    if (sIdx >= 0 && qIdx >= 0) {
      headerIdx = i; symI = sIdx; qtyI = qIdx; priceI = pIdx >= 0 ? pIdx : -1;
      break;
    }
  }

  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g,'').trim());
    if (!cols.length) continue;
    const sym = headerIdx >= 0 ? (cols[symI] ?? '').toUpperCase() : cols[0].toUpperCase();
    const qty = parseFloat((headerIdx >= 0 ? cols[qtyI] : cols[1] ?? '0').replace(/,/g,''));
    const avg = parseFloat((headerIdx >= 0 && priceI >= 0 ? cols[priceI] : cols[2] ?? '0').replace(/[$,]/g,''));
    if (!sym || sym.length > 10 || isNaN(qty) || qty <= 0) continue;
    const avgPrice = (!isNaN(avg) && avg > 0) ? avg : 0.001;
    results.push({ id: crypto.randomUUID(), symbol: sym, qty, avg_price: avgPrice });
  }
  return results;
}

export default function USPortfolioPage() {
  const [holdings, setHoldings] = useState<USHolding[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [indexPrices, setIndexPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [addForm, setAddForm] = useState({ symbol:'', qty:'', avg_price:'' });
  const [addOpen, setAddOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<USHolding | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Persist holdings to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('signal_us_holdings');
    if (saved) {
      try { setHoldings(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const saveHoldings = useCallback((h: USHolding[]) => {
    setHoldings(h);
    localStorage.setItem('signal_us_holdings', JSON.stringify(h));
  }, []);

  // Fetch prices
  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(syms.join(','))}`, { signal: AbortSignal.timeout(12000) });
      if (res.ok) {
        const data: Record<string, PriceData> = await res.json();
        setPrices(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchIndexPrices = useCallback(async () => {
    try {
      const syms = US_INDICES.map(i => i.sym).join(',');
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) setIndexPrices(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIndexPrices(); }, [fetchIndexPrices]);
  useEffect(() => {
    if (holdings.length) fetchPrices(holdings.map(h => h.symbol));
    else setPrices({});
  }, [holdings, fetchPrices]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const parsed = parseUSCsv(text);
      if (!parsed.length) { setUploadMsg('❌ Could not parse CSV. Format: SYMBOL, QTY, AVG_PRICE'); return; }
      saveHoldings(parsed);
      setUploadMsg(`✅ ${parsed.length} US holdings imported`);
    });
    e.target.value = '';
  }

  function handleAdd() {
    const sym = addForm.symbol.trim().toUpperCase();
    const qty = parseFloat(addForm.qty);
    const avg = parseFloat(addForm.avg_price);
    if (!sym || isNaN(qty) || qty <= 0) return;
    const newH: USHolding = { id: crypto.randomUUID(), symbol: sym, qty, avg_price: isNaN(avg) || avg <= 0 ? 0.001 : avg };
    saveHoldings([...holdings, newH]);
    setAddForm({ symbol:'', qty:'', avg_price:'' }); setAddOpen(false);
  }

  function handleDelete(id: string) {
    saveHoldings(holdings.filter(h => h.id !== id));
    if (selectedStock?.id === id) setSelectedStock(null);
  }

  function handleUpdateCost(id: string) {
    const cost = parseFloat(editVal);
    if (isNaN(cost) || cost <= 0) { setEditingId(null); return; }
    saveHoldings(holdings.map(h => h.id === id ? { ...h, avg_price: cost } : h));
    setEditingId(null);
  }

  const invested = holdings.reduce((s, h) => s + (h.avg_price >= 0.01 ? h.avg_price * h.qty : 0), 0);
  const currentValue = holdings.reduce((s, h) => {
    const p = prices[h.symbol]?.price;
    if (p != null && h.avg_price >= 0.01) {
      const ratio = p / h.avg_price;
      if (ratio > 100 || ratio < 0.01) return s + h.avg_price * h.qty;
      return s + p * h.qty;
    }
    return s + (h.avg_price >= 0.01 ? h.avg_price * h.qty : 0);
  }, 0);
  const totalPL = currentValue - invested;
  const totalPLPct = invested > 0 ? (totalPL / invested) * 100 : 0;
  const hasPrices = Object.values(prices).some(p => p.price != null);

  const fmtUSD = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const fmtK = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(2)}K` : fmtUSD(n);

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.4 }}>🇺🇸 US Portfolio</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>Track US stocks in USD · prices from Yahoo Finance · click row for details</div>
        </div>
        {holdings.length > 0 && hasPrices && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:30, fontWeight:900, color: totalPLPct >= 0 ? 'var(--grn)' : 'var(--red)', lineHeight:1, letterSpacing:-1 }}>
              {totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%
            </div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>return · {totalPL >= 0 ? '+' : '-'}{fmtK(Math.abs(totalPL))}</div>
          </div>
        )}
      </div>

      {/* US Market indices */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {US_INDICES.map(idx => {
          const p = indexPrices[idx.sym];
          const chg = p?.change_pct;
          const isVix = idx.sym === '^VIX';
          const up = chg != null ? (isVix ? chg < 0 : chg >= 0) : null;
          return (
            <div key={idx.sym} style={card}>
              <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, marginBottom:4 }}>{idx.name}</div>
              <div style={{ fontSize:16, fontWeight:900, letterSpacing:-0.3 }}>
                {p?.price != null ? (p.price > 1000 ? p.price.toLocaleString('en-US',{maximumFractionDigits:0}) : p.price.toFixed(2)) : '—'}
              </div>
              {chg != null && (
                <div style={{ fontSize:11, fontWeight:700, marginTop:2, color: up ? 'var(--grn)' : 'var(--red)' }}>
                  {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key metrics */}
      {holdings.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Holdings', val:String(holdings.length), sub:'US stocks' },
            { label:'Invested', val: invested >= 0.01 ? fmtK(invested) : '—', sub:'cost basis (USD)' },
            { label:'Current Value', val: hasPrices ? fmtK(currentValue) : '—', sub: loading ? 'loading…' : 'market value' },
            { label:'Unrealised P&L', val: hasPrices ? `${totalPL >= 0 ? '+' : '-'}${fmtK(Math.abs(totalPL))}` : '—',
              valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', sub: hasPrices ? `${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(2)}%` : '' },
          ].map(m => (
            <div key={m.label} style={card}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, color:(m as { valC?: string }).valC ?? 'var(--txt)' }}>{m.val}</div>
              {m.sub && <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Upload + add controls */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          📤 Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleFile}/>
        <button onClick={() => setAddOpen(o => !o)}
          style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          + Add Stock
        </button>
        {holdings.length > 0 && (
          <button onClick={() => fetchPrices(holdings.map(h => h.symbol))} disabled={loading}
            style={{ height:36, padding:'0 12px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            🔄
          </button>
        )}
        {holdings.length > 0 && (
          <button onClick={() => { if (confirm('Clear all US holdings?')) { saveHoldings([]); setPrices({}); } }}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'transparent', border:'1px solid rgba(255,59,92,0.3)', color:'var(--red)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            🗑️ Clear all
          </button>
        )}
      </div>

      {uploadMsg && (
        <div style={{ fontSize:12, color: uploadMsg.startsWith('❌') ? 'var(--red)' : 'var(--grn)', marginBottom:14, padding:'8px 12px', background: uploadMsg.startsWith('❌') ? 'rgba(255,59,92,0.08)' : 'rgba(0,212,160,0.08)', borderRadius:8 }}>
          {uploadMsg}
        </div>
      )}

      {/* Add stock form */}
      {addOpen && (
        <div style={{ ...card, marginBottom:16, display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:'1 1 100px' }}>
            <div style={{ fontSize:10, color:'var(--dim)', marginBottom:4, fontWeight:600 }}>SYMBOL</div>
            <input placeholder="AAPL" value={addForm.symbol} onChange={e => setAddForm(f => ({ ...f, symbol:e.target.value }))}
              style={{ ...inp, width:'100%' }} onKeyDown={e => e.key === 'Enter' && handleAdd()}/>
          </div>
          <div style={{ flex:'1 1 80px' }}>
            <div style={{ fontSize:10, color:'var(--dim)', marginBottom:4, fontWeight:600 }}>SHARES</div>
            <input placeholder="10" type="number" value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty:e.target.value }))}
              style={{ ...inp, width:'100%' }} onKeyDown={e => e.key === 'Enter' && handleAdd()}/>
          </div>
          <div style={{ flex:'1 1 100px' }}>
            <div style={{ fontSize:10, color:'var(--dim)', marginBottom:4, fontWeight:600 }}>AVG COST (USD)</div>
            <input placeholder="182.50" type="number" value={addForm.avg_price} onChange={e => setAddForm(f => ({ ...f, avg_price:e.target.value }))}
              style={{ ...inp, width:'100%' }} onKeyDown={e => e.key === 'Enter' && handleAdd()}/>
          </div>
          <button onClick={handleAdd} style={{ height:38, padding:'0 18px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>Add</button>
          <button onClick={() => setAddOpen(false)} style={{ height:38, padding:'0 12px', borderRadius:8, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
        </div>
      )}

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:'48px 24px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🇺🇸</div>
          <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>No US holdings yet</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Upload a CSV or add stocks manually to track your US portfolio in USD.</div>
          <div style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'16px 20px', display:'inline-block', textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>CSV format</div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.8 }}>
              <div><span style={{ color:'var(--grn)', fontWeight:700 }}>SYMBOL</span>, QUANTITY, AVG_PRICE_USD</div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:8, paddingTop:8 }}>
                AAPL, 10, 182.50<br/>MSFT, 5, 320.00<br/>NVDA, 3, 480.00
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Holdings · {holdings.length} US stocks</div>
            {loading && <span style={{ fontSize:11, color:'var(--dim)' }}>⏳ fetching prices…</span>}
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Shares','Avg Cost','Price','P&L $','P&L %',''].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const p = prices[h.symbol];
                  const cmp = p?.price ?? null;
                  const ratio = cmp != null && h.avg_price >= 0.01 ? cmp / h.avg_price : null;
                  const validCmp = ratio != null && ratio < 100 && ratio > 0.01 ? cmp : null;
                  const pl = validCmp != null && h.avg_price >= 0.01 ? (validCmp - h.avg_price) * h.qty : null;
                  const plPct = pl != null && h.avg_price >= 0.01 ? (validCmp! - h.avg_price) / h.avg_price * 100 : null;
                  const plPos = (pl ?? 0) >= 0;
                  const isEditing = editingId === h.id;
                  return (
                    <tr key={h.id} onClick={() => !isEditing && setSelectedStock(h)}
                      style={{ cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{h.symbol}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>NASDAQ/NYSE</div>
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:13 }}>{h.qty.toLocaleString('en-US')}</td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {isEditing ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleUpdateCost(h.id); if (e.key === 'Escape') setEditingId(null); }}
                              style={{ width:80, height:28, borderRadius:6, background:'var(--surf2)', border:'1px solid var(--blu)', color:'var(--txt)', fontSize:12, padding:'0 6px', fontFamily:'inherit', outline:'none' }}/>
                            <button onClick={() => handleUpdateCost(h.id)} style={{ background:'none', border:'none', color:'var(--grn)', cursor:'pointer', fontSize:13 }}>✓</button>
                            <button onClick={() => setEditingId(null)} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:13 }}>✕</button>
                          </div>
                        ) : (
                          <span style={{ fontSize:13, fontWeight:600, cursor:'pointer' }}
                            onClick={e => { e.stopPropagation(); setEditingId(h.id); setEditVal(String(h.avg_price)); }}>
                            {h.avg_price >= 0.01 ? `$${h.avg_price.toFixed(2)}` : <span style={{ color:'var(--ylw)', fontSize:11 }}>Enter cost</span>}
                          </span>
                        )}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {validCmp != null ? (
                          <>
                            <div style={{ fontSize:13, fontWeight:700 }}>${validCmp.toFixed(2)}</div>
                            {p?.change_pct != null && <div style={{ fontSize:11, color: p.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>{p.change_pct >= 0 ? '+' : ''}{p.change_pct.toFixed(2)}%</div>}
                          </>
                        ) : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {pl != null ? <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{plPos ? '+' : '-'}{fmtUSD(Math.abs(pl))}</div> : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)', whiteSpace:'nowrap' }}>
                        {plPct != null ? <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{plPos ? '+' : ''}{plPct.toFixed(2)}%</div> : <span style={{ color:'var(--dim2)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                        <button onClick={e => { e.stopPropagation(); handleDelete(h.id); }} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14 }} title="Remove">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popular US stocks quick-add */}
      {holdings.length === 0 && (
        <div style={{ ...card, marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Popular US Stocks</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {['AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','JPM','BRK-B','V','JNJ','XOM'].map(sym => (
              <button key={sym} onClick={() => { setAddForm({ symbol:sym, qty:'', avg_price:'' }); setAddOpen(true); }}
                style={{ padding:'5px 12px', borderRadius:20, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock detail modal */}
      {selectedStock && (() => {
        const h = selectedStock;
        const p = prices[h.symbol];
        const cmp = p?.price ?? null;
        const ratio = cmp != null && h.avg_price >= 0.01 ? cmp / h.avg_price : null;
        const validCmp = ratio != null && ratio < 100 && ratio > 0.01 ? cmp : null;
        const pl = validCmp != null && h.avg_price >= 0.01 ? (validCmp - h.avg_price) * h.qty : null;
        const plPct = pl != null ? (validCmp! - h.avg_price) / h.avg_price * 100 : null;
        const plPos = (pl ?? 0) >= 0;
        return (
          <div onClick={() => setSelectedStock(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:20, padding:24, width:'min(480px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900 }}>{h.symbol}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>NASDAQ/NYSE · {h.qty.toLocaleString('en-US')} shares</div>
                </div>
                <button onClick={() => setSelectedStock(null)} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--dim)', fontSize:16 }}>✕</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {[
                  { label:'Avg Cost', val: h.avg_price >= 0.01 ? `$${h.avg_price.toFixed(2)}` : '—', sub:'per share' },
                  { label:'Current Price', val: validCmp != null ? `$${validCmp.toFixed(2)}` : '—',
                    sub: p?.change_pct != null ? `${p.change_pct >= 0 ? '+' : ''}${p.change_pct.toFixed(2)}% today` : '',
                    subC: p?.change_pct != null ? (p.change_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--dim)' },
                  { label:'Invested', val: h.avg_price >= 0.01 ? fmtK(h.avg_price * h.qty) : '—', sub:`${h.qty} × $${h.avg_price.toFixed(2)}` },
                  { label:'Market Value', val: validCmp != null ? fmtK(validCmp * h.qty) : '—', sub:'' },
                ].map(m => (
                  <div key={m.label} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'11px 14px' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600, letterSpacing:0.3, marginBottom:4 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize:16, fontWeight:800 }}>{m.val}</div>
                    {m.sub && <div style={{ fontSize:11, color:(m as { subC?: string }).subC ?? 'var(--dim)', marginTop:2 }}>{m.sub}</div>}
                  </div>
                ))}
              </div>

              {pl != null && (
                <div style={{ background: plPos ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${plPos ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600 }}>UNREALISED P&L</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)', marginTop:2 }}>{plPos ? '+' : '-'}{fmtUSD(Math.abs(pl))}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'var(--dim)', fontWeight:600 }}>RETURN</div>
                    <div style={{ fontSize:22, fontWeight:900, color: plPos ? 'var(--grn)' : 'var(--red)', marginTop:2 }}>{(plPct ?? 0) >= 0 ? '+' : ''}{(plPct ?? 0).toFixed(2)}%</div>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:8, paddingTop:14, borderTop:'1px solid var(--bdr)' }}>
                <button onClick={() => { setEditingId(h.id); setEditVal(String(h.avg_price)); setSelectedStock(null); }}
                  style={{ flex:1, height:36, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  ✏️ Edit Cost
                </button>
                <button onClick={() => { handleDelete(h.id); setSelectedStock(null); }}
                  style={{ flex:1, height:36, borderRadius:9, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.25)', color:'var(--red)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  🗑️ Remove
                </button>
                <button onClick={() => setSelectedStock(null)}
                  style={{ height:36, padding:'0 14px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16, lineHeight:1.6 }}>
        ⚠️ US stock prices from Yahoo Finance · currency in USD · NOT SEBI REGISTERED · informational only · DYOR
      </div>
    </>
  );
}
