'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/components/ThemeProvider';
import { DemoVideoModal } from '@/components/DemoVideoModal';
import { BrandIcon } from '@/components/Brand';

// ── Pricing ───────────────────────────────────────────────────────────────────
const PRICE: Record<string, { s:string; p:string; e:string; cy:string; note:string }> = {
  mo:   { s:'₹299',   p:'₹799',    e:'₹1,999',  cy:'per month · cancel anytime',        note:'' },
  qtr:  { s:'₹810',   p:'₹2,160',  e:'₹5,400',  cy:'per quarter · save 10%',            note:'🎉 Quarterly saves 10% vs monthly.' },
  half: { s:'₹1,490', p:'₹3,980',  e:'₹9,950',  cy:'per 6 months · save 17%',           note:'💰 Half-yearly saves 17%.' },
  yr:   { s:'₹2,690', p:'₹7,190',  e:'₹17,990', cy:'per year · save 25%',               note:'🏆 Annual plan = 3 months free. Billed once.' },
};
const COUPONS: Record<string, string> = {
  SIGNAL20:  '20% off your first payment',
  LAUNCH50:  '50% off — launch special!',
  EARLYBIRD: '30% off early bird discount',
  VSIGNAL:   'Free 1-month Pro upgrade',
};

// ── Glass card styles ─────────────────────────────────────────────────────────
const GLS: React.CSSProperties = {
  backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
  borderRadius:22, border:'1px solid rgba(255,255,255,0.1)',
  boxShadow:'0 8px 40px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.08)',
};
const GC: Record<string,React.CSSProperties> = {
  grn:{ ...GLS, background:'linear-gradient(145deg,rgba(0,212,160,0.32),rgba(0,130,95,0.14))',   borderColor:'rgba(0,212,160,0.5)',  boxShadow:'0 8px 56px rgba(0,212,160,0.28),inset 0 1px 0 rgba(255,255,255,0.13)' },
  blu:{ ...GLS, background:'linear-gradient(145deg,rgba(79,111,250,0.38),rgba(23,64,245,0.14))', borderColor:'rgba(79,111,250,0.52)', boxShadow:'0 8px 56px rgba(23,64,245,0.3),inset 0 1px 0 rgba(255,255,255,0.13)' },
  pur:{ ...GLS, background:'linear-gradient(145deg,rgba(139,92,246,0.38),rgba(100,40,200,0.14))',borderColor:'rgba(139,92,246,0.52)', boxShadow:'0 8px 56px rgba(139,92,246,0.3),inset 0 1px 0 rgba(255,255,255,0.13)' },
  org:{ ...GLS, background:'linear-gradient(145deg,rgba(255,92,26,0.36),rgba(200,50,0,0.14))',   borderColor:'rgba(255,92,26,0.5)',  boxShadow:'0 8px 56px rgba(255,92,26,0.26),inset 0 1px 0 rgba(255,255,255,0.13)' },
  ylw:{ ...GLS, background:'linear-gradient(145deg,rgba(255,184,0,0.32),rgba(180,110,0,0.14))',  borderColor:'rgba(255,184,0,0.48)', boxShadow:'0 8px 56px rgba(255,184,0,0.24),inset 0 1px 0 rgba(255,255,255,0.13)' },
  mix:{ ...GLS, background:'linear-gradient(145deg,rgba(0,212,160,0.22),rgba(79,111,250,0.3))',  borderColor:'rgba(79,111,250,0.44)', boxShadow:'0 8px 56px rgba(79,111,250,0.24),inset 0 1px 0 rgba(255,255,255,0.13)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const SignalLogo = () => <BrandIcon size={26} />;

const grd = (g: string): React.CSSProperties => ({
  background: g, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
});

const hdr = (label: string, color: string) => (
  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color, marginBottom:14 }}>{label}</div>
);

const cbar = (w: number, c: string) => (
  <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, margin:'9px 0 4px', overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${w}%`, background:c, borderRadius:2 }}/>
  </div>
);

const sigtag = (label: string, cls: 'buy'|'sell'|'hold') => {
  const m = { buy:{bg:'rgba(0,212,160,0.2)',c:'var(--grn)',bc:'rgba(0,212,160,0.35)'}, sell:{bg:'rgba(255,59,92,0.18)',c:'var(--red)',bc:'rgba(255,59,92,0.35)'}, hold:{bg:'rgba(255,184,0,0.15)',c:'var(--ylw)',bc:'rgba(255,184,0,0.3)'} };
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20, fontSize:10.5, fontWeight:800, background:m[cls].bg, color:m[cls].c, border:`1px solid ${m[cls].bc}` }}>{label}</span>;
};

const fpill = (ico: string, icoBg: string, title: string, desc: string) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 15px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:13 }}>
    <div style={{ width:30, height:30, borderRadius:9, background:icoBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:1 }}>{ico}</div>
    <div><div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{title}</div><div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.5 }}>{desc}</div></div>
  </div>
);

// ── Marquee card data (rendered twice for seamless loop) ─────────────────────
const MQ1 = () => (
  <>
    <div style={{ ...GC.grn, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>NSE · AI Scan</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div><div style={{ fontSize:16, fontWeight:900 }}>RELIANCE</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>₹2,912 · ▲ +1.80%</div></div>
        {sigtag('↑ Momentum','buy')}
      </div>
      {cbar(87,'var(--grn)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>Score <strong style={{ color:'var(--grn)' }}>87%</strong></div>
    </div>
    <div style={{ ...GC.blu, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Portfolio AI</div>
      <div style={{ fontSize:14, fontWeight:800, marginBottom:8 }}>16 stocks screened</div>
      {[['🚀 Rising','var(--grn)','5'],['🔄 Building','var(--bluL)','4'],['↓ Declining','var(--red)','2']].map(([l,c,n]) => (
        <div key={l as string} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}><span style={{ color:c as string }}>{l}</span><span>{n}</span></div>
      ))}
    </div>
    <div style={{ ...GC.mix, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Week 23 · Track Record</div>
      <div style={{ fontSize:32, fontWeight:900, color:'var(--grn)', letterSpacing:-2, marginBottom:5 }}>71.4%</div>
      {cbar(71.4,'var(--grn)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>14 scans · 10 strong · 2 reversed</div>
    </div>
    <div style={{ ...GC.pur, padding:'16px 18px', minWidth:210, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Paper Trading · Day 6</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        {[['var(--grn)','rgba(0,212,160,0.08)','rgba(0,212,160,0.18)','+8.4%','P&L'],['var(--pur)','rgba(139,92,246,0.1)','rgba(139,92,246,0.2)','71%','Win']].map(([c,bg,bc,v,l]) => (
          <div key={l as string} style={{ textAlign:'center', padding:9, background:bg as string, border:`1px solid ${bc}`, borderRadius:9 }}>
            <div style={{ fontSize:17, fontWeight:900, color:c as string }}>{v}</div>
            <div style={{ fontSize:10, color:'var(--dim)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ ...GC.org, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>NSE · AI Scan</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div><div style={{ fontSize:16, fontWeight:900 }}>SBIN</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>₹812 · ▲ +2.1%</div></div>
        {sigtag('↑ Momentum','buy')}
      </div>
      {cbar(78,'var(--org)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>Score <strong style={{ color:'var(--org)' }}>78%</strong></div>
    </div>
    <div style={{ ...GC.ylw, padding:'16px 18px', minWidth:210, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Backtest · 1 Year</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {[['+24.3%','var(--grn)','Returns'],['1.84','var(--bluL)','Sharpe'],['64%','var(--grn)','Win Rate'],['-8.2%','var(--red)','Drawdown']].map(([v,c,l]) => (
          <div key={l as string} style={{ textAlign:'center', padding:7, background:'rgba(0,0,0,0.2)', borderRadius:8 }}>
            <div style={{ fontSize:15, fontWeight:900, color:c as string }}>{v}</div>
            <div style={{ fontSize:9.5, color:'var(--dim)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ ...GC.grn, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>NSE · AI Scan</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div><div style={{ fontSize:16, fontWeight:900 }}>TATAMOTORS</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>₹960 · ▲ +3.5%</div></div>
        {sigtag('↑ Momentum','buy')}
      </div>
      {cbar(81,'var(--grn)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>Result: <strong style={{ color:'var(--grn)' }}>+8.4% · Momentum held</strong></div>
    </div>
    <div style={{ ...GC.blu, padding:'16px 18px', minWidth:210, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>🐦 Sentiment</div>
      <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>TATAMOTORS</div>
      <div style={{ height:6, background:'rgba(255,59,92,0.2)', borderRadius:3, overflow:'hidden', marginBottom:5 }}><div style={{ height:'100%', width:'76%', background:'var(--grn)', borderRadius:3 }}/></div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700 }}><span style={{ color:'var(--grn)' }}>76% Bullish</span><span style={{ color:'var(--red)' }}>24%</span></div>
    </div>
  </>
);

const MQ2 = () => (
  <>
    <div style={{ ...GC.pur, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Account Aggregator</div>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:-1, marginBottom:4 }}>₹18.7L</div>
      <div style={{ fontSize:10.5, color:'var(--dim)', marginBottom:8 }}>Total wealth · 4 institutions</div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {[['SBI','rgba(0,212,160,0.12)','var(--grn)'],['HDFC','rgba(56,126,209,0.12)','#387ED1'],['mStock','rgba(255,92,26,0.12)','var(--org)'],['MF','rgba(139,92,246,0.12)','var(--pur)']].map(([n,bg,c]) => (
          <span key={n as string} style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:5, background:bg as string, color:c as string }}>{n}</span>
        ))}
      </div>
    </div>
    <div style={{ ...GC.org, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>NSE · AI Scan</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div><div style={{ fontSize:16, fontWeight:900 }}>ZOMATO</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>₹189 · ▼ -1.4%</div></div>
        {sigtag('↓ Declining','sell')}
      </div>
      {cbar(81,'var(--red)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>Score <strong style={{ color:'var(--red)' }}>81%</strong> · Below support</div>
    </div>
    <div style={{ ...GC.grn, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>ETF &amp; MF Portfolio</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}><span style={{ fontSize:13, fontWeight:700 }}>₹1,23,000</span><span style={{ fontSize:18, fontWeight:900, color:'var(--grn)' }}>+24.5%</span></div>
      {[['Mirae Asset','+16.3%'],['NIFTYBEES','+12.0%'],['SBI Small Cap','+40.0%']].map(([n,r]) => (
        <div key={n as string} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}><span style={{ color:'var(--dim)' }}>{n}</span><span style={{ color:'var(--grn)', fontWeight:700 }}>{r}</span></div>
      ))}
    </div>
    <div style={{ ...GC.mix, padding:'16px 18px', minWidth:210, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Broker Connect</div>
      {[['mStock','Connected ✓','var(--grn)'],['Zerodha','Connect →','var(--bluL)'],['Upstox','Connect →','var(--bluL)']].map(([n,t,c]) => (
        <div key={n as string} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, marginBottom:5 }}>
          <span style={{ fontSize:11, fontWeight:700 }}>{n}</span>
          <span style={{ marginLeft:'auto', fontSize:10, color:c as string, fontWeight:700 }}>{t}</span>
        </div>
      ))}
    </div>
    <div style={{ ...GC.ylw, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>NSE · AI Scan</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div><div style={{ fontSize:16, fontWeight:900 }}>HDFCBANK</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>₹1,620 · ▲ +0.6%</div></div>
        {sigtag('→ Sideways','hold')}
      </div>
      {cbar(62,'var(--ylw)')}
      <div style={{ fontSize:10.5, color:'var(--dim)' }}>Score <strong style={{ color:'var(--ylw)' }}>62%</strong></div>
    </div>
    <div style={{ ...GC.blu, padding:'16px 18px', minWidth:220, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Public Track Record</div>
      <div style={{ marginBottom:7 }}><div style={{ fontSize:13, fontWeight:700, color:'var(--grn)' }}>🎯 TATAMOTORS +8.4%</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>↑ Momentum zone · held 3 days</div></div>
      <div style={{ paddingTop:7, borderTop:'1px solid rgba(255,255,255,0.08)' }}><div style={{ fontSize:13, fontWeight:700, color:'var(--grn)' }}>🚀 SBIN +5.9%</div><div style={{ fontSize:10.5, color:'var(--dim)' }}>↑ Momentum zone · held 2 days</div></div>
    </div>
    <div style={{ ...GC.pur, padding:'16px 18px', minWidth:210, flexShrink:0 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Algo Indicators</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {[['RSI (14)','rgba(79,111,250,0.18)','rgba(79,111,250,0.35)','var(--bluL)'],['EMA 20/50','rgba(79,111,250,0.18)','rgba(79,111,250,0.35)','var(--bluL)'],['MACD',null,null,null],['Bollinger',null,null,null],['ADX',null,null,null],['ATR',null,null,null]].map(([t,bg,bc,c]) => (
          <span key={t as string} style={{ padding:'3px 9px', borderRadius:20, fontSize:10.5, fontWeight:700, background:bg??'rgba(255,255,255,0.06)', border:`1px solid ${bc??'rgba(255,255,255,0.1)'}`, color:c??'var(--dim)' }}>{t}</span>
        ))}
      </div>
    </div>
  </>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period,    setPeriod]    = useState<'mo'|'qtr'|'half'|'yr'>('mo');
  const [coupon,    setCoupon]    = useState('');
  const [couponMsg, setCouponMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [demoOpen,  setDemoOpen]  = useState(false);
  const pr = PRICE[period];

  function applyCoupon() {
    const c = coupon.trim().toUpperCase();
    if (!c) { setCouponMsg({ text:'Enter a code.', ok:false }); return; }
    if (COUPONS[c]) setCouponMsg({ text:`✅ Applied! ${COUPONS[c]}`, ok:true });
    else            setCouponMsg({ text:'❌ Invalid code. Check spelling.', ok:false });
  }

  // Scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const sdiv = <div style={{ height:1, background:'linear-gradient(90deg,transparent,var(--bdr) 30%,var(--bdr) 70%,transparent)', margin:'0 clamp(20px,6vw,100px)' }}/>;
  const sect = (pad = '100px'): React.CSSProperties => ({ padding:`${pad} clamp(20px,6vw,100px)` });

  return (
    <div style={{ background:'var(--bg)', color:'var(--txt)', minHeight:'100vh', overflowX:'hidden', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── SEBI banner ──────────────────────────────────────── */}
      <div style={{ background:'rgba(255,184,0,0.07)', borderBottom:'1px solid rgba(255,184,0,0.15)', padding:'8px 24px', textAlign:'center' }}>
        <span style={{ fontSize:11.5, color:'rgba(255,184,0,0.75)' }}>⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED.</strong> This is a technical screening tool. Scan results are computed indicators — not financial advice. You decide. DYOR.</span>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(20px,5vw,80px)', height:60, background: isDark ? 'rgba(7,13,26,0.88)' : 'rgba(240,244,255,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(79,111,250,0.15)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:19, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', textDecoration:'none' }}>
          <SignalLogo /> SignalGenie
        </Link>
        <div className="lp-nav-links">
          {(['Scanner','Portfolio','Algo Builder','Pricing','Track Record','Support'] as const).map((l,i) => (
            <a key={l} href={['#signals','#portfolio','#algo','#pricing','#track','/support'][i]} style={{ fontSize:13, fontWeight:500, color:'var(--dim)', textDecoration:'none' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--txt)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <Link href="/sign-in" style={{ height:36, padding:'0 16px', borderRadius:9, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(23,64,245,0.06)', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,64,245,0.2)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', textDecoration:'none' }}>Sign In</Link>
          <Link href="/sign-in" className="lp-cta-desktop" style={{ height:36, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, alignItems:'center', textDecoration:'none', whiteSpace:'nowrap' }}>Get Started Free →</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ position:'relative', overflow:'hidden', padding:'0 clamp(20px,5vw,80px)' }}>
        {/* Orbs */}
        <div style={{ position:'absolute', width:800, height:800, top:-300, left:'50%', transform:'translateX(-50%)', background:'radial-gradient(circle,rgba(23,64,245,0.2),transparent 70%)', borderRadius:'50%', filter:'blur(90px)', pointerEvents:'none', animation:'lp-drift1 14s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:500, height:500, top:'20%', right:-150, background:'radial-gradient(circle,rgba(139,92,246,0.14),transparent 70%)', borderRadius:'50%', filter:'blur(90px)', pointerEvents:'none', animation:'lp-drift2 18s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:400, height:400, bottom:-100, left:-100, background:'radial-gradient(circle,rgba(255,92,26,0.1),transparent 70%)', borderRadius:'50%', filter:'blur(90px)', pointerEvents:'none', animation:'lp-drift3 20s ease-in-out infinite' }}/>

        <div className="lp-hero-grid">
          {/* Left — text */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px 5px 10px', borderRadius:20, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontSize:12, fontWeight:600, color:'var(--dim)', marginBottom:28 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--grn)', display:'inline-block', animation:'blink 2s infinite' }}/>
              Live · NSE &amp; BSE · 4,000+ stocks
            </div>
            <h1 style={{ fontSize:'clamp(44px,6.5vw,88px)', fontWeight:900, letterSpacing:-3.5, lineHeight:.93, marginBottom:24 }}>
              <span style={grd('linear-gradient(135deg,var(--txt) 0%,var(--bluL) 55%,var(--pur) 100%)')}>Trade</span><br/>
              <span style={grd('linear-gradient(135deg,var(--org),var(--ylw))')}>Smarter</span><br/>
              <span style={grd('linear-gradient(135deg,var(--grn),var(--grn-bright))')}>with AI</span>
            </h1>
            <p style={{ fontSize:'clamp(15px,1.6vw,18px)', color:'var(--dim)', lineHeight:1.7, maxWidth:480, marginBottom:12 }}>
              AI-powered portfolio classification, technical screener, no-code Algo Builder, and Paper Trading — for a fraction of what premium services charge.
            </p>
            <p style={{ fontSize:12.5, color:'var(--dim2)', lineHeight:1.6, maxWidth:480, marginBottom:36 }}>
              Powered by our own proprietary ML models — trained on 5 years of NSE/BSE data, not a wrapper around someone else's chatbot.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:44 }}>
              <Link href="/sign-in" style={{ height:54, padding:'0 32px', borderRadius:15, fontSize:16, fontWeight:700, background:'linear-gradient(135deg,var(--blu),var(--bluL))', color:'#fff', boxShadow:'0 8px 40px rgba(23,64,245,0.4)', display:'flex', alignItems:'center', textDecoration:'none', transition:'transform .2s' }}>
                Start Free — No Card Needed →
              </Link>
              <button onClick={() => setDemoOpen(true)} style={{ height:54, padding:'0 32px', borderRadius:15, fontSize:16, fontWeight:700, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'var(--txt)', cursor:'pointer', fontFamily:'inherit' }}>
                Watch Demo ▶
              </button>
            </div>
            <div className="lp-stats-4" style={{ display:'grid' }}>
              {[
                { v:'71.4%', s:grd('linear-gradient(135deg,var(--grn),var(--grn-bright))'), l:'Scan accuracy' },
                { v:'4,000+',s:{ color:'var(--bluL)' },                            l:'Stocks tracked' },
                { v:'₹599',  s:grd('linear-gradient(135deg,var(--org),var(--ylw))'),l:'vs ₹15,000 elsewhere' },
                { v:'6',     s:{ color:'var(--pur)' },                              l:'Brokers synced' },
              ].map(st => (
                <div key={st.l}>
                  <div style={{ fontSize:24, fontWeight:900, letterSpacing:-1, ...st.s }}>{st.v}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating glass cards */}
          <div className="lp-hero-cards">
            {/* Strong momentum — green — top-left */}
            <div style={{ ...GC.grn, position:'absolute', width:220, top:'2%', left:'0%', padding:'18px 20px', animation:'fl1 7s ease-in-out infinite', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>AI Scan · NSE</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div><div style={{ fontSize:17, fontWeight:900 }}>RELIANCE</div><div style={{ fontSize:11, color:'var(--dim)' }}>₹2,912 · ▲ +1.80%</div></div>
                {sigtag('↑ Strong Momentum','buy')}
              </div>
              {cbar(87,'var(--grn)')}
              <div style={{ fontSize:11, color:'var(--dim)' }}>Confidence <strong style={{ color:'var(--grn)' }}>87%</strong> · RSI 34</div>
            </div>

            {/* Portfolio ML — blue — top-right */}
            <div style={{ ...GC.blu, position:'absolute', width:210, top:'0%', right:'0%', padding:'18px 20px', animation:'fl2 9s ease-in-out infinite .8s', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Portfolio AI</div>
              {[['🚀 Rising','var(--grn)','rgba(0,212,160,0.1)','rgba(0,212,160,0.2)','5'],['🔄 Building','var(--bluL)','rgba(79,111,250,0.1)','rgba(79,111,250,0.2)','4'],['↓ Declining','var(--red)','rgba(255,59,92,0.08)','rgba(255,59,92,0.2)','2']].map(([l,c,bg,bc,n]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'5px 9px', background:bg as string, borderRadius:7, border:`1px solid ${bc}`, marginBottom:4 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:c as string }}>{l}</span><span style={{ fontSize:11, color:'var(--dim)' }}>{n}</span>
                </div>
              ))}
            </div>

            {/* Scorecard — mix — center */}
            <div style={{ ...GC.mix, position:'absolute', width:200, top:'32%', left:'28%', padding:'18px 20px', animation:'fl5 8s ease-in-out infinite 1.5s', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Week 23 Scorecard</div>
              <div style={{ fontSize:34, fontWeight:900, letterSpacing:-2, color:'var(--grn)', lineHeight:1, marginBottom:4 }}>71.4%</div>
              <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden', marginBottom:6 }}><div style={{ height:'100%', width:'71.4%', background:'linear-gradient(90deg,var(--grn),var(--grn-bright))', borderRadius:3 }}/></div>
              <div style={{ fontSize:10.5, color:'var(--dim)' }}>14 scans · 10 strong · 2 reversed</div>
            </div>

            {/* Paper Trading — purple — mid-right */}
            <div style={{ ...GC.pur, position:'absolute', width:200, top:'42%', right:'2%', padding:'18px 20px', animation:'fl3 6s ease-in-out infinite .3s', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Paper Trading</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                {[['+8.4%','var(--grn)','rgba(0,212,160,0.08)','rgba(0,212,160,0.18)','P&L'],['71%','var(--pur)','rgba(139,92,246,0.1)','rgba(139,92,246,0.2)','Win Rate']].map(([v,c,bg,bc,l]) => (
                  <div key={l as string} style={{ textAlign:'center', padding:8, background:bg as string, border:`1px solid ${bc}`, borderRadius:9 }}>
                    <div style={{ fontSize:16, fontWeight:900, color:c as string }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Algo — orange — bottom-left */}
            <div style={{ ...GC.org, position:'absolute', width:210, bottom:'5%', left:'5%', padding:'18px 20px', animation:'fl4 10s ease-in-out infinite 2s', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Algo Builder</div>
              <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:10, padding:10, fontFamily:'JetBrains Mono,monospace', fontSize:10, lineHeight:1.75 }}>
                <div style={{ color:'#68D391' }}># RSI + EMA Strategy</div>
                <div style={{ color:'#F6C90E' }}>RSI_LOW = 35</div>
                <div style={{ color:'#FF7D46' }}>def signal(df):</div>
                <div style={{ color:'#E2E8F0' }}>{'  if rsi < RSI_LOW:'}</div>
                <div style={{ color:'#68D391' }}>{'    return "BUY"'}</div>
              </div>
            </div>

            {/* Sentiment — yellow — bottom-right */}
            <div style={{ ...GC.ylw, position:'absolute', width:195, bottom:'2%', right:'5%', padding:'18px 20px', animation:'fl6 11s ease-in-out infinite 1s', cursor:'default' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:9 }}>🐦 Sentiment · SBIN</div>
              <div style={{ height:7, background:'rgba(255,59,92,0.2)', borderRadius:4, overflow:'hidden', marginBottom:6 }}><div style={{ height:'100%', width:'76%', background:'linear-gradient(90deg,var(--grn),var(--grn-bright))', borderRadius:4 }}/></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, fontWeight:700 }}>
                <span style={{ color:'var(--grn)' }}>76% Bullish</span>
                <span style={{ color:'var(--red)' }}>24%</span>
              </div>
              <div style={{ fontSize:10, color:'var(--dim)', marginTop:5 }}>212 posts · 24h window</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Marquee ───────────────────────────────────────────── */}
      <section style={{ padding:'48px 0', overflow:'hidden' }}>
        <div style={{ textAlign:'center', fontSize:10.5, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--dim2)', marginBottom:20 }}>
          Technical scans · Portfolio insights · Real-time intelligence
        </div>
        <div className="mq-wrap" style={{ overflow:'hidden', marginBottom:12 }}>
          <div className="mq-track-r"><MQ1/><MQ1/></div>
        </div>
        <div className="mq-wrap" style={{ overflow:'hidden' }}>
          <div className="mq-track-l"><MQ2/><MQ2/></div>
        </div>
      </section>

      {sdiv}

      {/* ── Feature 1 — ML Signals ───────────────────────────── */}
      <section id="signals" style={sect('clamp(80px,10vw,140px)')}>
        <div className="lp-feat lp-reveal">
          <div>
            {hdr('AI Technical Scan','var(--grn)')}
            <h2 style={{ fontSize:'clamp(28px,3.8vw,50px)', fontWeight:900, letterSpacing:-2, lineHeight:.97, marginBottom:16 }}>
              Scan. Analyse. Decide.<br/><span style={grd('linear-gradient(135deg,var(--grn),var(--grn-bright))')}>Know exactly why.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:28 }}>Every scan result comes with a technical momentum score, Twitter/X sentiment, delivery volume %, and a full breakdown of the 15 indicators that computed it — not a human guess.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {fpill('🤖','rgba(0,212,160,0.12)','Random Forest · 200 trees, 15 indicators','RSI, MACD, EMA, ADX, FII/DII flow, Twitter sentiment, delivery %, earnings, beta — trained on 5Y NSE/BSE data.')}
              {fpill('⚡','rgba(79,111,250,0.12)','Updated every 2 min · instant alerts','Real-time screener updates during market hours with push + WhatsApp notification when momentum zones shift.')}
              {fpill('🐦','rgba(139,92,246,0.12)','Public track record on Twitter/X','Screener results auto-posted publicly with technical scores. Weekly accuracy scorecards — full accountability.')}
            </div>
          </div>
          <div className="lp-feat-visual">
            <div style={{ ...GC.ylw, position:'absolute', width:300, top:30, left:30, padding:'20px 22px', transform:'rotate(-5deg)', animation:'fl3 8s ease-in-out infinite' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>🐦 Twitter Sentiment</div>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>TATAMOTORS</div>
              <div style={{ height:7, background:'rgba(255,59,92,0.2)', borderRadius:4, overflow:'hidden', marginBottom:6 }}><div style={{ height:'100%', width:'76%', background:'linear-gradient(90deg,var(--grn),var(--grn-bright))', borderRadius:4 }}/></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700 }}><span style={{ color:'var(--grn)' }}>76% Bullish</span><span style={{ color:'var(--red)' }}>24%</span></div>
              <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:5 }}>212 posts · 24h window</div>
            </div>
            <div style={{ ...GC.grn, position:'absolute', width:310, top:0, left:0, padding:'20px 22px', animation:'fl1 7s ease-in-out infinite .5s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.7, marginBottom:12 }}>AI Scan · NSE</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div><div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>RELIANCE</div><div style={{ fontSize:11.5, color:'var(--dim)' }}>Reliance Industries · Large Cap</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:26, fontWeight:900, letterSpacing:-1 }}>₹2,912</div><div style={{ fontSize:12, color:'var(--grn)', fontWeight:700 }}>▲ +1.80%</div></div>
              </div>
              <svg width="100%" height="36" viewBox="0 0 280 36" preserveAspectRatio="none" style={{ marginBottom:10, display:'block' }}>
                <defs><linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00D4A0" stopOpacity={0.3}/><stop offset="100%" stopColor="#00D4A0" stopOpacity={0}/></linearGradient></defs>
                <path d="M0,34 C30,30 55,24 80,18 S130,10 160,7 S220,4 250,3 L280,2 L280,36 L0,36Z" fill="url(#sg1)"/>
                <path d="M0,34 C30,30 55,24 80,18 S130,10 160,7 S220,4 250,3 L280,2" fill="none" stroke="#00D4A0" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.25)', borderRadius:11, padding:'11px 13px', marginBottom:9 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:'var(--grn)' }}>🚀 RISING</span>
                  {sigtag('↑ Strong Momentum','buy')}
                </div>
                {cbar(87,'linear-gradient(90deg,var(--grn),var(--grn-bright))')}
                <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:5 }}>Score <strong style={{ color:'var(--grn)' }}>87%</strong> · 15/15 indicators · Updated 2 min ago</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {[['Delivery%','63.2%','var(--grn)'],['P/E','28.4×','var(--txt)'],['Mkt Cap','₹19.7L Cr','var(--txt)']].map(([k,v,c]) => (
                  <div key={k as string} style={{ textAlign:'center', background:'rgba(0,0,0,0.25)', borderRadius:8, padding:7 }}>
                    <div style={{ fontSize:9.5, color:'var(--dim)' }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:c as string }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...GC.pur, position:'absolute', width:180, bottom:20, right:10, padding:'14px 16px', animation:'fl4 9s ease-in-out infinite 2s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, opacity:.6, marginBottom:6 }}>Live Alert</div>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>🔔 SBIN Scan Updated</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>↑ Momentum · Score 78%</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Feature 2 — Portfolio ────────────────────────────── */}
      <section id="portfolio" style={sect('clamp(80px,10vw,140px)')}>
        <div className="lp-feat lp-reveal" style={{ direction:'rtl' }}>
          <div style={{ direction:'ltr' }}>
            {hdr('Portfolio Intelligence','var(--bluL)')}
            <h2 style={{ fontSize:'clamp(28px,3.8vw,50px)', fontWeight:900, letterSpacing:-2, lineHeight:.97, marginBottom:16 }}>
              Your holdings,<br/><span style={grd('linear-gradient(135deg,var(--bluL),var(--pur))')}>classified by AI.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:28 }}>Connect your broker via secure OAuth or upload Excel. Our model instantly tags every stock — Rising, Building, Holding, Declining — and syncs live P&amp;L every 30 seconds.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {fpill('🔗','rgba(79,111,250,0.12)','6 brokers + RBI Account Aggregator','mStock, Zerodha, Upstox, Angel One, HDFC Sec, Groww — or upload .xlsx. AA sync brings in MFs, FDs, NPS, EPF too.')}
              {fpill('📊','rgba(0,212,160,0.12)','Live P&L sync every 30 seconds','LTP, unrealised P&L, delivery %, institutional flow — all live during market hours.')}
            </div>
          </div>
          <div className="lp-feat-visual" style={{ direction:'ltr' }}>
            <div style={{ ...GC.grn, position:'absolute', width:280, top:40, left:40, padding:'20px 22px', transform:'rotate(4deg)', animation:'fl2 9s ease-in-out infinite 1s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:10 }}>Live P&amp;L</div>
              <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1.5, color:'var(--grn)', marginBottom:3 }}>₹12,40,000</div>
              <div style={{ fontSize:13, color:'var(--grn)', fontWeight:700, marginBottom:8 }}>▲ +18.4% YoY</div>
              {cbar(68,'linear-gradient(90deg,var(--grn),var(--grn-bright))')}
            </div>
            <div style={{ ...GC.blu, position:'absolute', width:300, top:0, left:0, padding:'20px 22px', animation:'fl1 7s ease-in-out infinite .3s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:15, fontWeight:800 }}>Portfolio Analysis</div>
                <div style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(0,212,160,0.12)', border:'1px solid rgba(0,212,160,0.3)', color:'var(--grn)' }}>AI ✓ Live</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[['🚀 Rising','var(--grn)','rgba(0,212,160,0.08)','rgba(0,212,160,0.2)','5','RELIANCE, TML…'],['🔄 Building','var(--bluL)','rgba(79,111,250,0.08)','rgba(79,111,250,0.2)','4','HDFC, BAJFIN…'],['🏛️ Holding','var(--pur)','rgba(139,92,246,0.08)','rgba(139,92,246,0.2)','5','TCS, INFY…'],['↓ Declining','var(--red)','rgba(255,59,92,0.07)','rgba(255,59,92,0.2)','2','ZOMATO, PAYTM']].map(([l,c,bg,bc,n,s]) => (
                  <div key={l as string} style={{ padding:11, background:bg as string, border:`1px solid ${bc}`, borderRadius:11 }}>
                    <div style={{ fontSize:10.5, fontWeight:800, color:c as string, marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:18, fontWeight:900 }}>{n}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)' }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...GC.pur, position:'absolute', width:170, bottom:30, right:0, padding:'14px 16px', animation:'fl5 10s ease-in-out infinite 1.5s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, opacity:.6, marginBottom:6 }}>AA Sync · Jaitik</div>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:2 }}>₹18.7L total</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>4 institutions linked</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Feature 3 — Algo Builder ────────────────────────── */}
      <section id="algo" style={sect('clamp(80px,10vw,140px)')}>
        <div className="lp-feat lp-reveal">
          <div>
            {hdr('Algo Builder','var(--org)')}
            <h2 style={{ fontSize:'clamp(28px,3.8vw,50px)', fontWeight:900, letterSpacing:-2, lineHeight:.97, marginBottom:16 }}>
              Build your strategy.<br/><span style={grd('linear-gradient(135deg,var(--org),var(--ylw))')}>No code needed.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:28 }}>Pick a strategy, select indicators, set entry/exit conditions. SignalGenie generates Python code with full 1-year backtest results — then paper-trade it to validate. Your code. Your broker. Your decision.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {fpill('🛠️','rgba(255,92,26,0.12)','Visual no-code builder','Momentum, Trend Following, Mean Reversion, Breakout — pick type, drag in indicators, set rules in minutes.')}
              {fpill('🧪','rgba(255,184,0,0.12)','1-year backtesting on real NSE data','Sharpe ratio, win rate, max drawdown, full returns — calculated on actual historical data before you risk a rupee.')}
            </div>
          </div>
          <div className="lp-feat-visual">
            <div style={{ ...GC.ylw, position:'absolute', width:280, top:50, left:50, padding:'20px 22px', transform:'rotate(-4deg)', animation:'fl2 8s ease-in-out infinite 1s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:12 }}>1Y Backtest Results</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[['+24.3%','var(--grn)','Returns'],['1.84','var(--bluL)','Sharpe'],['64%','var(--grn)','Win Rate'],['-8.2%','var(--red)','Drawdown']].map(([v,c,l]) => (
                  <div key={l as string} style={{ textAlign:'center', padding:10, background:'rgba(0,0,0,0.3)', borderRadius:9 }}>
                    <div style={{ fontSize:20, fontWeight:900, color:c as string }}>{v}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...GC.org, position:'absolute', width:310, top:0, left:0, padding:'20px 22px', animation:'fl1 7s ease-in-out infinite .4s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.7, marginBottom:12 }}>Algo Builder · Generated Code</div>
              <div style={{ background:'#0A0E18', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 13px', background:'#0D1117', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:11, color:'#8B949E', fontFamily:'monospace' }}>signal_rsi_ema.py</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:'rgba(79,111,250,0.15)', color:'var(--bluL)', border:'1px solid rgba(79,111,250,0.3)' }}>⎘ Copy</span>
                </div>
                <div style={{ padding:13, fontFamily:'JetBrains Mono,monospace', fontSize:11, lineHeight:1.8 }}>
                  <div style={{ color:'#68D391' }}># SignalGenie · RSI + EMA Strategy</div>
                  <div style={{ color:'#F6C90E' }}>RSI_LOW, RSI_HIGH = 35, 70</div>
                  <div style={{ color:'#F6C90E' }}>STOP_LOSS = 2.5</div>
                  <div style={{ color:'#FF7D46' }}>def signal(df):</div>
                  <div style={{ color:'#E2E8F0' }}>{'  if rsi < RSI_LOW and cross:'}</div>
                  <div style={{ color:'#68D391' }}>{'    return "BUY"'}</div>
                  <div style={{ color:'#E2E8F0' }}>{'  if rsi > RSI_HIGH:'}</div>
                  <div style={{ color:'#FC8181' }}>{'    return "SELL"'}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:7 }}>
                {[['+24.3%','var(--grn)','Returns'],['64%','var(--grn)','Win Rate'],['-8.2%','var(--red)','Drawdown']].map(([v,c,l]) => (
                  <div key={l as string} style={{ flex:1, textAlign:'center', padding:8, background: c==='var(--red)' ? 'rgba(255,59,92,0.07)' : 'rgba(0,212,160,0.08)', border:`1px solid ${c==='var(--red)' ? 'rgba(255,59,92,0.15)' : 'rgba(0,212,160,0.18)'}`, borderRadius:9 }}>
                    <div style={{ fontSize:14, fontWeight:900, color:c as string }}>{v}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...GC.pur, position:'absolute', width:175, bottom:20, right:0, padding:'14px 16px', animation:'fl4 9s ease-in-out infinite 2s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, opacity:.6, marginBottom:6 }}>Paper Trading ✓</div>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>Ready to test live</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>₹1L virtual · 0 real risk</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Feature 4 — Paper Trading ────────────────────────── */}
      <section id="paper" style={sect('clamp(80px,10vw,140px)')}>
        <div className="lp-feat lp-reveal" style={{ direction:'rtl' }}>
          <div style={{ direction:'ltr' }}>
            {hdr('Paper Trading','var(--pur)')}
            <h2 style={{ fontSize:'clamp(28px,3.8vw,50px)', fontWeight:900, letterSpacing:-2, lineHeight:.97, marginBottom:16 }}>
              Test risk-free on<br/><span style={grd('linear-gradient(135deg,var(--pur),var(--pur-bright))')}>live market data.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:28 }}>Deploy your algo with ₹1,00,000 virtual capital on real NSE/BSE live feeds. Watch signals fire, track virtual P&amp;L, tweak any parameter — then go live when you&apos;re confident.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {fpill('🎮','rgba(139,92,246,0.12)','Real data, zero real money','Live NSE/BSE market feed with ₹1,00,000 virtual capital. Adjust any strategy parameter anytime.')}
              {fpill('🚀','rgba(0,212,160,0.12)','Download and deploy yourself','After consistent paper-trade results, SignalGenie generates code you download and run via your own broker API. You control the execution.')}
            </div>
          </div>
          <div className="lp-feat-visual" style={{ direction:'ltr' }}>
            <div style={{ ...GC.grn, position:'absolute', width:280, top:60, left:30, padding:'20px 22px', transform:'rotate(5deg)', animation:'fl3 9s ease-in-out infinite .7s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:1, textTransform:'uppercase', opacity:.6, marginBottom:8 }}>Signal Log</div>
              {[['09:31','Bought','rgba(0,212,160,0.15)','var(--grn)','RELIANCE','+₹1,632'],['14:22','Sold','rgba(255,59,92,0.12)','var(--red)','INFY','+₹2,340'],['10:05','Held','rgba(255,184,0,0.12)','var(--ylw)','HDFC','—']].map(([t,sig,bg,c,sym,pl]) => (
                <div key={t as string} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, marginBottom:5 }}>
                  <span style={{ color:'var(--dim2)' }}>{t}</span>
                  <span style={{ padding:'1px 7px', borderRadius:4, background:bg as string, color:c as string, fontWeight:700 }}>{sig}</span>
                  <span style={{ fontWeight:700 }}>{sym}</span>
                  <span style={{ marginLeft:'auto', color:'var(--grn)' }}>{pl}</span>
                </div>
              ))}
            </div>
            <div style={{ ...GC.pur, position:'absolute', width:310, top:0, left:0, padding:'20px 22px', animation:'fl1 7s ease-in-out infinite .2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--pur)', animation:'blink 2s infinite' }}/>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--pur)' }}>Paper Trading · Day 6 of 7</span>
              </div>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:14 }}>RSI + EMA Strategy · RELIANCE, HDFCBANK, INFY</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:12 }}>
                {[['+8.4%','var(--grn)','rgba(0,212,160,0.08)','rgba(0,212,160,0.2)','Virtual P&L'],['71%','var(--pur)','rgba(139,92,246,0.1)','rgba(139,92,246,0.22)','Win Rate']].map(([v,c,bg,bc,l]) => (
                  <div key={l as string} style={{ textAlign:'center', padding:13, background:bg as string, border:`1px solid ${bc}`, borderRadius:12 }}>
                    <div style={{ fontSize:22, fontWeight:900, color:c as string }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {[['7','Scans'],['5','Wins'],['₹1,08,420','Virtual']].map(([v,l]) => (
                  <div key={l as string} style={{ textAlign:'center', padding:8, background:'rgba(0,0,0,0.25)', borderRadius:9 }}>
                    <div style={{ fontSize:15, fontWeight:900, color: l==='Wins' ? 'var(--grn)' : 'var(--txt)' }}>{v}</div>
                    <div style={{ fontSize:9.5, color:'var(--dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...GC.org, position:'absolute', width:165, bottom:20, right:10, padding:'14px 16px', animation:'fl6 8s ease-in-out infinite 1.5s' }}>
              <div style={{ fontSize:9.5, fontWeight:700, opacity:.6, marginBottom:5 }}>Strategy status</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:2 }}>✓ Ready to deploy</div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>7 days confirmed</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Bento ────────────────────────────────────────────── */}
      <section style={sect('clamp(60px,8vw,100px)')}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }} className="lp-reveal">
            <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--dim2)', marginBottom:12 }}>Everything Included</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:900, letterSpacing:-2 }}>One platform.<br/>All the tools.</h2>
          </div>
          <div className="lp-bento lp-reveal">
            <div className="tall" style={{ ...GC.pur, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ position:'absolute', width:200, height:200, bottom:-60, right:-60, background:'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)', filter:'blur(60px)', borderRadius:'50%', pointerEvents:'none' }}/>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(139,92,246,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>🧪</div>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Paper Trading</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65, marginBottom:20 }}>Live market data, virtual capital, zero real-money risk. Test and tweak before you decide to use the code yourself.</div>
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:12, padding:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}><div style={{ width:6, height:6, borderRadius:'50%', background:'var(--pur)', animation:'blink 2s infinite' }}/><span style={{ fontSize:11, fontWeight:700, color:'var(--pur)' }}>Running · Day 6</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><span style={{ fontSize:12, color:'var(--dim)' }}>Virtual P&amp;L</span><span style={{ fontSize:13, fontWeight:800, color:'var(--grn)' }}>+₹8,420</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:12, color:'var(--dim)' }}>Win Rate</span><span style={{ fontSize:13, fontWeight:800, color:'var(--pur)' }}>71%</span></div>
              </div>
            </div>
            <div style={{ ...GC.grn, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(0,212,160,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>🇮🇳</div>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Account Aggregator</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>RBI-regulated AA sync — stocks, MFs, FDs, NPS, EPF in one SignalGenie dashboard.</div>
            </div>
            <div style={{ ...GC.ylw, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(255,184,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>📅</div>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Earnings Calendar</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>AI-predicted earnings impact for every NSE/BSE quarterly result — pre-position before the announcement.</div>
            </div>
            <div className="span2" style={{ ...GC.blu, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'center' }}>
                <div>
                  <div style={{ width:44, height:44, borderRadius:14, background:'rgba(79,111,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>🐦</div>
                  <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Twitter / X Track Record</div>
                  <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>Every scan result auto-posted publicly. Weekly accuracy scorecards — full accountability. Nothing hidden.</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {[['Week 23 Accuracy','71.4%','var(--grn)','rgba(0,212,160,0.08)','rgba(0,212,160,0.2)'],['Scans run','14','var(--txt)','rgba(0,0,0,0.25)','rgba(255,255,255,0.07)'],['↑ Strong zone','10','var(--grn)','rgba(0,0,0,0.25)','rgba(255,255,255,0.07)']].map(([l,v,c,bg,bc]) => (
                    <div key={l as string} style={{ padding:'10px 14px', background:bg as string, border:`1px solid ${bc}`, borderRadius:10, display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13 }}>{l}</span><span style={{ fontSize:14, fontWeight:900, color:c as string }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ ...GC.org, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(255,92,26,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>🇺🇸</div>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>US Markets <span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', fontWeight:600 }}>Soon</span></div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>NYSE &amp; NASDAQ technical scans for Indian LRS investors. ESPP &amp; RSU tracking included.</div>
            </div>
            <div style={{ ...GC.mix, padding:28, borderRadius:22, position:'relative', overflow:'hidden', transition:'transform .2s' }} onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-3px)')} onMouseLeave={e=>(e.currentTarget.style.transform='')}>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(79,111,250,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>📱</div>
              <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Mobile App <span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:'rgba(0,212,160,0.12)', color:'var(--grn)', fontWeight:600 }}>iOS Live</span></div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.65 }}>Full SignalGenie on iOS — scan results, alerts, portfolio sync, paper trading in your pocket. Android coming soon.</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" style={sect('clamp(60px,8vw,100px)')}>
        <div style={{ maxWidth:1160, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:52 }} className="lp-reveal">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:30, padding:'6px 16px', marginBottom:16 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--pur)' }}/>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--pur)' }}>Pricing</span>
            </div>
            <h2 style={{ fontSize:'clamp(28px,4vw,54px)', fontWeight:900, letterSpacing:-2, lineHeight:1.05, marginBottom:14 }}>
              One plan beats<br/><span style={grd('linear-gradient(135deg,var(--pur),var(--bluL),var(--grn))')}>every premium service.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>Transparent pricing. Cancel anytime. Public accuracy record — verify before you pay.</p>
          </div>

          {/* Period toggle — glassy tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:32, flexWrap:'wrap', justifyContent:'center' }} className="lp-reveal">
            <div style={{ display:'flex', gap:6, background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:5, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', flexWrap:'wrap' }}>
              {([['mo','Monthly'],['qtr','Quarterly','Save 10%'],['half','Half-Yearly','Save 17%'],['yr','Annual','Save 25%']] as [string,string,string?][]).map(([k,label,badge]) => (
                <button key={k} onClick={() => setPeriod(k as 'mo'|'qtr'|'half'|'yr')}
                  style={{ height:38, padding:'0 18px', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, transition:'all 0.2s ease',
                    background: period===k ? 'linear-gradient(135deg,rgba(79,111,250,0.55),rgba(23,64,245,0.35))' : 'transparent',
                    border: period===k ? '1px solid rgba(79,111,250,0.65)' : '1px solid transparent',
                    color: period===k ? '#fff' : 'var(--dim)',
                    boxShadow: period===k ? '0 4px 20px rgba(23,64,245,0.35),inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
                  }}>
                  {label}
                  {badge && <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:10,
                    background: period===k ? 'rgba(0,212,160,0.25)' : 'rgba(0,212,160,0.12)',
                    color:'var(--grn)', border:'1px solid rgba(0,212,160,0.3)' }}>{badge}</span>}
                </button>
              ))}
            </div>
          </div>
          {pr.note && <div style={{ textAlign:'center', fontSize:13, color:'var(--grn)', marginBottom:24, fontWeight:600 }}>{pr.note}</div>}

          {/* Plan cards */}
          <div className="lp-plans lp-reveal">
            {([
              { name:'Free',    tag:'var(--dim)',  price:'₹0',  cycle:'forever · no card', href:'/sign-in',
                cardStyle:{ ...GLS, background:'var(--surf)', borderColor:'var(--bdr)' },
                btnStyle:{ background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)' },
                feats:['India portfolio (NSE/BSE)','5 screener scans/day','Market Brief + FII/DII'], nope:['No RSU/ESPP tracker','No push alerts','No algo builder'], pro:false },
              { name:'Starter', tag:'var(--bluL)', price:pr.s,  cycle:pr.cy, href:'/sign-in?plan=starter',
                cardStyle:{ ...GC.blu },
                btnStyle:{ background:'linear-gradient(135deg,rgba(79,111,250,0.4),rgba(23,64,245,0.25))', border:'1px solid rgba(79,111,250,0.5)', color:'#fff' },
                feats:['Unlimited screener scans','Watchlist + push alerts','Paper trading (full)','Track record (accuracy)','Capital gains report'], nope:['No RSU/ESPP tracker','No algo builder'], pro:false },
              { name:'Pro',     tag:'var(--ylw)',  price:pr.p,  cycle:pr.cy, href:'/sign-in?plan=pro',
                cardStyle:{ ...GLS, background:'linear-gradient(145deg,rgba(255,184,0,0.22),rgba(255,130,0,0.12),rgba(23,64,245,0.1))', borderColor:'rgba(255,184,0,0.52)' },
                btnStyle:{ background:'linear-gradient(135deg,#FFB800,#FF8C00)', border:'none', color:'#0a0f1a' },
                feats:['RSU & ESPP tracker (E*Trade, Schwab, Shareworks)','US multi-portfolio · combined INR net worth','Algo builder + backtesting','Everything in Starter','Broker sync · coming soon','WhatsApp alerts · coming soon'], nope:[], pro:true },
              { name:'Elite',   tag:'var(--pur)',  price:pr.e,  cycle:pr.cy, href:'/sign-in?plan=elite',
                cardStyle:{ ...GC.pur },
                btnStyle:{ background:'linear-gradient(135deg,rgba(139,92,246,0.45),rgba(100,40,200,0.3))', border:'1px solid rgba(139,92,246,0.5)', color:'#fff' },
                feats:['Everything in Pro','API access (500 req/day)','Priority support','Custom ML model · coming soon','AA account sync · coming soon'], nope:[], pro:false },
            ] as const).map(plan => (
              <div key={plan.name} className={`lp-plan-card${plan.pro ? ' lp-plan-pro' : ''}`}
                style={{ ...plan.cardStyle, padding:'28px 24px', borderRadius:22, position:'relative', transform: plan.pro ? 'scale(1.04)' : 'none' }}>
                {plan.pro && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#FFB800,#FF8C00)', color:'#0a0f1a', fontSize:10, fontWeight:900, padding:'5px 18px', borderRadius:20, letterSpacing:1.5, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(255,184,0,0.5)' }}>
                    ★ BEST VALUE
                  </div>
                )}
                {/* Name + price */}
                <div style={{ fontSize:10.5, fontWeight:800, textTransform:'uppercase', letterSpacing:2, color:plan.tag, marginBottom:12, marginTop: plan.pro ? 10 : 0 }}>{plan.name}</div>
                <div style={{ fontSize:46, fontWeight:900, letterSpacing:-2.5, lineHeight:1, color:plan.tag, marginBottom:4 }}>{plan.price}</div>
                <div style={{ fontSize:11.5, color:'var(--dim)', marginBottom:24 }}>{plan.cycle}</div>
                {/* Divider */}
                <div style={{ height:1, background:'var(--bdr)', marginBottom:20 }}/>
                {/* Features */}
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, marginBottom:26 }}>
                  {plan.feats.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12.5, color:'var(--txt)', lineHeight:1.45 }}>
                      <span style={{ width:16, height:16, borderRadius:'50%', background: plan.pro ? 'rgba(255,184,0,0.2)' : 'rgba(0,212,160,0.18)', border: `1px solid ${plan.pro ? 'rgba(255,184,0,0.4)' : 'rgba(0,212,160,0.35)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, flexShrink:0, marginTop:1, color: plan.pro ? 'var(--ylw)' : 'var(--grn)', fontWeight:900 }}>✓</span>
                      {f}
                    </li>
                  ))}
                  {plan.nope.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12.5, color:'var(--dim)', lineHeight:1.45 }}>
                      <span style={{ flexShrink:0, marginTop:1 }}>–</span>{f}
                    </li>
                  ))}
                </ul>
                {/* CTA */}
                <Link href={plan.href} style={{ width:'100%', height:46, borderRadius:13, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.3, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', ...plan.btnStyle,
                  boxShadow: plan.pro ? '0 6px 32px rgba(255,184,0,0.35)' : 'none' }}>
                  {plan.pro ? 'Start Pro →' : `Get ${plan.name} →`}
                </Link>
              </div>
            ))}
          </div>

          {/* Coupon — glassy card */}
          <div style={{ marginTop:32, ...GLS, background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.1)', padding:'24px 28px', borderRadius:20 }} className="lp-reveal">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,184,0,0.15)', border:'1px solid rgba(255,184,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎟️</div>
              <div style={{ fontSize:15, fontWeight:700 }}>Have a coupon code?</div>
            </div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:14, marginLeft:42 }}>Apply a discount on any paid plan.</div>
            <div style={{ display:'flex', gap:10, maxWidth:460 }}>
              <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="e.g. SIGNAL20"
                style={{ flex:1, height:46, borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--txt)', fontSize:13, fontWeight:700, padding:'0 16px', fontFamily:'inherit', outline:'none', textTransform:'uppercase', letterSpacing:1.5, backdropFilter:'blur(12px)' }}
                onFocus={e => e.target.style.borderColor='rgba(79,111,250,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              <button onClick={applyCoupon} style={{ height:46, padding:'0 24px', borderRadius:12, background:'linear-gradient(135deg,rgba(79,111,250,0.4),rgba(23,64,245,0.25))', border:'1px solid rgba(79,111,250,0.5)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 20px rgba(23,64,245,0.25)' }}>Apply</button>
            </div>
            {couponMsg && <div style={{ fontSize:13, marginTop:10, fontWeight:600, color:couponMsg.ok?'var(--grn)':'var(--red)' }}>{couponMsg.text}</div>}
          </div>

          {/* SEBI disclaimer */}
          <div style={{ marginTop:16, padding:'14px 22px', background:'rgba(255,184,0,0.04)', border:'1px solid rgba(255,184,0,0.12)', borderRadius:14 }} className="lp-reveal">
            <p style={{ fontSize:12, color:'rgba(255,184,0,0.65)', lineHeight:1.7, margin:0 }}>
              <strong style={{ color:'var(--ylw)' }}>⚠️ SEBI DISCLAIMER:</strong> SignalGenie is <strong style={{ color:'var(--ylw)' }}>NOT registered with SEBI</strong>. This is a <strong style={{ color:'var(--ylw)' }}>technical screening tool</strong>. All scan results and computed indicators are for <strong style={{ color:'var(--ylw)' }}>informational purposes only</strong> — not financial advice, not investment recommendations. Consult a SEBI-registered Research Analyst before investing.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={sect('clamp(60px,8vw,100px)')}>
        <div style={{ maxWidth:1100, margin:'0 auto' }} className="lp-reveal">
          {/* Glassy CTA container */}
          <div style={{ ...GLS, background:'linear-gradient(145deg,rgba(23,64,245,0.18),rgba(139,92,246,0.12),rgba(255,92,26,0.08))', borderColor:'rgba(255,255,255,0.12)', borderRadius:32, padding:'clamp(52px,7vw,90px) clamp(24px,6vw,80px)', textAlign:'center', position:'relative', overflow:'hidden' }}>
            {/* Radial orbs */}
            <div style={{ position:'absolute', width:600, height:600, top:-220, left:'50%', transform:'translateX(-50%)', background:'radial-gradient(circle,rgba(23,64,245,0.2),transparent 65%)', filter:'blur(90px)', pointerEvents:'none', animation:'lp-drift1 8s ease-in-out infinite' }}/>
            <div style={{ position:'absolute', width:400, height:400, bottom:-160, left:'10%', background:'radial-gradient(circle,rgba(139,92,246,0.18),transparent 65%)', filter:'blur(70px)', pointerEvents:'none', animation:'lp-drift2 11s ease-in-out infinite' }}/>
            <div style={{ position:'absolute', width:350, height:350, bottom:-120, right:'8%', background:'radial-gradient(circle,rgba(255,92,26,0.14),transparent 65%)', filter:'blur(60px)', pointerEvents:'none', animation:'lp-drift3 9s ease-in-out infinite' }}/>
            {/* Content */}
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:30, padding:'6px 16px', marginBottom:20 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--grn)', animation:'blink 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.7)' }}>Get Started Today</span>
              </div>
              <h2 style={{ fontSize:'clamp(32px,5.5vw,68px)', fontWeight:900, letterSpacing:-2.5, lineHeight:.92, marginBottom:20 }}>
                Stop paying for<br/>
                <span style={grd('linear-gradient(135deg,var(--org) 0%,var(--ylw) 50%,var(--org) 100%)')}>unverified calls.</span>
              </h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', maxWidth:480, margin:'0 auto 44px', lineHeight:1.75 }}>
                Free to start. Public track record every week. Verify the accuracy before you spend a single rupee.
              </p>
              {/* CTA buttons */}
              <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
                <Link href="/sign-in" style={{ height:56, padding:'0 36px', borderRadius:16, fontSize:16, fontWeight:800, background:'linear-gradient(135deg,var(--blu),var(--bluL))', color:'#fff', boxShadow:'0 10px 48px rgba(23,64,245,0.5),inset 0 1px 0 rgba(255,255,255,0.2)', display:'flex', alignItems:'center', textDecoration:'none', letterSpacing:0.3 }}>
                  Start Free — No Card Needed →
                </Link>
                <Link href="/dashboard/track-record" style={{ height:56, padding:'0 32px', borderRadius:16, fontSize:16, fontWeight:700, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', alignItems:'center', textDecoration:'none', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  View Track Record
                </Link>
              </div>
              {/* Trust strip */}
              <div style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
                {['NSE · BSE','4,000+ stocks','71.4% accuracy','Live on Twitter/X'].map(t => (
                  <span key={t} style={{ fontSize:12, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'inline-block' }}/>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--bdr)', padding:'40px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:32 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:19, fontWeight:900, letterSpacing:-0.5, marginBottom:6 }}><SignalLogo /> SignalGenie</div>
            <div style={{ fontSize:12, color:'var(--dim)', maxWidth:260, lineHeight:1.6 }}>AI-powered trading intelligence for NSE &amp; BSE. Not SEBI registered. Not financial advice.</div>
          </div>
          <div style={{ display:'flex', gap:48, flexWrap:'wrap' }}>
            {([
              { h:'Platform', links:[
                { label:'Portfolio Analysis',  href:'/auth' },
                { label:'AI Technical Scan',   href:'/signals' },
                { label:'Algo Builder',        href:'/auth' },
                { label:'Paper Trading',       href:'/auth' },
              ]},
              { h:'Company', links:[
                { label:'Track Record',       href:'/track-record' },
                { label:'Support',            href:'/support' },
                { label:'Privacy Policy',     href:'/privacy' },
                { label:'SEBI Disclaimer',    href:'/risk-disclosure' },
              ]},
              { h:'Connect', links:[
                { label:'Twitter / X',  href:'https://twitter.com/signalgenie_in' },
                { label:'Contact',      href:'mailto:support@signalgenie.ai' },
              ]},
            ] as { h:string; links:{label:string;href:string}[] }[]).map(col => (
              <div key={col.h}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'var(--dim2)', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>{col.h}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {col.links.map(l => (
                    <a key={l.label} href={l.href}
                      target={l.href.startsWith('http') || l.href.startsWith('mailto') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={{ fontSize:13, color:'var(--dim)', textDecoration:'none' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='var(--txt)')}
                      onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth:1200, margin:'24px auto 0', paddingTop:20, borderTop:'1px solid var(--bdr)', fontSize:12, color:'var(--dim2)', lineHeight:1.7 }}>
          © 2026 SignalGenie · Built by Vaasudev Amitav &amp; Sai Kumar Bethala &nbsp;·&nbsp;
          <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> &nbsp;·&nbsp;
          Technical scan results for educational purposes only &nbsp;·&nbsp; Not financial advice &nbsp;·&nbsp; DYOR
        </div>
      </footer>

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
