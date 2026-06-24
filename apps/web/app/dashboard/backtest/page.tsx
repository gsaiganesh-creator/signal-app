import Link from 'next/link';

const ProGate = ({ feature }: { feature: string }) => (
  <div style={{ position:'absolute', inset:0, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', background:'rgba(7,13,26,0.65)', borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10, border:'1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ fontSize:32 }}>🔒</div>
    <div style={{ fontSize:15, fontWeight:800, color:'rgba(255,255,255,0.95)' }}>Pro Feature</div>
    <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', maxWidth:260, lineHeight:1.6 }}>{feature}</div>
    <Link href="/dashboard/upgrade" style={{ marginTop:6, height:38, padding:'0 20px', borderRadius:9, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>⚡ Upgrade to Pro</Link>
  </div>
);

export default function BacktestPage() {
  const isPro = false;
  const FEATURES = [
    { icon:'📅', t:'Historical Data', d:'10 years of NSE/BSE OHLCV data across 500+ stocks' },
    { icon:'⚡', t:'Fast Simulation', d:'Run 1000+ scenarios in seconds with vectorised engine' },
    { icon:'📊', t:'Full Analytics', d:'Sharpe ratio, max drawdown, win rate, P&L curve' },
    { icon:'🔄', t:'Walk-Forward', d:'Out-of-sample validation to prevent curve fitting' },
  ];
  const COMING = [
    'Upload custom strategy (Python/JSON)',
    'Optimise parameters with grid/random search',
    'Compare multiple strategies side-by-side',
    'Export results to PDF / CSV',
    'Monte Carlo simulation',
  ];
  return (
    <div style={{ position:'relative' }}>
    {!isPro && <ProGate feature="Run backtests against 10 years of NSE/BSE data. Sharpe ratio, drawdown, win rate — all unlocked with Pro." />}
    <>
      {/* Hero card — same style as referral card */}
      <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(23,64,245,0.05))', border:'1px solid rgba(139,92,246,0.2)', borderRadius:20, padding:'32px 40px', marginBottom:28, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div style={{ maxWidth:560 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--pur)', textTransform:'uppercase', marginBottom:10 }}>Strategy Backtesting</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:12 }}>
            Validate your strategy.<br/>
            <span style={{ color:'var(--pur)' }}>Before you risk a rupee.</span>
          </div>
          <div style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, marginBottom:20 }}>
            Replay any SIGNAL strategy against historical NSE data. See exactly how it would have performed — drawdowns, win rate, best/worst trades — before committing real capital.
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:8, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)', fontSize:13, fontWeight:600, color:'var(--pur)' }}>
            🛠️ &nbsp;Engine in development · Launching Q3 2026
          </div>
        </div>
        <div style={{ fontSize:80, opacity:0.12, flexShrink:0 }}>📋</div>
      </div>

      {/* Feature grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
        {FEATURES.map(f => (
          <div key={f.t} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px' }}>
            <div style={{ fontSize:24, marginBottom:10 }}>{f.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{f.t}</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>

      {/* Coming soon list */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:'22px 24px' }}>
        <div style={{ fontSize:14, fontWeight:800, marginBottom:14 }}>What&apos;s being built</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {COMING.map(c => (
            <div key={c} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--dim)' }}>
              <div style={{ width:20, height:20, borderRadius:6, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>🔜</div>
              {c}
            </div>
          ))}
        </div>
      </div>
    </>
    </div>
  );
}
