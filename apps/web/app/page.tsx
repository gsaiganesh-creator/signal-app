'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const SignalLogo = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.18"/>
    <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
  </svg>
);

const PRICE: Record<string, { s:string; p:string; e:string; cy:string; note:string }> = {
  mo:   { s:'₹199',   p:'₹599',    e:'₹1,499',  cy:'per month · cancel anytime',        note:'' },
  qtr:  { s:'₹540',   p:'₹1,620',  e:'₹4,050',  cy:'per quarter (3 months) · save 10%', note:'🎉 Quarterly saves 10% vs monthly.' },
  half: { s:'₹999',   p:'₹2,995',  e:'₹7,495',  cy:'per 6 months · save 17%',           note:'💰 Half-yearly billing saves 17%.' },
  yr:   { s:'₹1,790', p:'₹5,388',  e:'₹13,490', cy:'per year · best value — save 25%',  note:'🏆 Annual plan = 3 months free. Billed once.' },
};

const COUPONS: Record<string, string> = {
  SIGNAL20:  '20% off your first payment',
  LAUNCH50:  '50% off — launch special!',
  EARLYBIRD: '30% off early bird discount',
  VSIGNAL:   'Free 1-month Pro upgrade',
};

export default function LandingPage() {
  const [period, setPeriod] = useState<'mo'|'qtr'|'half'|'yr'>('mo');
  const [coupon, setCoupon]  = useState('');
  const [couponMsg, setCouponMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const pr = PRICE[period];

  function applyCoupon() {
    const c = coupon.trim().toUpperCase();
    if (!c) { setCouponMsg({ text: 'Enter a coupon code.', ok: false }); return; }
    if (COUPONS[c]) setCouponMsg({ text: `✅ Code applied! ${COUPONS[c]}`, ok: true });
    else            setCouponMsg({ text: '❌ Invalid code. Check spelling.', ok: false });
  }

  return (
    <div data-theme="dark" style={{ background:'#070D1A', color:'#FFFFFF', minHeight:'100vh' }}>
      {/* SEBI Banner */}
      <div style={{ background:'rgba(255,184,0,0.08)', borderBottom:'1px solid rgba(255,184,0,0.2)', padding:'9px 5vw', display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', gap:10 }}>
        <span style={{ fontSize:12, color:'var(--ylw)', lineHeight:1.5 }}>⚠️ <strong>IMPORTANT DISCLAIMER:</strong> SIGNAL is <strong>NOT SEBI registered</strong>. All signals, picks, and analysis are for <strong>informational and educational purposes only</strong>. Not financial advice. Trade at your own risk.</span>
      </div>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:62, padding:'0 clamp(16px,4vw,48px)', background:'rgba(7,13,26,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>

        {/* Logo — left */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:19, fontWeight:900, letterSpacing:-0.5, color:'#fff', justifySelf:'start', flexShrink:0 }}>
          <SignalLogo /> SIGNAL
        </Link>

        {/* Centered nav groups — hidden on mobile via pub-nav-center */}
        <div className="pub-nav-center" style={{ display:'flex', alignItems:'center', gap:2 }}>
          {/* Product dropdown */}
          {[
            { id:'product', label:'Product', items:[
              { h:'#portfolio', l:'Portfolio Analysis', sub:'ML-classified holdings' },
              { h:'#etf-mf',    l:'ETF & Mutual Funds', sub:'SIP optimizer + signals' },
              { h:'#signals',   l:'Live Signals',       sub:'BUY / HOLD / SELL scores' },
              { h:'#algo',      l:'Algo Builder',       sub:'Build & generate Python' },
              { h:'#paper',     l:'Paper Trade',        sub:'Test risk-free' },
            ]},
            { id:'company', label:'Company', items:[
              { h:'/track-record', l:'Track Record', sub:'Every call, public & tracked' },
              { h:'/about',        l:'About',         sub:'Mission & team' },
            ]},
          ].map(group => (
            <div key={group.id} style={{ position:'relative' }}
              onMouseEnter={() => setOpenMenu(group.id)}
              onMouseLeave={() => setOpenMenu(null)}>
              <button style={{ height:36, padding:'0 14px', border:'none', background:'transparent', color: openMenu === group.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5, borderRadius:8, transition:'color 0.15s', whiteSpace:'nowrap' }}>
                {group.label}
                <svg width="10" height="6" viewBox="0 0 10 6" style={{ opacity:0.5, transition:'transform 0.15s', transform: openMenu === group.id ? 'rotate(180deg)' : 'none' }}>
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </button>
              {openMenu === group.id && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'rgba(10,18,34,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:8, minWidth:230, backdropFilter:'blur(24px)', boxShadow:'0 16px 48px rgba(0,0,0,0.5)', zIndex:200 }}>
                  {group.items.map(item => (
                    <a key={item.h} href={item.h} style={{ display:'block', padding:'9px 12px', borderRadius:9, color:'rgba(255,255,255,0.85)', textDecoration:'none', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{item.l}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{item.sub}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a href="#pricing" style={{ height:36, padding:'0 14px', display:'flex', alignItems:'center', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.6)', textDecoration:'none', borderRadius:8, whiteSpace:'nowrap', transition:'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color='#fff')}
            onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.6)')}>
            Pricing
          </a>
          <a href="#download" style={{ height:34, padding:'0 12px', display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'var(--grn)', textDecoration:'none', borderRadius:8, border:'1px solid rgba(0,212,160,0.25)', whiteSpace:'nowrap' }}>
            ↓ Get App
          </a>
        </div>

        {/* Right CTA — always visible */}
        <div className="pub-nav-right" style={{ justifySelf:'end', display:'flex', alignItems:'center', gap:8 }}>
          <Link href="/sign-in" style={{ height:34, padding:'0 14px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.16)', color:'rgba(255,255,255,0.85)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', whiteSpace:'nowrap', textDecoration:'none' }}>Sign In</Link>
          <Link href="/sign-in" style={{ height:34, padding:'0 16px', borderRadius:8, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', whiteSpace:'nowrap', textDecoration:'none' }}>Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding:'72px clamp(20px,6vw,120px) 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:800, height:800, top:-300, left:'50%', transform:'translateX(-50%)', background:'radial-gradient(circle,rgba(23,64,245,0.16) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:500, height:500, bottom:-100, right:-100, background:'radial-gradient(circle,rgba(255,92,26,0.1) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px 5px 10px', borderRadius:20, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.28)', fontSize:12, fontWeight:600, color:'var(--bluL)', marginBottom:28 }}>
            <span className="live-dot"/> Live · NSE &amp; BSE · 4,000+ stocks
          </div>
          <h1 style={{ fontSize:'clamp(36px,5.5vw,72px)', fontWeight:900, letterSpacing:-2.5, lineHeight:0.97, marginBottom:24 }}>
            ML-Powered Trading<br/>
            <span style={{ color:'var(--blu)' }}>Without the</span><br/>
            <span style={{ color:'var(--org)' }}>₹20,000 Price Tag</span>
          </h1>
          <p style={{ fontSize:'clamp(16px,2vw,19px)', color:'var(--dim)', lineHeight:1.65, maxWidth:620, margin:'0 auto 40px' }}>
            Portfolio analysis, Random Forest signals, Algo Builder, Paper Trading, and live broker sync — everything premium services charge you a fortune for, at ₹299/month.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/sign-in" style={{ height:54, padding:'0 32px', borderRadius:14, fontSize:16, fontWeight:700, background:'linear-gradient(135deg,var(--blu),var(--bluL))', color:'#fff', boxShadow:'0 8px 32px rgba(23,64,245,0.38)', display:'flex', alignItems:'center' }}>Start Free — No Card Needed →</Link>
            <button style={{ height:54, padding:'0 32px', borderRadius:14, fontSize:16, fontWeight:700, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', cursor:'pointer' }}>Watch Demo ▶</button>
          </div>
          <div style={{ display:'flex', gap:40, justifyContent:'center', flexWrap:'wrap', marginTop:40, alignItems:'center' }}>
            {[
              { v:'71.4%', c:'var(--grn)', l:'90-day signal accuracy' },
              { v:'₹299',  c:'var(--txt)', l:'vs ₹5,000+/mo elsewhere' },
              { v:'4,000+',c:'var(--blu)', l:'NSE · BSE stocks tracked' },
              { v:'6',     c:'var(--org)', l:'brokers supported' },
            ].map((s, i) => (
              <div key={i} style={{ display:'contents' }}>
                {i > 0 && <div style={{ width:1, height:44, background:'var(--bdr)' }}/>}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:30, fontWeight:900, letterSpacing:-1, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', marginTop:3 }}>{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--bluL)', marginBottom:12 }}>How It Works</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>From account to signals<br/>in under 5 minutes</h2>
          <div className="g4" style={{ display:'grid', border:'1px solid var(--bdr)', borderRadius:16, overflow:'hidden', marginTop:40 }}>
            {[
              { n:1, c:'var(--bluL)', bg:'rgba(23,64,245,0.12)', title:'Connect your broker', desc:'Link mStock, Zerodha, Upstox, Angel One or upload your Excel portfolio. Secure OAuth — we never see your credentials.' },
              { n:2, c:'var(--pur)',  bg:'rgba(139,92,246,0.12)', title:'ML classifies your portfolio', desc:"Random Forest model analyses your holdings and tags each stock: Momentum, Swing, Long Term, Exit Now, or Watch." },
              { n:3, c:'var(--grn)', bg:'rgba(0,212,160,0.12)',  title:'Real-time signals & alerts', desc:'Get instant BUY / HOLD / SELL signals with confidence scores, Twitter sentiment, key stats, and delivery volume analysis.' },
              { n:4, c:'var(--org)', bg:'rgba(255,92,26,0.12)',  title:'Build, paper-trade, deploy', desc:'Build your own algo, paper-trade it risk-free for 1–4 weeks, then deploy to your broker when you\'re confident.' },
            ].map((step, i) => (
              <div key={i} style={{ padding:28, borderRight: i < 3 ? '1px solid var(--bdr)' : 'none', position:'relative' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:step.bg, color:step.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, marginBottom:16 }}>{step.n}</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>{step.title}</div>
                <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>{step.desc}</div>
                {i < 3 && <div style={{ position:'absolute', right:-12, top:38, width:24, height:24, background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--dim)', zIndex:1 }}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--org)', marginBottom:12 }}>The Real Cost</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Stop paying ₹15,000/month<br/>for unverified calls</h2>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:40 }}>Telegram channels and PMS services charge a fortune with zero public accuracy records. SIGNAL publishes every signal on Twitter with full P&L accountability.</p>

          <div style={{ overflowX:'auto', borderRadius:16, border:'1px solid var(--bdr)', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:680 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  {['Service','Monthly Cost','Accuracy Proof','Personalized','Algo Builder','Paper Trading'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', color:'var(--dim)', borderBottom:'1px solid var(--bdr)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Premium Telegram Channels','₹2,000–₹15,000','❌ None','❌ Mass broadcast','❌','❌'],
                  ['SEBI-Registered Advisors','₹3,000–₹8,000','⚠️ Partial','⚠️ Limited','❌','❌'],
                  ['Algo Trading Courses','₹20,000–₹50,000 one-time','❌ No live signals','❌','⚠️ DIY only','❌'],
                  ['PMS / Portfolio Mgmt','₹25L minimum invest','⚠️ Annual report','✅','❌','❌'],
                ].map((row, ri) => (
                  <tr key={ri} style={{ borderBottom:'1px solid var(--bdr)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding:'11px 16px', fontWeight: ci===0 ? 600 : 400, color: ci===1 ? 'var(--red)' : 'inherit' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background:'rgba(23,64,245,0.05)' }}>
                  <td style={{ padding:'13px 16px', fontWeight:800, color:'var(--bluL)' }}>✨ SIGNAL Pro</td>
                  <td style={{ padding:'13px 16px', fontWeight:800, color:'var(--grn)' }}>₹599 / month</td>
                  <td style={{ padding:'13px 16px', color:'var(--grn)' }}>✅ Twitter public log</td>
                  <td style={{ padding:'13px 16px', color:'var(--grn)' }}>✅ ML-personalized</td>
                  <td style={{ padding:'13px 16px', color:'var(--grn)' }}>✅ Full</td>
                  <td style={{ padding:'13px 16px', color:'var(--grn)' }}>✅ Risk-free</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:20 }}>
            <div style={{ background:'rgba(255,59,92,0.05)', border:'1px solid rgba(255,59,92,0.18)', borderRadius:14, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--red)', marginBottom:12 }}>What you pay for now</div>
              {['₹5,000–₹20,000/mo · no accuracy proof','Blasted to 50,000 subscribers','Human bias, no backtesting','No algo builder or paper trading'].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13, color:'var(--dim)' }}>
                  <span style={{ color:'var(--red)', flexShrink:0, fontWeight:700 }}>✕</span>{item}
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(0,212,160,0.04)', border:'1px solid rgba(0,212,160,0.18)', borderRadius:14, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grn)', marginBottom:12 }}>What SIGNAL gives you</div>
              {['₹199–₹599/mo · 10–75× cheaper','ML-personalized for your stocks','Public accuracy record on X/Twitter','Algo builder + paper trading included'].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13, color:'var(--dim)' }}>
                  <span style={{ color:'var(--grn)', flexShrink:0, fontWeight:700 }}>✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Intelligence */}
      <section id="portfolio" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="g-mission" style={{ display:'grid', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--bluL)', marginBottom:12 }}>Portfolio Intelligence</div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Your holdings,<br/>classified by ML</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:28 }}>Connect your broker via secure OAuth or upload an Excel file. SIGNAL's ML model instantly classifies every stock into actionable categories — and syncs live P&L.</p>
              {[
                { t:'6 Brokers Supported', d:'mStock · Zerodha · Upstox · Angel One · HDFC Sec · Groww — or upload .xlsx / .csv' },
                { t:'Live Portfolio Sync', d:'Real-time holdings, LTP, P&L, delivery %. Syncs every 30 seconds during market hours.' },
                { t:'Excel / CSV Import', d:'NSE/BSE symbol format. Paste your Zerodha Console export — it just works.' },
              ].map((m, i) => (
                <div key={i} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{m.t}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.55 }}>{m.d}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:18, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:800 }}>Portfolio Analysis</div>
                <div style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(0,212,160,0.12)', border:'1px solid rgba(0,212,160,0.3)', color:'var(--grn)' }}>ML ✓ Live</div>
              </div>
              <div style={{ display:'grid', gap:8, marginBottom:16 }}>
                {[['MS','mStock','Connected ✓','#E63946','rgba(230,57,70,0.12)'],['ZE','Zerodha','Connect →','#387ED1','rgba(56,126,209,0.12)'],['UP','Upstox','Connect →','#7B2FBE','rgba(123,47,190,0.12)']].map(([ab,name,tag,c,bg]) => (
                  <div key={ab} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:bg, color:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>{ab}</div>
                    <div><div style={{ fontSize:13, fontWeight:700 }}>{name}</div><div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{tag}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gap:8 }}>
                {[
                  { label:'🚀 Momentum (5)', stocks:'RELIANCE, TATAMOTORS, SBIN, INDUSINDBK, ADANIENT', c:'var(--grn)', bg:'rgba(0,212,160,0.07)', bc:'rgba(0,212,160,0.2)' },
                  { label:'🔄 Swingable (4)', stocks:'HDFCBANK, WIPRO, BAJFINANCE, LTIM', c:'var(--bluL)', bg:'rgba(23,64,245,0.07)', bc:'rgba(23,64,245,0.2)' },
                  { label:'🏛️ Long Term (5)', stocks:'TCS, INFY, HINDUNILVR, NESTLEIND, ASIANPAINT', c:'var(--pur)', bg:'rgba(139,92,246,0.07)', bc:'rgba(139,92,246,0.2)' },
                  { label:'⚠️ Exit Now (2)', stocks:'ZOMATO, PAYTM — below key support', c:'var(--red)', bg:'rgba(255,59,92,0.07)', bc:'rgba(255,59,92,0.2)' },
                ].map((cls) => (
                  <div key={cls.label} style={{ padding:'11px 14px', borderRadius:12, background:cls.bg, border:`1px solid ${cls.bc}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:cls.c, marginBottom:3 }}>{cls.label}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.4 }}>{cls.stocks}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signals */}
      <section id="signals" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="g-mission" style={{ display:'grid', alignItems:'center' }}>
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:18, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div><div style={{ fontSize:18, fontWeight:800 }}>RELIANCE</div><div style={{ fontSize:12, color:'var(--dim)' }}>Reliance Industries · NSE</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:26, fontWeight:900, letterSpacing:-1 }}>₹2,912</div><div style={{ fontSize:13, color:'var(--grn)', fontWeight:700 }}>▲ +1.80%</div></div>
              </div>
              <svg width="100%" height="44" viewBox="0 0 360 44" preserveAspectRatio="none" style={{ marginBottom:12 }}>
                <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00D4A0" stopOpacity={0.2}/><stop offset="100%" stopColor="#00D4A0" stopOpacity={0}/></linearGradient></defs>
                <path d="M0,40 C30,36 55,32 80,24 S130,16 160,12 S220,8 250,6 L300,4 L360,2 L360,44 L0,44Z" fill="url(#sg)"/>
                <path d="M0,40 C30,36 55,32 80,24 S130,16 160,12 S220,8 250,6 L300,4 L360,2" fill="none" stroke="#00D4A0" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ background:'rgba(0,212,160,0.07)', border:'1px solid rgba(0,212,160,0.22)', borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)' }}>🚀 MOMENTUM</div>
                  <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:6, background:'rgba(0,212,160,0.18)', color:'var(--grn)', border:'1px solid rgba(0,212,160,0.35)' }}>STRONG BUY</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:'87%', background:'linear-gradient(90deg,var(--grn),#00A87D)', borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:5 }}>Confidence <span style={{ color:'var(--grn)', fontWeight:700 }}>87%</span> · Updated 2 min ago</div>
              </div>
              <div style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>𝕏 Twitter Sentiment</span>
                  <span style={{ fontSize:11, color:'var(--dim)' }}>212 posts · 24h</span>
                </div>
                <div style={{ height:8, borderRadius:4, overflow:'hidden', background:'rgba(255,59,92,0.2)', marginBottom:5 }}>
                  <div style={{ height:'100%', width:'76%', borderRadius:4, background:'linear-gradient(90deg,var(--grn),#00A87D)' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'var(--grn)', fontWeight:700 }}>76% Bullish</span>
                  <span style={{ color:'var(--red)', fontWeight:700 }}>24% Bearish</span>
                </div>
              </div>
              <div className="g3" style={{ display:'grid', gap:8 }}>
                {[['Mkt Cap','₹19.7L Cr'],['P/E','28.4×'],['Delivery%','63.2%']].map(([k,v]) => (
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--dim)' }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--grn)', marginBottom:12 }}>Signals &amp; Stock Intelligence</div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Buy. Hold. Sell.<br/>Know exactly why.</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:28 }}>Every signal comes with a confidence score, Twitter/X sentiment analysis, delivery volume %, key fundamentals, and an ML-generated insight — not a human's guess.</p>
              {[
                { t:'Real-time Signals', d:'BUY / HOLD / SELL with confidence %. Updated every 2 minutes during market hours. Instant push alert when a signal fires.' },
                { t:'𝕏 Twitter Sentiment', d:'Live Twitter/X sentiment score per stock — bullish %, post volume, and 24h trend shift. Confirm signals with the crowd.' },
                { t:'Key Stats', d:'Market cap, P/E, beta, 52W high/low, delivery %, institutional activity — all on one screen per stock.' },
              ].map((m, i) => (
                <div key={i} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px', marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{m.t}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.55 }}>{m.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ETF & Mutual Funds */}
      <section id="etf-mf" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="g-mission" style={{ display:'grid', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--ylw)', marginBottom:12 }}>ETF &amp; Mutual Funds</div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Your SIPs and ETFs,<br/>now intelligent.</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:28 }}>SIGNAL tracks your complete wealth picture — not just direct equity. Mutual funds, index ETFs, sectoral ETFs, and SIP portfolios are ML-classified and signal-analysed alongside your stocks.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { title:'MF Signal Engine', desc:'Analyses NAV history, AMC category performance, and benchmark tracking. Classifies each fund as: Continue SIP · Pause · Switch Fund · Redeem.' },
                  { title:'ETF Premium/Discount Tracker', desc:'For NIFTYBEES, GOLDBEES, BANKBEES and 50+ ETFs — tracks live premium/discount to NAV so you always buy at fair value.' },
                  { title:'SIP Optimizer', desc:"Recommends whether to pause, continue, or increase your SIP based on index P/E valuation, market cycle, and fund's alpha vs. benchmark." },
                ].map(c => (
                  <div key={c.title} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 18px' }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{c.title}</div>
                    <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.55 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:18, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div><div style={{ fontSize:15, fontWeight:800 }}>MF &amp; ETF Portfolio</div><div style={{ fontSize:12, color:'var(--dim)' }}>Abhay Vittal · 3 funds</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:22, fontWeight:900, color:'var(--grn)' }}>+24.5%</div><div style={{ fontSize:11, color:'var(--dim)' }}>overall returns</div></div>
              </div>
              <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.07),rgba(23,64,245,0.05))', border:'1px solid rgba(0,212,160,0.18)', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:3 }}>Total Invested</div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:-0.5 }}>₹1,23,000</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:12, color:'var(--dim)' }}>Current Value</span>
                  <span style={{ fontSize:14, fontWeight:800, color:'var(--grn)' }}>₹1,53,140 <span style={{ fontSize:11 }}>▲ +₹30,140</span></span>
                </div>
              </div>
              {[
                { icon:'MI', ibg:'rgba(0,122,255,0.12)', ic:'#007AFF', name:'Mirae Asset Large Cap', sub:'Direct Growth · SIP ₹3,000/mo', ret:'+16.3%', sig:'Continue SIP ✓', sbg:'rgba(0,212,160,0.1)', sc:'var(--grn)' },
                { icon:'NB', ibg:'rgba(255,184,0,0.12)', ic:'var(--ylw)', name:'NIFTYBEES (ETF)', sub:'NIFTY 50 Index · 180 units', ret:'+12.0%', sig:'Add on dips ↓', sbg:'rgba(23,64,245,0.1)', sc:'var(--bluL)' },
                { icon:'SB', ibg:'rgba(139,92,246,0.12)', ic:'var(--pur)', name:'SBI Small Cap Fund', sub:'Direct Growth · SIP ₹2,000/mo', ret:'+40.0%', sig:'🚀 Top performer', sbg:'rgba(255,92,26,0.1)', sc:'var(--org)' },
              ].map(f => (
                <div key={f.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--bdr)' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:f.ibg, color:f.ic, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{f.icon}</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700 }}>{f.name}</div><div style={{ fontSize:11, color:'var(--dim)' }}>{f.sub}</div></div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'var(--grn)' }}>{f.ret}</div>
                    <div style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:f.sbg, color:f.sc, marginTop:3 }}>{f.sig}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Account Aggregator */}
      <section id="aa" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="g-mission" style={{ display:'grid', alignItems:'center' }}>
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:18, padding:22 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--grn)', flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:700 }}>Jaitik · AA sync complete</span>
                <span style={{ fontSize:11, color:'var(--grn)', marginLeft:'auto' }}>4 institutions linked</span>
              </div>
              <div style={{ display:'grid', gap:10, marginBottom:16 }}>
                {[
                  { logo:'SBI', lc:'#E63946', name:'Savings Bank', val:'₹2.1L' },
                  { logo:'HDFC', lc:'#387ED1', name:'FD Portfolio', val:'₹5.0L' },
                  { logo:'mSt', lc:'var(--org)', name:'Stocks & ETF', val:'₹8.4L' },
                  { logo:'MF', lc:'var(--pur)', name:'Mutual Funds', val:'₹3.2L' },
                ].map(inst => (
                  <div key={inst.logo} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:16, fontWeight:900, color:inst.lc, marginBottom:4 }}>{inst.logo}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginBottom:2 }}>{inst.name}</div>
                    <div style={{ fontSize:16, fontWeight:800 }}>{inst.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding:14, background:'linear-gradient(135deg,rgba(0,212,160,0.06),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.15)', borderRadius:12 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6 }}>Total Wealth Tracked by SIGNAL</div>
                <div style={{ fontSize:28, fontWeight:900, letterSpacing:-1 }}>₹18,70,000</div>
                <div style={{ display:'flex', gap:16, marginTop:8, fontSize:12 }}>
                  <span style={{ color:'var(--grn)' }}>▲ +12.4% YoY</span>
                  <span style={{ color:'var(--dim)' }}>Across all instruments</span>
                </div>
              </div>
              <div style={{ marginTop:12, fontSize:11, color:'var(--dim)', lineHeight:1.6 }}>🔒 Secured by RBI Account Aggregator framework · Consent ID: AA-2024-JT-****</div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--grn)', marginBottom:12 }}>Account Aggregator (AA)</div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>One tap to sync<br/>every investment<br/>you&apos;ve ever made.</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:28 }}>Like IndMoney and Smallcase, SIGNAL uses India&apos;s RBI-regulated Account Aggregator framework — a government-authorised data-sharing system that lets you securely share your financial data across institutions with a single consent.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { title:'What AA brings in automatically', desc:'NSE/BSE stocks · Mutual funds (all AMCs) · Fixed deposits · NPS pension · EPF · PPF · Insurance policies — all in one SIGNAL dashboard.' },
                  { title:'Consent-based. Government-authorised.', desc:"SIGNAL registers as a Financial Information User (FIU) with ReBIT (RBI's subsidiary). You give consent via your bank's AA app — we never see your passwords or credentials." },
                  { title:'Revoke anytime', desc:"Your consent is time-limited and purpose-limited. Revoke from your bank's app at any time. SIGNAL cannot read data after consent is revoked." },
                ].map(c => (
                  <div key={c.title} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 18px' }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{c.title}</div>
                    <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.55 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Algo Builder */}
      <section id="algo" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--org)', marginBottom:12 }}>Algo Builder</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Build your strategy.<br/>Generate the code.</h2>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:48 }}>Pick a strategy type, select indicators, set entry and exit conditions. SIGNAL generates production-ready Python — with 1-year backtested results.</p>
          <div className="g-mission" style={{ display:'grid', alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Strategy Type</div>
                <div style={{ display:'grid', gap:8 }}>
                  {[
                    { e:'🚀',icon:'Momentum',    sub:'RSI + volume surge', active:true, c:'var(--org)', bg:'rgba(255,92,26,0.08)', bc:'rgba(255,92,26,0.25)' },
                    { e:'📈',icon:'Trend Following', sub:'EMAs + ADX', active:false },
                    { e:'🔄',icon:'Mean Reversion', sub:'Bollinger bounce', active:false },
                    { e:'⚡',icon:'Breakout',     sub:'ATR range break', active:false },
                  ].map(st => (
                    <div key={st.icon} style={{ padding:'10px 12px', borderRadius:10, background: st.active ? st.bg : 'var(--surf2)', border:`1px solid ${st.active ? st.bc : 'var(--bdr)'}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color: st.active ? st.c : 'var(--txt)' }}>{st.e} {st.icon}</div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{st.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Indicators</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {['RSI (14) ✕','EMA 20/50 ✕'].map(t => (
                    <span key={t} style={{ padding:'4px 11px', borderRadius:20, background:'rgba(23,64,245,0.15)', border:'1px solid rgba(23,64,245,0.4)', fontSize:12, fontWeight:700, color:'var(--bluL)' }}>{t}</span>
                  ))}
                  {['+ MACD','+ Bollinger','+ ADX','+ ATR','+ Volume','+ Stoch'].map(t => (
                    <span key={t} style={{ padding:'4px 11px', borderRadius:20, background:'var(--surf2)', border:'1px solid var(--bdr)', fontSize:12, color:'var(--dim)' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Conditions</div>
                {[
                  { label:'RSI', op:'<', val:'35', note:'oversold', c:'var(--grn)', bg:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)', vc:'rgba(0,212,160,0.15)' },
                  { label:'EMA20', op:'>', val:'EMA50', note:'golden cross', c:'var(--grn)', bg:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)', vc:'rgba(0,212,160,0.15)' },
                  { label:'Stop Loss', op:'=', val:'2.5%', note:'trailing', c:'var(--red)', bg:'rgba(255,59,92,0.05)', bc:'rgba(255,59,92,0.2)', vc:'rgba(255,59,92,0.12)' },
                ].map(cond => (
                  <div key={cond.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 11px', borderRadius:9, marginBottom:7, background:cond.bg, border:`1px solid ${cond.bc}` }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:cond.c, flexShrink:0 }}/>
                    <span style={{ fontSize:12, fontWeight:700, minWidth:52 }}>{cond.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:cond.c }}>{cond.op}</span>
                    <span style={{ fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:6, background:cond.vc, color:cond.c }}>{cond.val}</span>
                    <span style={{ fontSize:11, color:'var(--dim)' }}>{cond.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ background:'#0D1117', border:'1px solid #21262D', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', background:'#161B22', borderBottom:'1px solid #21262D' }}>
                  <span style={{ fontSize:12, color:'#8B949E', fontFamily:'monospace' }}>signal_rsi_ema.py</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, background:'rgba(23,64,245,0.15)', color:'var(--bluL)', border:'1px solid rgba(23,64,245,0.3)' }}>⎘ Copy</span>
                </div>
                <div style={{ padding:16, fontFamily:'monospace', fontSize:12, lineHeight:1.7 }}>
                  {[
                    ['#68D391','# SIGNAL Strategy · RSI + EMA Crossover'],
                    ['#68D391','# Generated by SIGNAL · NSE · Jun 2026'],
                    ['',''],
                    ['#79C0FF','import pandas as pd, numpy as np'],
                    ['',''],
                    ['#F6C90E','RSI_LOW, RSI_HIGH = 35, 70'],
                    ['#F6C90E','EMA_FAST, EMA_SLOW = 20, 50'],
                    ['#F6C90E','STOP_LOSS, TARGET = 2.5, 6.0'],
                    ['',''],
                    ['#FF7D46','def signal(df):'],
                    ['#E2E8F0','    r    = rsi(df["close"])'],
                    ['#E2E8F0','    fast = df["close"].ewm(span=EMA_FAST).mean()'],
                    ['#E2E8F0','    slow = df["close"].ewm(span=EMA_SLOW).mean()'],
                    ['#E2E8F0','    if r.iloc[-1] < RSI_LOW and fast > slow:'],
                    ['#68D391','        return "BUY"'],
                    ['#E2E8F0','    if r.iloc[-1] > RSI_HIGH:'],
                    ['#FC8181','        return "SELL"'],
                    ['#E2E8F0','    return "HOLD"'],
                  ].map(([c, line], i) => <div key={i} style={{ color: c || 'transparent', whiteSpace:'pre' }}>{line || ' '}</div>)}
                </div>
              </div>
              <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, marginBottom:12 }}>1Y BACKTEST RESULTS</div>
                <div className="g4" style={{ display:'grid', gap:10 }}>
                  {[['var(--grn)','+24.3%','Returns'],['var(--bluL)','1.84','Sharpe Ratio'],['var(--grn)','64%','Win Rate'],['var(--red)','−8.2%','Max Drawdown']].map(([c,v,l]) => (
                    <div key={l} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:11, padding:'12px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:900, color:c }}>{v}</div>
                      <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Paper Trading */}
      <section id="paper" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--pur)', marginBottom:12 }}>Paper Trading</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Test your algo with<br/>real market data.<br/><span style={{ color:'var(--pur)' }}>Zero real money.</span></h2>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:0 }}>Before you risk a single rupee, run your strategy in live market conditions. Watch it fire signals, track virtual P&amp;L, tweak parameters — then go live when you're confident.</p>
          <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.07),rgba(23,64,245,0.05))', border:'1px solid rgba(139,92,246,0.18)', borderRadius:20, padding:40, marginTop:48 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--pur)', animation:'blink 2s infinite' }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--pur)' }}>Paper Trading · RSI + EMA Strategy · Running Day 6 of 7</span>
            </div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20 }}>Virtual capital: ₹1,00,000 · Stocks: RELIANCE, HDFCBANK, INFY</div>
            <div className="g4" style={{ display:'grid', gap:14 }}>
              {[['var(--grn)','₹1,08,420','Virtual Portfolio'],['var(--grn)','+8.4%','Paper Returns'],['var(--txt)','7','Signals Fired'],['var(--grn)','5/7','Win Rate (71%)']].map(([c,v,l]) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:c }}>{v}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(0,0,0,0.2)', border:'1px solid var(--bdr)', borderRadius:12, padding:16, marginTop:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', letterSpacing:0.5, marginBottom:10 }}>SIGNAL LOG</div>
              {[
                ['Jun 18 09:31','BUY','var(--grn)','rgba(0,212,160,0.12)','RELIANCE','@ ₹2,880 · RSI=34, EMA cross ✓','+₹1,632 virtual','var(--grn)'],
                ['Jun 17 14:22','SELL','var(--red)','rgba(255,59,92,0.12)','INFY','@ ₹1,498 · RSI=72, target hit ✓','+₹2,340 virtual','var(--grn)'],
                ['Jun 16 10:05','HOLD','var(--ylw)','rgba(255,184,0,0.12)','HDFCBANK','@ ₹1,620 · waiting for RSI confirmation','—','var(--dim)'],
              ].map(([date,sig,sc,sbg,sym,desc,pl,plc]) => (
                <div key={date} style={{ marginBottom:8, paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ padding:'2px 8px', borderRadius:5, background:sbg, color:sc, fontWeight:700, fontSize:11, flexShrink:0 }}>{sig}</span>
                    <span style={{ fontWeight:700, fontSize:13 }}>{sym}</span>
                    <span style={{ marginLeft:'auto', color:plc, fontWeight:800, fontSize:13, flexShrink:0 }}>{pl}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, gap:8 }}>
                    <span style={{ color:'var(--dim)', fontSize:11, lineHeight:1.4 }}>{desc}</span>
                    <span style={{ color:'var(--dim2)', fontSize:10, flexShrink:0 }}>{date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Track Record tweets */}
      <section style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--bluL)', marginBottom:12 }}>Track Record</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Every call is public.<br/>Every result is tracked.</h2>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:0 }}>Vaasudev Amitav posts every signal on Twitter the moment it fires — with entry, target, and stop loss. Weekly scorecards show exact accuracy. Nothing hidden.</p>
          <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8, marginTop:40 }}>
            {[
              { body:'🎯 RF PICK OF THE DAY\n\n$TATAMOTORS — STRONG BUY\nConfidence: 81% · Entry ₹960 · Target ₹1,040 · SL ₹930', inner:'TATAMOTORS +8.4% · Hit target in 3 days · Jun 12, 2026', meta:'✅ Target hit · 3 days · Jun 12', innerBg:'rgba(0,212,160,0.05)', innerBc:'rgba(0,212,160,0.18)' },
              { body:'📊 WEEK 23 SCORECARD\n\nSignals: 14 | ✅ Hit: 10 (71.4%)\n⛔ SL: 2 | ⏳ Open: 2\n\nAccuracy vs premium channels: You do the math.', inner:'Model Accuracy: 71.4%', meta:'Week Jun 9–13, 2026', innerBg:'rgba(23,64,245,0.05)', innerBc:'rgba(23,64,245,0.18)' },
              { body:'🚀 MOMENTUM ALERT\n\n$SBIN breaking 3-week consolidation. Volume 2.8× avg. Delivery 64%. RF score: 0.78 · EMA golden cross confirmed.', inner:'SBIN · CMP ₹812 · Target ₹860 · SL ₹785', meta:'✅ +5.9% · 2 days · Jun 10', innerBg:'rgba(255,92,26,0.05)', innerBc:'rgba(255,92,26,0.18)' },
              { body:'🤖 PAPER TRADE UPDATE — Day 6\n\nRSI+EMA strategy virtual P&L: +₹8,420 on ₹1L capital (+8.4%)\n7 signals · 5 wins · Going live next week!', inner:'Virtual Portfolio: +8.4% return · 71% win rate', meta:'Paper Trade Log · Jun 18', innerBg:'rgba(139,92,246,0.05)', innerBc:'rgba(139,92,246,0.18)' },
            ].map((tw, i) => (
              <div key={i} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:20, minWidth:290, flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,var(--blu),var(--org))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff' }}>VA</div>
                  <div><div style={{ fontSize:13, fontWeight:700 }}>Vaasudev Amitav</div><div style={{ fontSize:11, color:'var(--dim)' }}>@signal_in</div></div>
                  <div style={{ marginLeft:'auto', fontSize:16, fontWeight:900, color:'var(--dim)' }}>𝕏</div>
                </div>
                <div style={{ fontSize:13, lineHeight:1.6, color:'var(--dim)', marginBottom:11, whiteSpace:'pre-line' }}>{tw.body}</div>
                <div style={{ borderRadius:10, padding:12, marginBottom:10, background:tw.innerBg, border:`1px solid ${tw.innerBc}` }}>
                  <div style={{ fontSize:12, color:'var(--dim)' }}>{tw.inner}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--dim2)' }}>{tw.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* US Markets */}
      <section id="us-markets" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:24, marginBottom:40 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--bluL)' }}>US Markets</div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(255,184,0,0.12)', border:'1px solid rgba(255,184,0,0.3)', color:'var(--ylw)' }}>Coming Soon</span>
              </div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>Invest in the US.<br/>From India.</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580 }}>SIGNAL is extending to US markets — giving Indian investors ML-powered signals on S&amp;P 500 and NASDAQ stocks, via LRS (Liberalised Remittance Scheme) compatible brokers like Vested, INDmoney, and Interactive Brokers.</p>
            </div>
          </div>
          <div className="g3" style={{ display:'grid', gap:14 }}>
            {[
              { icon:'🇺🇸', title:'Phase 1 — Indian LRS Users', desc:'S&P 500 + NASDAQ 100 stocks. SIGNAL adapts its RF model for US market microstructure — different liquidity, options flow, Fed rate sensitivity, and earnings seasonality.' },
              { icon:'🌍', title:'Phase 2 — Global Launch', desc:'Expand to Singapore, UAE, UK, and US resident investors. Multi-currency portfolio tracking. Localised tax implications (LTCG/STCG for India, capital gains for US).' },
              { icon:'🔬', title:'Adapted ML Parameters', desc:'US signals use: Options flow (Put/Call ratio) · Institutional dark pool data · Fed FOMC calendar · Earnings whispers · Short interest % — alongside standard technical indicators.' },
            ].map(c => (
              <div key={c.title} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:22 }}>
                <div style={{ fontSize:20, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{c.title}</div>
                <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:24, padding:'20px 24px', background:'rgba(23,64,245,0.05)', border:'1px solid rgba(23,64,245,0.2)', borderRadius:14, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Get US Markets early access</div>
              <div style={{ fontSize:13, color:'var(--dim)' }}>We&apos;ll notify you when US stock signals go live. Harshit, Jaitik, and 200+ others are already on the waitlist.</div>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0, flexWrap:'wrap' }}>
              <input type="email" placeholder="your@email.com"
                style={{ height:44, borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, padding:'0 14px', fontFamily:'inherit', outline:'none', width:220 }}
                onFocus={e => e.currentTarget.style.borderColor='var(--blu)'}
                onBlur={e => e.currentTarget.style.borderColor='var(--bdr)'}/>
              <button style={{ height:44, padding:'0 20px', borderRadius:10, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Join Waitlist →</button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--bluL)', marginBottom:12 }}>Pricing</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>One plan beats every<br/>premium call service.</h2>
          <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:580, marginBottom:24 }}>Transparent pricing. Cancel anytime. Save up to 25% with annual billing.</p>
          <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
            {([['mo','Monthly'],['qtr','Quarterly','Save 10%'],['half','Half-Yearly','Save 17%'],['yr','Annual','Save 25%']] as [string,string,string?][]).map(([k,label,badge]) => (
              <button key={k} onClick={() => setPeriod(k as any)}
                style={{ height:38, padding:'0 16px', borderRadius:9, fontSize:13, fontWeight:600, background: period===k ? 'var(--blu)' : 'transparent', border:`1px solid ${period===k ? 'var(--blu)' : 'var(--bdr)'}`, color: period===k ? '#fff' : 'var(--dim)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {label}
                {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background: period===k ? 'rgba(255,255,255,0.2)' : 'rgba(0,212,160,0.2)', color: period===k ? '#fff' : 'var(--grn)' }}>{badge}</span>}
              </button>
            ))}
          </div>
          {pr.note && <div style={{ fontSize:13, color:'var(--grn)', marginBottom:24, fontWeight:600 }}>{pr.note}</div>}
          <div className="pricing-grid" style={{ display:'grid', gap:14 }}>
            {[
              { name:'Free', nameC:'var(--dim)', price:'₹0', cycle:'forever · no card needed', feats:['5 stocks portfolio tracking','3 ML signals per week','NIFTY 50 basic prices','ETF & MF tracking (5 funds)','7-day delayed scorecard'], nope:['No real-time alerts','No broker/AA sync','No Algo Builder'], featured:false },
              { name:'Starter', nameC:'var(--bluL)', price:pr.s, cycle:pr.cy, feats:['25 stocks · ML buy/sell signals','ETF & MF tracking (20 funds)','Excel import · Swing + Momentum','𝕏 Twitter sentiment per stock','RF Pick of the Day','Real-time push alerts'], nope:['No broker/AA sync','No Algo Builder'], featured:false },
              { name:'Pro', nameC:'var(--ylw)', price:pr.p, cycle:pr.cy, feats:['Unlimited stocks — all NSE/BSE','AA sync — stocks, MF, FD, NPS','Live broker sync (6 brokers)','Portfolio ML classifier (all 5)','Full Algo Builder + Python gen','Paper Trading (unlimited)','Real-time push + WhatsApp alerts','Earnings calendar + impact pred'], nope:[], featured:true },
              { name:'Elite', nameC:'var(--pur)', price:pr.e, cycle:pr.cy, feats:['Everything in Pro','Auto-execute orders via API','Custom ML model for your portfolio','Early US markets access (beta)','Priority 24/7 WhatsApp support','Dedicated AI portfolio manager','Twitter card API','Multi-broker sync (up to 3)'], nope:[], featured:false },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.featured ? 'linear-gradient(145deg,#0D1E45,#0E1628)' : 'var(--surf)', border:`1px solid ${plan.featured ? 'var(--blu)' : 'var(--bdr)'}`, borderRadius:20, padding:32, position:'relative' }}>
                {plan.featured && <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:'var(--blu)', color:'#fff', fontSize:10.5, fontWeight:700, padding:'4px 14px', borderRadius:'0 0 10px 10px', letterSpacing:0.5 }}>BEST VALUE</div>}
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:plan.nameC, marginBottom:8 }}>{plan.name}</div>
                <div style={{ fontSize:48, fontWeight:900, letterSpacing:-2, lineHeight:1, color:plan.nameC, marginBottom:4 }}>{plan.price}</div>
                <div style={{ fontSize:13, color:'var(--dim)', marginBottom:24 }}>{plan.cycle}</div>
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
                  {plan.feats.map(f => <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'var(--dim)', lineHeight:1.4 }}><span style={{ color:'var(--grn)', fontWeight:700, flexShrink:0 }}>✓</span>{f}</li>)}
                  {plan.nope.map(f => <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'var(--dim)', lineHeight:1.4 }}><span style={{ color:'var(--dim2)', flexShrink:0 }}>–</span>{f}</li>)}
                </ul>
                <button style={{ width:'100%', height:48, borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background: plan.featured ? 'linear-gradient(135deg,var(--blu),var(--bluL))' : 'transparent', border: plan.featured ? 'none' : '1px solid var(--bdr)', color: plan.featured ? '#fff' : 'var(--txt)' }}>
                  {plan.featured ? 'Start Pro →' : `Start ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div style={{ marginTop:28, padding:'22px 24px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>🎟️ Have a coupon code?</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginTop:4 }}>Apply a discount code on any paid plan.</div>
            <div style={{ display:'flex', gap:10, marginTop:10, maxWidth:420 }}>
              <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Enter code e.g. SIGNAL20"
                style={{ flex:1, height:44, borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, padding:'0 14px', fontFamily:'inherit', outline:'none', textTransform:'uppercase', letterSpacing:1 }}
                onFocus={e => e.target.style.borderColor='var(--blu)'}
                onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
              <button onClick={applyCoupon} style={{ height:44, padding:'0 20px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Apply</button>
            </div>
            {couponMsg && <div style={{ fontSize:13, marginTop:8, color: couponMsg.ok ? 'var(--grn)' : 'var(--red)' }}>{couponMsg.text}</div>}
          </div>

          <div style={{ background:'rgba(255,184,0,0.05)', border:'1px solid rgba(255,184,0,0.15)', borderRadius:14, padding:'20px 24px', marginTop:24 }}>
            <p style={{ fontSize:12.5, color:'rgba(255,184,0,0.7)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--ylw)' }}>⚠️ SEBI DISCLAIMER:</strong> SIGNAL is <strong>NOT registered with SEBI</strong>. All signals, picks, algo strategies, and analysis are for <strong>informational and educational purposes only</strong>. Not financial advice. Past accuracy is not a guarantee of future results. <strong>Consult a SEBI-registered advisor before investing.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Download App */}
      <section id="download" style={{ padding:'60px clamp(20px,6vw,120px)', borderTop:'1px solid var(--bdr)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="g-mission" style={{ display:'grid', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase', color:'var(--grn)', marginBottom:12 }}>Mobile App</div>
              <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.05, marginBottom:14 }}>SIGNAL in<br/>your pocket</h2>
              <p style={{ fontSize:16, color:'var(--dim)', lineHeight:1.65, maxWidth:520, marginBottom:32 }}>The full platform — signals, portfolio analysis, algo builder, paper trading — on iOS and Android. Launching soon. Sign up on the website now for early access.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:220 }}>
                {/* Google Play badge */}
                <a href="#" style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderRadius:13, background:'#000', border:'1px solid rgba(255,255,255,0.14)', color:'#fff', textDecoration:'none' }}>
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                    <path d="M1 0.8C0.5 1.3 0.2 2.1 0.2 3V21c0 .9.3 1.7.8 2.2L1.2 23.4 12.1 12.5v-.3L1.2.6 1 .8z" fill="#4285F4"/>
                    <path d="M15.8 16.3l-3.7-3.7v-.3L15.8 8.6l.1.1 4.4 2.5c1.3.7 1.3 1.9 0 2.6l-4.4 2.5h-.1z" fill="#FBBC04"/>
                    <path d="M15.9 16.2L12.1 12.4 1 23.2c.4.5 1.1.5 1.9.1l13-7.1z" fill="#34A853"/>
                    <path d="M15.9 8.7L2.9.8C2.1.4 1.4.4 1 .9l11.1 10.8 3.8-3z" fill="#EA4335"/>
                  </svg>
                  <div>
                    <div style={{ fontSize:9, opacity:0.6, letterSpacing:0.3, lineHeight:1 }}>GET IT ON</div>
                    <div style={{ fontSize:16, fontWeight:800, lineHeight:1.2 }}>Google Play</div>
                  </div>
                </a>
                {/* App Store badge */}
                <a href="#" style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderRadius:13, background:'#000', border:'1px solid rgba(255,255,255,0.14)', color:'#fff', textDecoration:'none' }}>
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="white">
                    <path d="M16.7 12.8c0-3.5 2.9-5.2 3-5.3-1.6-2.4-4.2-2.7-5.1-2.7-2.2-.2-4.2 1.3-5.3 1.3-1.1 0-2.7-1.3-4.5-1.2-2.3.1-4.4 1.3-5.6 3.4-2.4 4.1-.6 10.1 1.7 13.4 1.1 1.6 2.5 3.4 4.2 3.4 1.7-.1 2.3-1.1 4.3-1.1 2 0 2.6 1.1 4.4 1 1.8-.1 3-1.7 4.1-3.4.8-1.1 1.4-2.3 1.7-3.5-3.7-1.4-4-7.3-.9-7.3z"/>
                    <path d="M13.6 3.2C14.6 2 15.3.3 15.1-1.4c-1.4.1-3.1.9-4.1 2.1-1 1.1-1.7 2.8-1.5 4.4 1.5.1 3-.7 4.1-1.9z"/>
                  </svg>
                  <div>
                    <div style={{ fontSize:9, opacity:0.6, letterSpacing:0.3, lineHeight:1 }}>DOWNLOAD ON THE</div>
                    <div style={{ fontSize:16, fontWeight:800, lineHeight:1.2 }}>App Store</div>
                  </div>
                </a>
              </div>
            </div>
            <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:20, padding:32 }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>🔔 Get notified at launch</div>
              <div style={{ fontSize:13, color:'var(--dim)', marginBottom:20, lineHeight:1.6 }}>Be first to download when the iOS and Android apps go live. One email — no spam ever.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                <input type="email" placeholder="your@email.com"
                  style={{ height:46, borderRadius:11, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14, padding:'0 14px', fontFamily:'inherit', outline:'none', width:'100%' }}
                  onFocus={e => e.currentTarget.style.borderColor='var(--blu)'}
                  onBlur={e => e.currentTarget.style.borderColor='var(--bdr)'}/>
                <button style={{ height:46, borderRadius:11, background:'linear-gradient(135deg,var(--grn),#00A87D)', border:'none', color:'#001A12', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Notify Me When App Launches</button>
              </div>
              <div style={{ display:'flex', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden' }}>
                {[
                  { val:'iOS', sub:'App Store', vc:'var(--grn)' },
                  { val:'Android', sub:'Play Store', vc:'var(--grn)', br:true },
                  { val:'Free', sub:'to download', vc:'var(--bluL)' },
                ].map((item, i) => (
                  <div key={item.val} style={{ flex:1, padding:14, textAlign:'center', borderRight: i < 2 ? '1px solid var(--bdr)' : 'none' }}>
                    <div style={{ fontSize:16, fontWeight:900, color:item.vc }}>{item.val}</div>
                    <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--bdr)', padding:'40px clamp(20px,6vw,120px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:24, marginBottom:32 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5 }}>SIGNAL</div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:6, maxWidth:320, lineHeight:1.6 }}>ML-powered trading intelligence for NSE &amp; BSE. Not SEBI registered. Not financial advice.</div>
            </div>
            <div style={{ display:'flex', gap:48, flexWrap:'wrap' }}>
              {[
                { heading:'Platform', links:['Portfolio Analysis','ML Signals','Algo Builder','Paper Trading'] },
                { heading:'Legal', links:['About & Founders','Track Record','Privacy Policy','Terms of Use','SEBI Disclaimer'] },
                { heading:'Connect', links:['Twitter / 𝕏','WhatsApp','Contact'] },
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>{col.heading}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {col.links.map(l => <a key={l} href="#" style={{ fontSize:13, color:'var(--dim)' }}>{l}</a>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize:12, color:'var(--dim2)', borderTop:'1px solid var(--bdr)', paddingTop:20, lineHeight:1.7 }}>
            © 2026 SIGNAL · Built by Vaasudev Amitav &nbsp;·&nbsp;
            <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> &nbsp;·&nbsp;
            All signals are for educational purposes only &nbsp;·&nbsp; Not financial advice &nbsp;·&nbsp; DYOR
          </div>
        </div>
      </footer>
    </div>
  );
}
