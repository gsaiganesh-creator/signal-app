'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTrackerPositions } from '@/lib/use-tracker-positions';

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' };
const inp:  React.CSSProperties = { height:36, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, padding:'0 10px', fontFamily:'inherit', outline:'none' };
const STAT_GRADS = [
  ['linear-gradient(135deg,rgba(79,111,250,0.12),rgba(23,64,245,0.03))','rgba(79,111,250,0.28)'],
  ['linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))','rgba(0,212,160,0.25)'],
  ['linear-gradient(135deg,rgba(255,92,26,0.10),rgba(255,184,0,0.03))','rgba(255,92,26,0.25)'],
] as const;

// Yahoo Finance tickers for forex vs INR
const LIVE_PAIRS = [
  { code:'USD', name:'US Dollar',         sym:'USDINR=X',  flag:'🇺🇸' },
  { code:'EUR', name:'Euro',              sym:'EURINR=X',  flag:'🇪🇺' },
  { code:'GBP', name:'British Pound',     sym:'GBPINR=X',  flag:'🇬🇧' },
  { code:'JPY', name:'Japanese Yen ×100', sym:'JPYINR=X',  flag:'🇯🇵', scale:100 },
  { code:'AED', name:'UAE Dirham',        sym:'AEDINR=X',  flag:'🇦🇪' },
  { code:'SGD', name:'Singapore Dollar',  sym:'SGDINR=X',  flag:'🇸🇬' },
  { code:'AUD', name:'Australian Dollar', sym:'AUDINR=X',  flag:'🇦🇺' },
  { code:'CAD', name:'Canadian Dollar',   sym:'CADINR=X',  flag:'🇨🇦' },
  { code:'CHF', name:'Swiss Franc',       sym:'CHFINR=X',  flag:'🇨🇭' },
];

interface FxPosition {
  id: string;
  currency: string; // e.g. USD
  amount: number;   // amount in foreign currency
  avg_rate: number; // INR per 1 unit (or 100 for JPY)
  note?: string;
}

type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;

export default function ForexPage() {
  const { positions, addPosition: savePosition, deletePosition: removePosition } =
    useTrackerPositions<FxPosition>('forex', 'signal_forex_positions');

  const [rates, setRates]     = useState<PriceMap>({});
  const [ratesLoading, setRL] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ currency:'USD', amount:'', avg_rate:'', note:'' });
  const [formErr, setFormErr] = useState('');

  const fetchRates = useCallback(async () => {
    setRL(true);
    try {
      const syms = LIVE_PAIRS.map(p => p.sym).join(',');
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) setRates(await res.json());
    } catch { /* offline */ }
    setRL(false);
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  function getRate(sym: string) { return rates[sym]?.price ?? null; }
  function getChg(sym: string)  { return rates[sym]?.change_pct ?? null; }

  function addPosition() {
    setFormErr('');
    const ccy = form.currency.trim().toUpperCase();
    const amt  = parseFloat(form.amount);
    const rate = parseFloat(form.avg_rate);
    if (!ccy) { setFormErr('Choose currency'); return; }
    if (isNaN(amt) || amt <= 0) { setFormErr('Enter valid amount'); return; }
    if (isNaN(rate) || rate <= 0) { setFormErr('Enter avg buy rate (INR per unit)'); return; }
    const pos: FxPosition = { id: crypto.randomUUID(), currency: ccy, amount: amt, avg_rate: rate, note: form.note.trim() || undefined };
    savePosition(pos);
    setForm({ currency:'USD', amount:'', avg_rate:'', note:'' });
    setShowAdd(false);
  }

  function deletePos(id: string) { removePosition(id); }

  // Compute P&L for a position
  function positionPL(pos: FxPosition) {
    const pair = LIVE_PAIRS.find(p => p.code === pos.currency);
    if (!pair) return null;
    const cur = getRate(pair.sym);
    if (!cur) return null;
    // For JPY scale=100: rate is per 100 JPY, so actual per 1 JPY = rate/100
    const scale = pair.scale ?? 1;
    const curPerUnit = cur / scale;
    const pl = (curPerUnit - pos.avg_rate) * pos.amount;
    const plPct = (curPerUnit - pos.avg_rate) / pos.avg_rate * 100;
    const currentValue = curPerUnit * pos.amount;
    return { pl, plPct, currentValue, curPerUnit };
  }

  // Total P&L across all positions
  const totalPL = positions.reduce((s, p) => {
    const r = positionPL(p);
    return r ? s + r.pl : s;
  }, 0);
  const totalInvested = positions.reduce((s, p) => {
    const pair = LIVE_PAIRS.find(x => x.code === p.currency);
    const scale = pair?.scale ?? 1;
    return s + (p.avg_rate / scale) * p.amount;  // wait, avg_rate is already per unit for non-JPY
    // Actually: avg_rate is INR per 1 unit of foreign currency. invested = avg_rate × amount
  }, 0);
  // Recalc correctly
  const totalInvested2 = positions.reduce((s, p) => s + p.avg_rate * p.amount, 0);
  const totalCurrentVal = positions.reduce((s, p) => {
    const r = positionPL(p);
    return r ? s + r.currentValue : s;
  }, 0);

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>💱 Forex Tracker</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>Live rates vs INR · Track your foreign currency holdings</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchRates} disabled={ratesLoading}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: ratesLoading ? 0.6 : 1 }}>
            {ratesLoading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Position
          </button>
        </div>
      </div>

      {/* Summary row — only if positions exist */}
      {positions.length > 0 && (
        <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`₹${totalInvested2.toLocaleString('en-IN',{maximumFractionDigits:0})}`, sub:`${positions.length} positions`, color:'var(--txt)' },
            { label:'Current Value',  val:`₹${totalCurrentVal.toLocaleString('en-IN',{maximumFractionDigits:0})}`, sub:'at live rates', color:'var(--txt)' },
            { label:'Unrealised P&L', val:`${totalPL >= 0 ? '+' : ''}₹${Math.abs(totalPL).toLocaleString('en-IN',{maximumFractionDigits:0})}`,
              sub:`${totalInvested2 > 0 ? `${((totalCurrentVal-totalInvested2)/totalInvested2*100).toFixed(2)}%` : '—'}`,
              color: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map((m, i) => (
            <div key={m.label} style={{ background:STAT_GRADS[i][0], border:`1px solid ${STAT_GRADS[i][1]}`, borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:m.color }}>{m.val}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Live Rates Grid */}
      <div style={{ ...card, marginBottom:20, borderColor:'rgba(79,111,250,0.20)', background:'linear-gradient(160deg,rgba(79,111,250,0.05),var(--card-bg))' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Live Rates vs INR</div>
          {ratesLoading && <span style={{ fontSize:11, color:'var(--dim)' }}>⏳ loading…</span>}
        </div>
        <div className="g3" style={{ display:'grid', gap:8 }}>
          {LIVE_PAIRS.map(pair => {
            const rate = getRate(pair.sym);
            const chg  = getChg(pair.sym);
            const scale = pair.scale ?? 1;
            const displayRate = rate != null ? rate / scale : null;
            return (
              <div key={pair.code} style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{pair.flag}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800 }}>{pair.code}</div>
                    <div style={{ fontSize:10, color:'var(--dim)' }}>{pair.name}</div>
                  </div>
                  {chg != null && (
                    <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </div>
                  )}
                </div>
                <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.3 }}>
                  {displayRate != null ? `₹${displayRate.toFixed(pair.code === 'JPY' ? 4 : 2)}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>per 1 {pair.code}{scale > 1 ? ` (÷${scale})` : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Positions */}
      <div style={{ ...card, borderColor:'rgba(0,212,160,0.18)', background:'linear-gradient(160deg,rgba(0,212,160,0.04),var(--card-bg))' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>My Positions</div>
        {positions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--dim)' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>💱</div>
            <div style={{ fontSize:13, marginBottom:4 }}>No forex positions yet</div>
            <div style={{ fontSize:11 }}>Track USD, EUR, GBP and other currencies vs INR</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Currency','Amount','Avg Rate (₹)','CMP (₹)','Invested','Value','P&L',''].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const pair = LIVE_PAIRS.find(p => p.code === pos.currency);
                  const pl = positionPL(pos);
                  const plPos = pl ? pl.pl >= 0 : true;
                  const invested = pos.avg_rate * pos.amount;
                  const flag = pair?.flag ?? '🌍';
                  return (
                    <tr key={pos.id} style={{ borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                      <td style={{ padding:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:16 }}>{flag}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>{pos.currency}</div>
                            {pos.note && <div style={{ fontSize:10, color:'var(--dim)' }}>{pos.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'10px', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>
                        {pos.amount.toLocaleString('en-IN')} {pos.currency}
                      </td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>₹{pos.avg_rate.toFixed(4)}</td>
                      <td style={{ padding:'10px', whiteSpace:'nowrap' }}>
                        {pl ? (
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>₹{pl.curPerUnit.toFixed(4)}</div>
                            <div style={{ fontSize:10, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                              {plPos ? '▲' : '▼'} {Math.abs(pl.plPct).toFixed(2)}%
                            </div>
                          </div>
                        ) : <span style={{ color:'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>₹{invested.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>
                        {pl ? `₹${pl.currentValue.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                      </td>
                      <td style={{ padding:'10px', whiteSpace:'nowrap' }}>
                        {pl ? (
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                              {plPos ? '+' : '-'}₹{Math.abs(pl.pl).toLocaleString('en-IN',{maximumFractionDigits:0})}
                            </div>
                            <div style={{ fontSize:10, color: plPos ? 'var(--grn)' : 'var(--red)' }}>
                              {pl.plPct >= 0 ? '+' : ''}{pl.plPct.toFixed(2)}%
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding:'10px' }}>
                        <button onClick={() => deletePos(pos.id)} style={{ background:'none', border:'none', color:'var(--dim2)', cursor:'pointer', fontSize:14 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:18, padding:24, width:'min(420px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)' }}>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:18 }}>Add Forex Position</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>CURRENCY</div>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency:e.target.value }))}
                  style={{ ...inp, width:'100%' }}>
                  {LIVE_PAIRS.map(p => <option key={p.code} value={p.code}>{p.flag} {p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>AMOUNT (units of foreign currency)</div>
                <input type="number" placeholder="e.g. 1000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))}
                  style={{ ...inp, width:'100%' }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>AVG BUY RATE (₹ per 1 {form.currency})</div>
                <input type="number" placeholder={form.currency === 'JPY' ? 'e.g. 0.55' : 'e.g. 83.50'} value={form.avg_rate} onChange={e => setForm(f => ({ ...f, avg_rate:e.target.value }))}
                  style={{ ...inp, width:'100%' }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>NOTE (optional)</div>
                <input placeholder="e.g. Forex card, travel money" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))}
                  style={{ ...inp, width:'100%' }} />
              </div>
              {formErr && <div style={{ fontSize:12, color:'var(--red)' }}>⚠ {formErr}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={addPosition}
                  style={{ flex:1, height:38, borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Add Position
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ height:38, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16 }}>
        ⚠️ Rates from Yahoo Finance · Delayed 15-20 min · NOT financial advice · DYOR
      </div>
    </div>
  );
}
