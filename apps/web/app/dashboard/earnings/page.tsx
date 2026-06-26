'use client';
import { usePortfolio } from '@/lib/portfolio-context';

const DAYS = [
  {
    date:'Mon · Jun 23', count:'4 results',
    items:[
      { icon:'TC', iconBg:'rgba(0,212,160,0.12)', iconColor:'var(--grn)',  sym:'TCS',        meta:'IT · Q1 FY27',       portfolio:true },
      { icon:'IN', iconBg:'rgba(23,64,245,0.12)', iconColor:'var(--bluL)', sym:'INFY',       meta:'IT · Q1 FY27',       portfolio:true },
      { icon:'AS', iconBg:'rgba(255,184,0,0.12)', iconColor:'var(--ylw)',  sym:'ASIANPAINT', meta:'Consumer · Q1 FY27', portfolio:false },
      { icon:'ZM', iconBg:'rgba(255,59,92,0.12)', iconColor:'var(--red)',  sym:'ZOMATO',     meta:'Consumer · Q1 FY27', portfolio:true },
    ],
  },
  {
    date:'Tue · Jun 24', count:'3 results',
    items:[
      { icon:'HD', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'HDFCBANK', meta:'Banking · Q1 FY27', portfolio:true },
      { icon:'IC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'ICICIBANK', meta:'Banking · Q1 FY27', portfolio:false },
      { icon:'MR', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)', sym:'MARUTI',    meta:'Auto · Q1 FY27',    portfolio:false },
    ],
  },
  {
    date:'Wed · Jun 25', count:'5 results',
    items:[
      { icon:'RL', iconBg:'rgba(255,92,26,0.12)',  iconColor:'var(--org)',  sym:'RELIANCE',   meta:'Energy · Q1 FY27', portfolio:true },
      { icon:'SB', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)',  sym:'SBIN',       meta:'Banking · Q1 FY27', portfolio:true },
      { icon:'BF', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'BAJFINANCE', meta:'NBFC · Q1 FY27',    portfolio:false },
      { icon:'WP', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'WIPRO',      meta:'IT · Q1 FY27',      portfolio:false },
    ],
  },
  {
    date:'Thu · Jun 26', count:'2 results',
    items:[
      { icon:'TM', iconBg:'rgba(0,212,160,0.12)',  iconColor:'var(--grn)', sym:'TATAMOTORS', meta:'Auto · Q1 FY27', portfolio:true },
      { icon:'MH', iconBg:'rgba(255,59,92,0.12)',  iconColor:'var(--red)', sym:'M&M',        meta:'Auto · Q1 FY27', portfolio:false },
    ],
  },
  {
    date:'Fri · Jun 27', count:'3 results',
    items:[
      { icon:'HC', iconBg:'rgba(139,92,246,0.12)', iconColor:'var(--pur)',  sym:'HCLTECH',  meta:'IT · Q1 FY27',   portfolio:false },
      { icon:'NN', iconBg:'rgba(255,184,0,0.12)',  iconColor:'var(--ylw)',  sym:'NESTLEIND', meta:'FMCG · Q1 FY27', portfolio:false },
      { icon:'LT', iconBg:'rgba(23,64,245,0.12)',  iconColor:'var(--bluL)', sym:'LT',        meta:'Infra · Q1 FY27', portfolio:false },
    ],
  },
];

export default function EarningsCalendarPage() {
  const { symbols, portfolios } = usePortfolio();
  const hasPortfolio = portfolios.length > 0;
  const filteredDays = hasPortfolio
    ? DAYS.map(d => ({ ...d, items: d.items.filter(i => symbols.includes(i.sym)) })).filter(d => d.items.length > 0)
    : DAYS;

  return (
    <>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Earnings Calendar</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
          Upcoming quarterly results · <span style={{ background:'rgba(255,184,0,0.12)', color:'var(--ylw)', padding:'1px 7px', borderRadius:4, fontSize:11, fontWeight:700 }}>⚠️ In Portfolio</span> = stocks you hold
        </div>
      </div>

      <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:'13px 16px', marginBottom:20 }}>
        <div style={{ fontSize:13, color:'rgba(255,184,0,0.9)', lineHeight:1.6 }}>
          ⚠️ <strong>Earnings flag active:</strong> SIGNAL reduces signal confidence by 15–30% for stocks with results due within 5 days. High uncertainty around earnings events.
        </div>
      </div>

      {hasPortfolio && filteredDays.length === 0 && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:12, padding:'24px', marginBottom:20, textAlign:'center', color:'var(--dim)' }}>
          No earnings this week for stocks in your portfolio.
        </div>
      )}

      {/* Calendar grid */}
      <div className="g3-earnings" style={{ display:'grid', gap:14, marginBottom:24 }}>
        {filteredDays.map(day => (
          <div key={day.date} style={{ background:'linear-gradient(160deg,rgba(79,111,250,0.05),var(--card-bg))', border:'1px solid rgba(79,111,250,0.18)', borderRadius:16, overflow:'hidden', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
            <div style={{ padding:'12px 16px', background:'rgba(79,111,250,0.07)', borderBottom:'1px solid rgba(79,111,250,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:800 }}>{day.date}</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>{day.count}</span>
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
        <div style={{ background:'linear-gradient(160deg,rgba(139,92,246,0.05),var(--card-bg))', border:'1px solid rgba(139,92,246,0.18)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'rgba(139,92,246,0.07)', borderBottom:'1px solid rgba(139,92,246,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--dim)' }}>Next Week</div>
            <span style={{ fontSize:11, color:'var(--dim)' }}>12+ results</span>
          </div>
          <div style={{ padding:20, textAlign:'center', color:'var(--dim)', fontSize:13 }}>
            More earnings loading…<br/><br/>
            <a href="#" style={{ color:'var(--bluL)', fontWeight:600 }}>View full calendar →</a>
          </div>
        </div>
      </div>

      {/* ML predictions */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.09),rgba(139,92,246,0.04))', border:'1px solid rgba(23,64,245,0.24)', borderRadius:16, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🎯 ML Earnings Prediction</div>
        <div className="g2" style={{ display:'grid', gap:10 }}>
          <div style={{ padding:12, background:'rgba(0,212,160,0.06)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:3 }}>TCS · Jun 23</div>
            <div style={{ fontSize:11, color:'var(--dim)' }}>Historical beat rate: 80% · Expected: Beat<br/>Avg post-results move: +3.4%</div>
          </div>
          <div style={{ padding:12, background:'rgba(255,59,92,0.05)', border:'1px solid rgba(255,59,92,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:3 }}>ZOMATO · Jun 23</div>
            <div style={{ fontSize:11, color:'var(--dim)' }}>Historical beat rate: 45% · Volatile stock<br/>Avg post-results swing: ±7.8%</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Earnings predictions are probabilistic estimates · Not financial advice · DYOR
      </div>
    </>
  );
}
