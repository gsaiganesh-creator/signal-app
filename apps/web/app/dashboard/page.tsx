'use client';
import Link from 'next/link';
import { usePortfolio } from '@/lib/portfolio-context';

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' };

const ALL_SIGNALS = [
  { sig:'BUY',  sym:'RELIANCE',   time:'09:32', note:'RSI=34.2 · EMA20>EMA50 · Del.%=66 · Conf. 87%', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
  { sig:'BUY',  sym:'TATAMOTORS', time:'09:31', note:'RF score 0.81 · Vol 2.4× avg · Sector momentum ▲', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
  { sig:'SELL', sym:'ZOMATO',     time:'09:30', note:'RSI=71 · Below EMA50 · FII net sell · Conf. 74%', sc:'var(--red)', sbg:'rgba(255,59,92,0.12)' },
  { sig:'BUY',  sym:'TCS',        time:'09:28', note:'RSI=42 · Golden cross · Conf. 79%', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
  { sig:'BUY',  sym:'HDFCBANK',   time:'09:25', note:'RSI=38 · Near EMA50 · Conf. 72%', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
  { sig:'SELL', sym:'INFY',       time:'09:20', note:'RSI=72 · Overbought · Conf. 68%', sc:'var(--red)', sbg:'rgba(255,59,92,0.12)' },
  { sig:'HOLD', sym:'SBIN',       time:'09:18', note:'RSI=52 · Range-bound · Conf. 61%', sc:'var(--ylw)', sbg:'rgba(255,184,0,0.12)' },
  { sig:'BUY',  sym:'MARUTI',     time:'09:15', note:'RSI=44 · Sector tailwind · Conf. 76%', sc:'var(--grn)', sbg:'rgba(0,212,160,0.12)' },
];

function MarketOverview() {
  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>Market Overview</div>
        <span style={{ fontSize:11, color:'var(--grn)', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
          <span className="live-dot"/>Live
        </span>
      </div>
      <div className="g2" style={{ display:'grid', gap:10 }}>
        {[
          { name:'NIFTY 50',   val:'24,812', chg:'▲ +112 (+0.45%)', up:true,  pts:'0,22 15,18 30,20 45,14 60,10 75,8 85,6 100,4' },
          { name:'SENSEX',     val:'81,540', chg:'▲ +384 (+0.47%)', up:true,  pts:'0,24 20,20 40,22 55,16 70,11 85,7 100,5' },
          { name:'BANK NIFTY', val:'53,240', chg:'▼ -88 (-0.17%)',  up:false, pts:'0,8 20,10 40,8 55,12 70,16 85,18 100,20' },
          { name:'NIFTY IT',   val:'38,120', chg:'▲ +420 (+1.12%)', up:true,  pts:'0,26 15,22 30,18 45,15 60,10 75,7 90,5 100,3' },
        ].map(m => (
          <div key={m.name} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:11, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:4 }}>{m.name}</div>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.5 }}>{m.val}</div>
            <div style={{ fontSize:12, fontWeight:700, marginTop:3, color: m.up ? 'var(--grn)' : 'var(--red)' }}>{m.chg}</div>
            <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
              <polyline points={m.pts} fill="none" stroke={m.up ? '#00D4A0' : '#FF3B5C'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeEmpty({ name }: { name: string }) {
  return (
    <>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Welcome to SIGNAL. Set up your portfolio to unlock AI signals and P&L tracking.</div>
      </div>

      {/* Upload CTA */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ fontSize:19, fontWeight:800, marginBottom:6 }}>📂 Upload your portfolio to get started</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>Add your holdings once — SIGNAL tracks P&L, signals and risk automatically.</div>
        <div className="g3" style={{ display:'grid', gap:16, marginBottom:28 }}>
          {[
            { n:'1', t:'Download the template', d:'CSV with Symbol, Qty, Avg Price, Exchange columns' },
            { n:'2', t:'Fill your holdings', d:'Add every stock you currently hold' },
            { n:'3', t:'Upload & get signals', d:'AI classifies each holding instantly' },
          ].map(s => (
            <div key={s.n} style={{ display:'flex', gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blu)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{s.t}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:2, lineHeight:1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <a href="data:text/csv;charset=utf-8,SYMBOL%2CQUANTITY%2CAVG_PRICE%2CEXCHANGE%0ARELIANCE%2C50%2C2800%2CNSE%0AHDFCBANK%2C30%2C1580%2CNSE%0ATCS%2C20%2C3700%2CNSE"
            download="signal-portfolio-template.csv"
            style={{ height:40, padding:'0 20px', borderRadius:10, background:'var(--surf)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>
            ↓ Download Template
          </a>
          <Link href="/dashboard/portfolio"
            style={{ height:40, padding:'0 24px', borderRadius:10, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            📤 Upload Portfolio →
          </Link>
        </div>
      </div>

      {/* Feature teasers */}
      <div className="g3" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {[
          { icon:'🤖', t:'AI Signals', d:'BUY/SELL/HOLD on every portfolio stock. RSI, EMA, delivery %, ML-classified.' },
          { icon:'📊', t:'P&L Tracker', d:'Live unrealised gains, category buckets — Momentum, Swing, Long-Term, Exit Now.' },
          { icon:'⚠️', t:'Risk Alerts', d:'Earnings flags, FII/DII flow impact, sector concentration warnings.' },
        ].map(f => (
          <div key={f.t} style={card}>
            <div style={{ fontSize:24, marginBottom:10 }}>{f.icon}</div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{f.d}</div>
          </div>
        ))}
      </div>

      <MarketOverview />
    </>
  );
}

export default function DashboardPage() {
  const { user, portfolios, holdings, activePortfolio, loading } = usePortfolio();

  const name = (
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Trader'
  );

  if (loading) {
    return (
      <div style={{ padding:'80px 0', textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>⏳</div>
        <div style={{ fontSize:14, color:'#4A5C7A' }}>Loading your dashboard…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding:'48px 0', textAlign:'center' }}>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Session expired</div>
        <div style={{ fontSize:13, color:'#4A5C7A', marginBottom:20 }}>Please sign in again.</div>
        <a href="/sign-in" style={{ padding:'10px 24px', borderRadius:10, background:'#1740F5', color:'#fff', fontWeight:700, fontSize:14 }}>Sign In</a>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return <WelcomeEmpty name={name} />;
  }

  const invested = holdings.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const symbols = holdings.map(h => h.symbol);
  const signals = ALL_SIGNALS.filter(s => symbols.includes(s.sym));
  const buyCount  = signals.filter(s => s.sig === 'BUY').length;
  const sellCount = signals.filter(s => s.sig === 'SELL').length;

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>{greet()}, {name} 👋</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}
            · NIFTY futures <span style={{ color:'var(--grn)', fontWeight:600 }}>+0.4%</span>
          </div>
        </div>
        <Link href="/dashboard/portfolio"
          style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          📊 View Full P&L
        </Link>
      </div>

      {/* Metrics */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>{activePortfolio?.name}</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{holdings.length} stocks</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>across your portfolio</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Total Invested</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>₹{invested.toLocaleString('en-IN', { maximumFractionDigits:0 })}</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>cost basis</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Signals · Your Stocks</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1 }}>{signals.length}</div>
          <div style={{ display:'flex', gap:5, marginTop:5 }}>
            {buyCount > 0 && <span style={{ padding:'2px 7px', borderRadius:4, background:'rgba(0,212,160,0.12)', color:'var(--grn)', fontSize:11, fontWeight:700 }}>{buyCount} BUY</span>}
            {sellCount > 0 && <span style={{ padding:'2px 7px', borderRadius:4, background:'rgba(255,59,92,0.12)', color:'var(--red)', fontSize:11, fontWeight:700 }}>{sellCount} SELL</span>}
            {signals.length === 0 && <span style={{ fontSize:11, color:'var(--dim2)' }}>no signals today</span>}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--dim)', letterSpacing:0.3, marginBottom:6 }}>Signal Accuracy (90d)</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1, color:'var(--grn)' }}>71.4%</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:5 }}>50/70 signals hit target</div>
        </div>
      </div>

      {/* Holdings chips */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>{activePortfolio?.name} · Holdings</div>
          <Link href="/dashboard/portfolio" style={{ fontSize:12, color:'var(--bluL)', fontWeight:600 }}>View details & live P&L →</Link>
        </div>
        {holdings.length === 0 ? (
          <div style={{ color:'var(--dim)', fontSize:13 }}>No holdings yet. <Link href="/dashboard/portfolio" style={{ color:'var(--bluL)', fontWeight:600 }}>Upload portfolio →</Link></div>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {holdings.map(h => (
              <div key={h.id} style={{ padding:'5px 12px', borderRadius:7, background:'var(--surf2)', border:'1px solid var(--bdr)', fontSize:12, fontWeight:700 }}>
                {h.symbol}
                <span style={{ fontWeight:400, color:'var(--dim)', marginLeft:6, fontSize:11 }}>{h.qty}u · ₹{h.avg_price.toLocaleString('en-IN', { maximumFractionDigits:0 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="g-side" style={{ display:'grid', gap:16 }}>
        <div>
          <MarketOverview />

          {/* Signals filtered to portfolio */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Signals · {activePortfolio?.name}</div>
              <Link href="/signals" style={{ fontSize:12, color:'var(--bluL)', fontWeight:600 }}>All signals</Link>
            </div>
            {signals.length === 0 ? (
              <div style={{ padding:'24px 0', textAlign:'center', color:'var(--dim)', fontSize:13 }}>
                No signals today for your portfolio stocks.
                <div style={{ fontSize:11, color:'var(--dim2)', marginTop:6 }}>Add more stocks or check back after market open.</div>
              </div>
            ) : (
              signals.map((s, i) => (
                <div key={s.sym} style={{ padding:'12px 0', borderBottom: i < signals.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, background:s.sbg, color:s.sc }}>{s.sig}</span>
                    <span style={{ fontSize:14, fontWeight:800 }}>{s.sym}</span>
                    <span style={{ fontSize:11, color:'var(--dim2)', marginLeft:'auto' }}>{s.time}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>{s.note}</div>
                </div>
              ))
            )}
          </div>

          {/* FII/DII */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>FII / DII Flow</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>Today</span>
            </div>
            {[
              { label:'FII (Foreign Inst.)', val:'-₹1,240 Cr', valC:'var(--red)', pct:35, barC:'var(--red)' },
              { label:'DII (Domestic Inst.)', val:'+₹2,180 Cr', valC:'var(--grn)', pct:68, barC:'var(--grn)' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ fontWeight:600 }}>{f.label}</span>
                  <span style={{ fontWeight:800, color:f.valC }}>{f.val}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${f.pct}%`, background:f.barC, borderRadius:3 }}/>
                </div>
              </div>
            ))}
            <div style={{ fontSize:11, color:'var(--dim)', padding:'8px 10px', background:'var(--surf2)', borderRadius:8, lineHeight:1.6, marginTop:8 }}>
              📊 Net institutional: <span style={{ color:'var(--grn)', fontWeight:700 }}>+₹940 Cr</span> — DIIs absorbing FII selling
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div>
          <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.08),rgba(0,212,160,0.05))', border:'1px solid rgba(23,64,245,0.25)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--bluL)', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>🤖 RF Pick of the Day</div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>TATAMOTORS</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:6 }}>Tata Motors · NSE · Auto</div>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1, margin:'6px 0' }}>₹960</div>
            <div style={{ display:'flex', gap:16, fontSize:12, marginBottom:10 }}>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>Target</div><div style={{ fontWeight:700, color:'var(--grn)' }}>₹1,040</div></div>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>Stop Loss</div><div style={{ fontWeight:700, color:'var(--red)' }}>₹930</div></div>
              <div><div style={{ color:'var(--dim)', fontSize:10 }}>R:R</div><div style={{ fontWeight:700 }}>2.7:1</div></div>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', width:'81%', background:'linear-gradient(90deg,var(--grn),#00A87D)', borderRadius:3 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'var(--grn)', fontWeight:700 }}>81% confident</span>
              <span style={{ color:'var(--dim)' }}>RSI=34 · EMA ✓ · Del.%=68</span>
            </div>
          </div>

          <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--pur)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--pur)', display:'inline-block' }}/>
              Paper Trade · RSI+EMA · Day 6/7
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div><div style={{ fontSize:11, color:'var(--dim)' }}>Virtual P&L</div><div style={{ fontSize:20, fontWeight:900, color:'var(--grn)' }}>+₹8,420</div></div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:11, color:'var(--dim)' }}>Win rate</div><div style={{ fontSize:20, fontWeight:900, color:'var(--grn)' }}>71%</div></div>
            </div>
            <Link href="/paper-trading" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:36, borderRadius:9, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', fontSize:13, fontWeight:700 }}>View Full Log →</Link>
          </div>

          <div style={{ ...card, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Sector Performance</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { name:'IT', val:'+4.1%', c:'var(--grn)' },
                { name:'Auto', val:'+2.8%', c:'var(--grn)' },
                { name:'Banking', val:'-0.8%', c:'var(--red)' },
                { name:'Metal', val:'-2.1%', c:'var(--red)' },
              ].map(s => (
                <div key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--dim)' }}>{s.name}</span>
                  <span style={{ fontWeight:700, color:s.c }}>{s.val}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/sectors" style={{ display:'block', marginTop:12, fontSize:12, color:'var(--bluL)', fontWeight:600 }}>Full heatmap →</Link>
          </div>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Signals for informational purposes only · Not financial advice · DYOR
      </div>
    </>
  );
}
