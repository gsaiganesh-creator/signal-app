'use client';
import { useState, useEffect } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const WEEK_STOCKS = [
  { icon:'TC', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'TCS',        sector:'IT'       },
  { icon:'IN', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'INFY',        sector:'IT'       },
  { icon:'HD', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'HDFCBANK',    sector:'Banking'  },
  { icon:'IC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'ICICIBANK',   sector:'Banking'  },
  { icon:'RL', iconBg:'rgba(255,92,26,0.12)',  iconColor:'var(--org)',  sym:'RELIANCE',    sector:'Energy'   },
  { icon:'SB', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'SBIN',        sector:'Banking'  },
  { icon:'BF', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'BAJFINANCE',  sector:'NBFC'     },
  { icon:'WP', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'WIPRO',       sector:'IT'       },
  { icon:'TM', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'TATAMOTORS',  sector:'Auto'     },
  { icon:'HC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'HCLTECH',     sector:'IT'       },
  { icon:'MR', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'MARUTI',      sector:'Auto'     },
  { icon:'AS', iconBg:'rgba(255,184,0,0.12)',  iconColor:'var(--ylw)',  sym:'ASIANPAINT',  sector:'Consumer' },
  { icon:'ZM', iconBg:'rgba(255,59,92,0.12)',  iconColor:'var(--red)',  sym:'ZOMATO',      sector:'Consumer' },
  { icon:'LT', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'LT',          sector:'Infra'    },
  { icon:'NN', iconBg:'rgba(255,184,0,0.12)',  iconColor:'var(--ylw)',  sym:'NESTLEIND',   sector:'FMCG'     },
];

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri'];

function getWeekDates(offsetWeeks = 0): Date[] {
  const today  = new Date();
  const dow    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  return [0,1,2,3,4].map(i => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}
function fmtDate(d: Date) { return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }); }
function quarterLabel() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m >= 4 && m <= 6)  return `Q1 FY${y - 1999}`;
  if (m >= 7 && m <= 9)  return `Q2 FY${y - 1999}`;
  if (m >= 10 && m <= 12) return `Q3 FY${y - 1999}`;
  return `Q4 FY${y - 1999}`;
}
function distribute<T extends { sym: string }>(stocks: T[], dates: Date[]): { date: Date; items: T[] }[] {
  const buckets: { date: Date; items: T[] }[] = dates.map(d => ({ date: d, items: [] }));
  stocks.forEach((s, i) => { buckets[i % 5].items.push(s); });
  return buckets.filter(b => b.items.length > 0);
}
function fmtINR(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

interface LivePrice { price: number; change_pct: number; }

export default function EarningsCalendarPage() {
  const { symbols, holdings } = usePortfolio();
  const quarter    = quarterLabel();
  const thisWeek   = getWeekDates(0);
  const nextWeek   = getWeekDates(1);

  // Live prices for portfolio holdings that report this week
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [priceLoading, setPriceLoading] = useState(false);

  const thisWeekSyms = new Set(WEEK_STOCKS.slice(0, 10).map(s => s.sym));
  const atRisk = holdings.filter(h => thisWeekSyms.has(h.symbol) && h.avg_price >= 1);

  useEffect(() => {
    if (!atRisk.length) return;
    setPriceLoading(true);
    const tickers = atRisk.map(h => h.symbol + '.NS').join(',');
    fetch(`/api/prices?symbols=${encodeURIComponent(tickers)}`)
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, LivePrice>) => {
        // remap .NS → plain symbol
        const mapped: Record<string, LivePrice> = {};
        for (const [k, v] of Object.entries(data)) mapped[k.replace('.NS','')] = v;
        setLivePrices(mapped);
        setPriceLoading(false);
      })
      .catch(() => setPriceLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]);

  const stocks          = WEEK_STOCKS.map(s => ({ ...s, inPortfolio: symbols.includes(s.sym), meta:`${s.sector} · ${quarter}` }));
  const thisWeekBuckets = distribute(stocks.slice(0, 10), thisWeek);
  const nextWeekBuckets = distribute(stocks.slice(10),    nextWeek);

  // Total exposure: sum of current value for at-risk holdings
  const totalExposure = atRisk.reduce((s, h) => {
    const cur = livePrices[h.symbol]?.price ?? h.avg_price;
    return s + cur * h.qty;
  }, 0);
  const totalPL = atRisk.reduce((s, h) => {
    const cur = livePrices[h.symbol]?.price ?? h.avg_price;
    return s + (cur - h.avg_price) * h.qty;
  }, 0);

  return (
    <>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Earnings Calendar</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
          {quarter} results season · <span style={{ background:'rgba(255,184,0,0.12)', color:'var(--ylw)', padding:'1px 7px', borderRadius:4, fontSize:11, fontWeight:700 }}>⚠️ In Portfolio</span> = stocks you hold
        </div>
      </div>

      {/* ── Portfolio at risk banner ── */}
      {atRisk.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(255,92,26,0.08),rgba(255,184,0,0.05))', border:'1px solid rgba(255,92,26,0.3)', borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--org)' }}>
                🔔 {atRisk.length} portfolio stock{atRisk.length > 1 ? 's' : ''} reporting this week
              </div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>
                Total exposure: <strong style={{ color:'var(--txt)' }}>{fmtINR(totalExposure)}</strong>
                {' · '}P&L on these: <strong style={{ color: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {totalPL >= 0 ? '+' : '-'}{fmtINR(totalPL)}
                </strong>
                {priceLoading && <span style={{ color:'var(--dim2)', marginLeft:6, fontSize:11 }}>fetching live prices…</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {atRisk.map(h => {
              const lp      = livePrices[h.symbol];
              const curP    = lp?.price ?? h.avg_price;
              const pl      = (curP - h.avg_price) * h.qty;
              const plPct   = h.avg_price > 0 ? ((curP - h.avg_price) / h.avg_price) * 100 : 0;
              const up      = pl >= 0;
              // Action suggestion
              const action  = plPct > 15
                ? { text:'Consider booking partial profits before results', color:'var(--ylw)' }
                : plPct < -10
                ? { text:'SL already hit territory — reassess before results', color:'var(--red)' }
                : { text:'Hold — monitor post-result reaction', color:'var(--grn)' };
              return (
                <div key={h.id} style={{ background:'rgba(0,0,0,0.15)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ fontSize:13, fontWeight:800, minWidth:90 }}>{h.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', flex:1, minWidth:120 }}>
                    {h.qty} qty · avg ₹{h.avg_price.toLocaleString('en-IN', { maximumFractionDigits:1 })}
                    {lp && <span> · now ₹{lp.price.toLocaleString('en-IN', { maximumFractionDigits:1 })} <span style={{ color: lp.change_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>({lp.change_pct >= 0 ? '+' : ''}{lp.change_pct?.toFixed(2)}%)</span></span>}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color: up ? 'var(--grn)' : 'var(--red)', minWidth:80, textAlign:'right' }}>
                    {up ? '+' : '-'}{fmtINR(pl)} ({up ? '+' : ''}{plPct.toFixed(1)}%)
                  </div>
                  <div style={{ width:'100%', fontSize:11, color:action.color, display:'flex', alignItems:'center', gap:5 }}>
                    → {action.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earnings flag notice */}
      <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'13px 16px', marginBottom:20 }}>
        <div style={{ fontSize:13, color:'rgba(255,184,0,0.9)', lineHeight:1.6 }}>
          ⚠️ <strong>Earnings flag active:</strong> SIGNAL reduces signal confidence 15–30% for stocks with results due within 5 days.
          <span style={{ display:'block', marginTop:4, fontSize:11, color:'var(--dim)' }}>📋 Illustrative schedule — verify actual dates at nseindia.com</span>
        </div>
      </div>

      {/* This week calendar */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        This Week · {fmtDate(thisWeek[0])} – {fmtDate(thisWeek[4])}
      </div>
      <div className="g3-earnings" style={{ display:'grid', gap:14, marginBottom:24 }}>
        {thisWeekBuckets.map(day => (
          <div key={day.date.toISOString()} style={{ background:'linear-gradient(160deg,rgba(79,111,250,0.05),var(--card-bg))', border:'1px solid rgba(79,111,250,0.18)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'rgba(79,111,250,0.07)', borderBottom:'1px solid rgba(79,111,250,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:800 }}>{DAY_LABELS[day.date.getDay()-1]} · {fmtDate(day.date)}</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>{day.items.length} result{day.items.length !== 1 ? 's' : ''}</span>
            </div>
            {day.items.map((item, i) => {
              const holding = holdings.find(h => h.symbol === item.sym && h.avg_price >= 1);
              const lp = livePrices[item.sym];
              const pl = holding && lp ? (lp.price - holding.avg_price) * holding.qty : null;
              return (
                <div key={item.sym} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom: i < day.items.length - 1 ? '1px solid var(--bdr)' : 'none', background: item.inPortfolio ? 'rgba(255,184,0,0.03)' : 'transparent' }}>
                  <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, flexShrink:0, background:item.iconBg, color:item.iconColor }}>{item.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{item.sym}</div>
                    <div style={{ fontSize:10.5, color:'var(--dim)' }}>{item.meta}</div>
                    {holding && lp && (
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                        {holding.qty} qty · ₹{lp.price.toLocaleString('en-IN', { maximumFractionDigits:1 })}
                        <span style={{ color: lp.change_pct >= 0 ? 'var(--grn)' : 'var(--red)', marginLeft:4 }}>
                          {lp.change_pct >= 0 ? '+' : ''}{lp.change_pct?.toFixed(2)}% today
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    {item.inPortfolio && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)', whiteSpace:'nowrap' }}>⚠️ Portfolio</span>
                    )}
                    {pl != null && (
                      <span style={{ fontSize:10, fontWeight:700, color: pl >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                        {pl >= 0 ? '+' : '-'}{fmtINR(pl)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Next week */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        Next Week · {fmtDate(nextWeek[0])} – {fmtDate(nextWeek[4])}
      </div>
      <div style={{ background:'linear-gradient(160deg,rgba(139,92,246,0.05),var(--card-bg))', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, overflow:'hidden', marginBottom:24 }}>
        <div style={{ padding:'12px 16px', background:'rgba(139,92,246,0.07)', borderBottom:'1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ fontSize:13, fontWeight:800 }}>{fmtDate(nextWeek[0])} – {fmtDate(nextWeek[4])}</div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:14 }}>
          {nextWeekBuckets.flatMap(b => b.items).map(s => (
            <span key={s.sym} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, background:s.iconBg, color:s.iconColor, border:`1px solid ${s.iconBg.replace('0.12','0.3')}`, position:'relative' }}>
              {s.sym}
              {symbols.includes(s.sym) && <span style={{ position:'absolute', top:-4, right:-4, width:8, height:8, borderRadius:'50%', background:'var(--ylw)', border:'1px solid var(--bg)' }} />}
            </span>
          ))}
        </div>
        <div style={{ padding:'0 14px 12px', fontSize:11, color:'var(--dim2)' }}>
          Gold dot = you hold this stock
        </div>
      </div>

      {/* Earnings risk guide */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.09),rgba(139,92,246,0.04))', border:'1px solid rgba(23,64,245,0.24)', borderRadius:16, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🎯 Earnings Risk Guide</div>
        <div className="g2" style={{ display:'grid', gap:10 }}>
          <div style={{ padding:12, background:'rgba(0,212,160,0.06)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:3 }}>IT sector — {quarter}</div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55 }}>TCS/INFY historically beat 78–80% of quarters. Avg post-result move: +3–4%. Signals reduced ±5 days.</div>
          </div>
          <div style={{ padding:12, background:'rgba(255,59,92,0.05)', border:'1px solid rgba(255,59,92,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:3 }}>High-beta / NBFC — volatile</div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55 }}>BAJFINANCE, ZOMATO: avg swing ±6–8% post-result. SIGNAL applies -25% confidence. Avoid new entries 3 days before.</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Schedule illustrative · Verify at NSE · DYOR
      </div>
    </>
  );
}
