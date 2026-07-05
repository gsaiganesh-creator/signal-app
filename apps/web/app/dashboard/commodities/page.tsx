'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTrackerPositions } from '@/lib/use-tracker-positions';
import { TechTiles } from '@/components/TechTiles';
import type { TechMap } from '@/lib/technical-types';
import { decomposeMove } from '@/lib/move-decomposition';

const card: React.CSSProperties = { background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' };
const inp:  React.CSSProperties = { height:36, borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, padding:'0 10px', fontFamily:'inherit', outline:'none' };
const STAT_GRADS = [
  ['linear-gradient(135deg,rgba(255,184,0,0.12),rgba(255,184,0,0.03))','rgba(255,184,0,0.28)'],
  ['linear-gradient(135deg,rgba(0,212,160,0.10),rgba(0,212,160,0.02))','rgba(0,212,160,0.25)'],
  ['linear-gradient(135deg,rgba(255,92,26,0.10),rgba(255,184,0,0.03))','rgba(255,92,26,0.25)'],
] as const;

// Commodity tickers — Yahoo Finance
// Gold futures: GC=F (USD/troy oz), Silver: SI=F, Crude: CL=F, NG: NG=F, Copper: HG=F
// MCX equivalent prices computed as: USD price × USDINR rate
const COMMODITIES = [
  { id:'gold',     name:'Gold',          sym:'GC=F',     unit:'troy oz', inrUnit:'10g', convFn:(usd:number,inr:number) => usd*inr/31.1035*10, emoji:'🥇', color:'#FFB800' },
  { id:'silver',   name:'Silver',        sym:'SI=F',     unit:'troy oz', inrUnit:'1kg', convFn:(usd:number,inr:number) => usd*inr/31.1035*1000, emoji:'🥈', color:'#94A3B8' },
  { id:'crude',    name:'Crude Oil',     sym:'CL=F',     unit:'barrel',  inrUnit:'barrel', convFn:(usd:number,inr:number) => usd*inr, emoji:'🛢️', color:'#64748B' },
  { id:'natgas',   name:'Natural Gas',   sym:'NG=F',     unit:'MMBtu',   inrUnit:'MMBtu', convFn:(usd:number,inr:number) => usd*inr, emoji:'🔥', color:'#FF5C1A' },
  { id:'copper',   name:'Copper',        sym:'HG=F',     unit:'pound',   inrUnit:'kg', convFn:(usd:number,inr:number) => usd*inr*2.20462, emoji:'🔶', color:'#B45309' },
  { id:'aluminium',name:'Aluminium',     sym:'ALI=F',    unit:'pound',   inrUnit:'kg', convFn:(usd:number,inr:number) => usd*inr*2.20462, emoji:'⚙️', color:'#94A3B8' },
];

const USDINR_SYM = 'USDINR=X';

// Position units for each commodity (what "qty" means to the user)
const UNIT_OPTIONS: Record<string, string[]> = {
  gold:      ['grams','tola (11.66g)','kg'],
  silver:    ['grams','kg'],
  crude:     ['barrels','lots (100 bbl)'],
  natgas:    ['MMBtu'],
  copper:    ['kg','lots (1000kg)'],
  aluminium: ['kg','lots (5000kg)'],
};

interface CommodityPosition {
  id: string;
  commodity: string;
  qty: number;
  unit: string;
  avg_price: number; // INR per unit
  note?: string;
}

type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;

// Convert qty+unit to base unit (grams for gold, kg for silver, etc.)
function toBaseGrams(qty: number, unit: string): number {
  if (unit === 'tola (11.66g)') return qty * 11.66;
  if (unit === 'kg') return qty * 1000;
  return qty; // grams or direct
}
function toBaseKg(qty: number, unit: string): number {
  if (unit === 'kg') return qty;
  if (unit.startsWith('lots')) {
    const match = unit.match(/(\d+)/);
    return match ? qty * parseInt(match[1]) : qty;
  }
  return qty;
}
function toBaseBarrels(qty: number, unit: string): number {
  if (unit === 'lots (100 bbl)') return qty * 100;
  return qty;
}

export default function CommoditiesPage() {
  const { positions, addPosition: savePos, deletePosition: removePos } =
    useTrackerPositions<CommodityPosition>('commodity', 'signal_commodity_positions');

  const [prices, setPrices]   = useState<PriceMap>({});
  const [usdInr, setUsdInr]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicals, setTechnicals] = useState<TechMap>({});
  const [expandedCom, setExpandedCom] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ commodity:'gold', qty:'', unit:'grams', avg_price:'', note:'' });
  const [formErr, setFormErr] = useState('');

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const syms = [...COMMODITIES.map(c => c.sym), USDINR_SYM].join(',');
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) {
        const data: PriceMap = await res.json();
        setPrices(data);
        const inr = data[USDINR_SYM]?.price;
        if (inr) setUsdInr(inr);
      }
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const fetchTechnicals = useCallback(async () => {
    try {
      const syms = COMMODITIES.map(c => c.sym).join(',');
      const res = await fetch(`/api/technical?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) setTechnicals(await res.json());
    } catch { /* offline */ }
  }, []);

  useEffect(() => { fetchPrices(); fetchTechnicals(); }, [fetchPrices, fetchTechnicals]);

  function getInrPrice(com: typeof COMMODITIES[0]): number | null {
    const usd = prices[com.sym]?.price;
    if (!usd || !usdInr) return null;
    return com.convFn(usd, usdInr);
  }

  function addPosition() {
    setFormErr('');
    const qty  = parseFloat(form.qty);
    const avg  = parseFloat(form.avg_price);
    if (!form.commodity) { setFormErr('Select commodity'); return; }
    if (isNaN(qty) || qty <= 0) { setFormErr('Enter valid quantity'); return; }
    if (isNaN(avg) || avg <= 0) { setFormErr('Enter avg buy price (₹ per unit)'); return; }
    const pos: CommodityPosition = { id: crypto.randomUUID(), commodity: form.commodity, qty, unit: form.unit, avg_price: avg, note: form.note.trim() || undefined };
    savePos(pos);
    setForm({ commodity:'gold', qty:'', unit:'grams', avg_price:'', note:'' });
    setShowAdd(false);
  }

  function deletePos(id: string) { removePos(id); }

  // Get current INR price per position unit
  function getCurrentInrPerUnit(pos: CommodityPosition): number | null {
    const com = COMMODITIES.find(c => c.id === pos.commodity);
    if (!com) return null;
    const inrPer = getInrPrice(com); // price per base display unit (10g gold, 1kg silver, etc.)
    if (!inrPer) return null;
    // Convert to price per pos.unit
    if (pos.commodity === 'gold') {
      const grams = toBaseGrams(1, pos.unit); // grams in 1 of pos.unit
      return (inrPer / 10) * grams; // inrPer is per 10g, so per gram = /10
    }
    if (pos.commodity === 'silver') {
      const grams = toBaseGrams(1, pos.unit);
      return (inrPer / 1000) * grams; // inrPer is per 1kg = 1000g
    }
    if (pos.commodity === 'crude') return inrPer * toBaseBarrels(1, pos.unit);
    if (pos.commodity === 'copper' || pos.commodity === 'aluminium') {
      return inrPer * toBaseKg(1, pos.unit);
    }
    return inrPer;
  }

  function positionPL(pos: CommodityPosition) {
    const cur = getCurrentInrPerUnit(pos);
    if (!cur) return null;
    const pl = (cur - pos.avg_price) * pos.qty;
    const plPct = (cur - pos.avg_price) / pos.avg_price * 100;
    return { pl, plPct, cur, currentValue: cur * pos.qty };
  }

  const totalInvested = positions.reduce((s, p) => s + p.avg_price * p.qty, 0);
  const totalCurrentVal = positions.reduce((s, p) => { const r = positionPL(p); return r ? s + r.currentValue : s; }, 0);
  const totalPL = totalCurrentVal - (positions.every(p => positionPL(p) !== null) ? totalInvested : 0);

  const unitOpts = UNIT_OPTIONS[form.commodity] ?? ['units'];

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>🥇 Commodities Tracker</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>
            Live futures prices (MCX proxy) · USD/INR: {usdInr ? `₹${usdInr.toFixed(2)}` : '—'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { fetchPrices(); fetchTechnicals(); }} disabled={loading}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: loading ? 0.6 : 1 }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add Position
          </button>
        </div>
      </div>

      {/* Summary */}
      {positions.length > 0 && (
        <div className="g3" style={{ display:'grid', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Invested', val:`₹${totalInvested.toLocaleString('en-IN',{maximumFractionDigits:0})}`, color:'var(--txt)' },
            { label:'Current Value',  val: totalCurrentVal > 0 ? `₹${totalCurrentVal.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—', color:'var(--txt)' },
            { label:'Unrealised P&L', val: totalCurrentVal > 0 ? `${totalPL >= 0 ? '+' : '-'}₹${Math.abs(totalPL).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—', color: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' },
          ].map((m, i) => (
            <div key={m.label} style={{ background:STAT_GRADS[i][0], border:`1px solid ${STAT_GRADS[i][1]}`, borderRadius:16, padding:'18px 20px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'var(--card-shadow)' }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Live Price Cards */}
      <div style={{ ...card, marginBottom:20, borderColor:'rgba(255,184,0,0.20)', background:'linear-gradient(160deg,rgba(255,184,0,0.04),var(--card-bg))' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Live Prices (MCX Proxy via Futures)</div>
          {loading && <span style={{ fontSize:11, color:'var(--dim)' }}>⏳</span>}
        </div>
        <div className="g3" style={{ display:'grid', gap:8 }}>
          {COMMODITIES.map(com => {
            const usdPrice = prices[com.sym]?.price;
            const chg = prices[com.sym]?.change_pct;
            const inrPrice = getInrPrice(com);
            const tech = technicals[com.sym];
            const isOpen = expandedCom === com.id;
            return (
              <div key={com.id} onClick={() => setExpandedCom(isOpen ? null : com.id)}
                style={{ background:'var(--surf2)', border:`1px solid var(--bdr)`, borderRadius:10, padding:'12px 14px', borderLeft:`3px solid ${com.color}`, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:16 }}>{com.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>{com.name}</span>
                  </div>
                  {chg != null && (
                    <span style={{ fontSize:10, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.3, color: com.color }}>
                  {inrPrice != null ? `₹${inrPrice.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                  per {com.inrUnit}
                  {usdPrice ? ` · $${usdPrice.toFixed(2)}/${com.unit}` : ''}
                </div>
                {isOpen && (
                  <>
                    <TechTiles tech={tech} />
                    {(() => {
                      const decomp = decomposeMove(chg ?? null, prices[USDINR_SYM]?.change_pct ?? null);
                      return decomp && (
                        <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>
                          {decomp.narrative}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* My Positions */}
      <div style={{ ...card, borderColor:'rgba(255,92,26,0.18)', background:'linear-gradient(160deg,rgba(255,92,26,0.04),var(--card-bg))' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>My Positions</div>
        {positions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--dim)' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>🥇</div>
            <div style={{ fontSize:13, marginBottom:4 }}>No commodity positions yet</div>
            <div style={{ fontSize:11 }}>Track physical gold, silver, crude oil and more</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Commodity','Qty','Avg Price (₹)','CMP (₹)','Invested','Value','P&L',''].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:'var(--dim)', padding:'5px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const com = COMMODITIES.find(c => c.id === pos.commodity);
                  const pl = positionPL(pos);
                  const plPos = pl ? pl.pl >= 0 : true;
                  return (
                    <tr key={pos.id} style={{ borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                      <td style={{ padding:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:16 }}>{com?.emoji ?? '🔹'}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>{com?.name ?? pos.commodity}</div>
                            {pos.note && <div style={{ fontSize:10, color:'var(--dim)' }}>{pos.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>{pos.qty.toLocaleString('en-IN')} {pos.unit}</td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>₹{pos.avg_price.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{ padding:'10px', whiteSpace:'nowrap' }}>
                        {pl ? (
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>₹{pl.cur.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                            <div style={{ fontSize:10, color: plPos ? 'var(--grn)' : 'var(--red)' }}>{pl.plPct >= 0 ? '▲' : '▼'} {Math.abs(pl.plPct).toFixed(2)}%</div>
                          </div>
                        ) : <span style={{ color:'var(--dim2)' }}>—</span>}
                      </td>
                      <td style={{ padding:'10px', fontSize:13, whiteSpace:'nowrap' }}>₹{(pos.avg_price*pos.qty).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
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

      {/* Add Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:18, padding:24, width:'min(420px,95vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.45)' }}>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:18 }}>Add Commodity Position</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>COMMODITY</div>
                <select value={form.commodity} onChange={e => { setForm(f => ({ ...f, commodity:e.target.value, unit: (UNIT_OPTIONS[e.target.value] ?? ['units'])[0] })); }}
                  style={{ ...inp, width:'100%' }}>
                  {COMMODITIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>QTY</div>
                  <input type="number" placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty:e.target.value }))}
                    style={{ ...inp, width:'100%' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>UNIT</div>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit:e.target.value }))}
                    style={{ ...inp, width:'100%' }}>
                    {unitOpts.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>AVG BUY PRICE (₹ per {form.unit})</div>
                <input type="number" placeholder="e.g. 7500" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price:e.target.value }))}
                  style={{ ...inp, width:'100%' }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', marginBottom:5 }}>NOTE (optional)</div>
                <input placeholder="e.g. SGB, ETF, Physical" value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))}
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
        ⚠️ Prices from COMEX/NYMEX futures via Yahoo Finance · Converted using live USD/INR · NOT MCX official prices · DYOR
      </div>
    </div>
  );
}
