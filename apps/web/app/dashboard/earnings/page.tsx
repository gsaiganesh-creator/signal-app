'use client';
import { usePortfolio } from '@/lib/portfolio-context';

// Stock list is representative of large-cap earnings season companies.
// No free reliable API exists for NSE earnings calendar — dates are auto-computed
// for the current / upcoming week, stocks are illustrative examples.
const WEEK_STOCKS = [
  { icon:'TC', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'TCS',        sector:'IT'      },
  { icon:'IN', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'INFY',       sector:'IT'      },
  { icon:'HD', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'HDFCBANK',   sector:'Banking' },
  { icon:'IC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'ICICIBANK',  sector:'Banking' },
  { icon:'RL', iconBg:'rgba(255,92,26,0.12)',  iconColor:'var(--org)',  sym:'RELIANCE',   sector:'Energy'  },
  { icon:'SB', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'SBIN',       sector:'Banking' },
  { icon:'BF', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'BAJFINANCE', sector:'NBFC'    },
  { icon:'WP', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'WIPRO',      sector:'IT'      },
  { icon:'TM', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'TATAMOTORS', sector:'Auto'    },
  { icon:'HC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'HCLTECH',    sector:'IT'      },
  { icon:'MR', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'MARUTI',     sector:'Auto'    },
  { icon:'AS', iconBg:'rgba(255,184,0,0.12)',  iconColor:'var(--ylw)',  sym:'ASIANPAINT', sector:'Consumer'},
  { icon:'ZM', iconBg:'rgba(255,59,92,0.12)',  iconColor:'var(--red)',  sym:'ZOMATO',     sector:'Consumer'},
  { icon:'LT', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'LT',         sector:'Infra'   },
  { icon:'NN', iconBg:'rgba(255,184,0,0.12)',  iconColor:'var(--ylw)',  sym:'NESTLEIND',  sector:'FMCG'    },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getWeekDates(offsetWeeks = 0): Date[] {
  const today = new Date();
  const dow   = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  return [0,1,2,3,4].map(i => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

function quarterLabel(): string {
  const m = new Date().getMonth() + 1; // 1-12
  if (m >= 4 && m <= 6)  return 'Q1 FY' + (new Date().getFullYear() - 1999);
  if (m >= 7 && m <= 9)  return 'Q2 FY' + (new Date().getFullYear() - 1999);
  if (m >= 10 && m <= 12) return 'Q3 FY' + (new Date().getFullYear() - 1999);
  return 'Q4 FY' + (new Date().getFullYear() - 1999);
}

// Distribute stocks across Mon-Fri pseudo-randomly (stable by sym hash)
function distribute(stocks: typeof WEEK_STOCKS, dates: Date[]) {
  const buckets: { date: Date; items: typeof WEEK_STOCKS }[] = dates.map(d => ({ date: d, items: [] }));
  stocks.forEach((s, i) => { buckets[i % 5].items.push(s); });
  return buckets.filter(b => b.items.length > 0);
}

export default function EarningsCalendarPage() {
  const { symbols, portfolios } = usePortfolio();
  const hasPortfolio = portfolios.length > 0;
  const quarter = quarterLabel();

  const thisWeek = getWeekDates(0);
  const nextWeek = getWeekDates(1);

  const stocks = WEEK_STOCKS.map(s => ({ ...s, portfolio: symbols.includes(s.sym), meta:`${s.sector} · ${quarter}` }));
  const thisWeekBuckets = distribute(stocks.slice(0, 10), thisWeek);
  const nextWeekBuckets = distribute(stocks.slice(10),   nextWeek);

  const filteredThis = hasPortfolio
    ? thisWeekBuckets.map(b => ({ ...b, items: b.items.filter(i => symbols.includes(i.sym)) })).filter(b => b.items.length > 0)
    : thisWeekBuckets;

  return (
    <>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Earnings Calendar</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
          {quarter} results season · <span style={{ background:'rgba(255,184,0,0.12)', color:'var(--ylw)', padding:'1px 7px', borderRadius:4, fontSize:11, fontWeight:700 }}>⚠️ In Portfolio</span> = stocks you hold
        </div>
      </div>

      <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'13px 16px', marginBottom:20 }}>
        <div style={{ fontSize:13, color:'rgba(255,184,0,0.9)', lineHeight:1.6 }}>
          ⚠️ <strong>Earnings flag active:</strong> SIGNAL reduces signal confidence by 15–30% for stocks with results due within 5 days.
          <span style={{ display:'block', marginTop:4, fontSize:11, color:'var(--dim)' }}>📋 Illustrative schedule — actual dates at nseindia.com/companies-listing/corporate-filings-financial-results</span>
        </div>
      </div>

      {hasPortfolio && filteredThis.length === 0 && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:'24px', marginBottom:20, textAlign:'center', color:'var(--dim)' }}>
          No tracked earnings this week for stocks in your portfolio.
        </div>
      )}

      {/* This week */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        This Week · {fmtDate(thisWeek[0])} – {fmtDate(thisWeek[4])}
      </div>
      <div className="g3-earnings" style={{ display:'grid', gap:14, marginBottom:24 }}>
        {filteredThis.map(day => (
          <div key={day.date.toISOString()} style={{ background:'linear-gradient(160deg,rgba(79,111,250,0.05),var(--card-bg))', border:'1px solid rgba(79,111,250,0.18)', borderRadius:16, overflow:'hidden', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
            <div style={{ padding:'12px 16px', background:'rgba(79,111,250,0.07)', borderBottom:'1px solid rgba(79,111,250,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:800 }}>{DAY_LABELS[day.date.getDay()-1]} · {fmtDate(day.date)}</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>{day.items.length} result{day.items.length !== 1 ? 's' : ''}</span>
            </div>
            {day.items.map((item, i) => (
              <div key={item.sym} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom: i < day.items.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, flexShrink:0, background:item.iconBg, color:item.iconColor }}>{item.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{item.sym}</div>
                  <div style={{ fontSize:10.5, color:'var(--dim)' }}>{item.meta}</div>
                </div>
                {item.portfolio && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)', whiteSpace:'nowrap' }}>⚠️ Portfolio</span>
                )}
              </div>
            ))}
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
            <span key={s.sym} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, background:s.iconBg, color:s.iconColor, border:`1px solid ${s.iconBg.replace('0.12','0.3')}` }}>
              {s.sym}
            </span>
          ))}
        </div>
      </div>

      {/* ML risk panel */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.09),rgba(139,92,246,0.04))', border:'1px solid rgba(23,64,245,0.24)', borderRadius:16, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🎯 Earnings Risk Guide</div>
        <div className="g2" style={{ display:'grid', gap:10 }}>
          <div style={{ padding:12, background:'rgba(0,212,160,0.06)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:3 }}>IT sector — {quarter}</div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55 }}>TCS/INFY historically beat 78–80% of quarters. Avg post-result move: +3–4%. Signals show reduced confidence ±5 days around result date.</div>
          </div>
          <div style={{ padding:12, background:'rgba(255,59,92,0.05)', border:'1px solid rgba(255,59,92,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:3 }}>High-beta / NBFC — volatile</div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.55 }}>BAJFINANCE, ZOMATO: avg post-result swing ±6–8%. SIGNAL applies -25% confidence penalty. Avoid new entries 3 days before result.</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Schedule is illustrative · Verify actual dates at NSE · Not financial advice · DYOR
      </div>
    </>
  );
}
