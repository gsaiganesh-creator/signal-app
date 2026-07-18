'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DemoVideoModal } from '@/components/DemoVideoModal';
import { BrandIcon } from '@/components/Brand';

// ── Pricing (data/logic unchanged) ────────────────────────────────────────────
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

// ── Type ramps ────────────────────────────────────────────────────────────────
const MONO    = "'JetBrains Mono',monospace";
const GROTESK = "'Space Grotesk','Inter',sans-serif";

// ── Stroke icon set ───────────────────────────────────────────────────────────
type IconName = 'scan'|'bolt'|'chart'|'link'|'gauge'|'code'|'flask'|'layers'|'globe'|'phone'|'ticket'|'x'|'calendar'|'play';
const PATHS: Record<IconName, string> = {
  scan:     'M2 12h4l3-8 4 16 3-8h6',
  bolt:     'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  chart:    'M3 21h18M7 21V11M12 21V4M17 21v-9',
  link:     'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  gauge:    'M4 15a8 8 0 1 1 16 0M12 13l3.5-4.5',
  code:     'M8 6 2 12l6 6M16 6l6 6-6 6',
  flask:    'M9 3h6M10 3v5l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8V3',
  layers:   'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  globe:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18z',
  phone:    'M7 2h10v20H7zM11 18h2',
  ticket:   'M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6zM13 5v2M13 11v2M13 17v2',
  x:        'M4 4l16 16M20 4 4 20',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 3v4M16 3v4M3 11h18',
  play:     'M6 4l14 8-14 8V4z',
};
const Icon = ({ name, size = 16, color = 'currentColor', sw = 1.8 }: { name: IconName; size?: number; color?: string; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', flexShrink:0 }}>
    <path d={PATHS[name]} />
  </svg>
);

// ── Atoms ─────────────────────────────────────────────────────────────────────
const PANEL: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14 };
const TILE:  React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', flexShrink:0 };

const TLab = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase', color:'var(--dim2)', marginBottom:10 }}>{children}</div>
);

// Section header: mono number + caps label
const Label = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <div style={{ fontFamily:MONO, fontSize:10.5, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--dim2)', marginBottom:18, display:'flex', alignItems:'baseline', gap:10 }}>
    <span style={{ color:'var(--blu)' }}>{n}</span>
    <span>{children}</span>
  </div>
);

// Zone tag — semantic tones only
const Tag = ({ label, tone }: { label: string; tone: 'up'|'down'|'flat'|'info' }) => {
  const c = tone === 'up' ? 'var(--grn)' : tone === 'down' ? 'var(--red)' : tone === 'flat' ? 'var(--ylw)' : 'var(--blu)';
  return (
    <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, padding:'3px 8px', borderRadius:4, whiteSpace:'nowrap',
      color:c, border:`1px solid color-mix(in srgb, ${c} 40%, transparent)`, background:`color-mix(in srgb, ${c} 10%, transparent)` }}>
      {label}
    </span>
  );
};

const Meter = ({ v, c }: { v: number; c: string }) => (
  <div style={{ height:3, background:'var(--surf2)', borderRadius:2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${v}%`, background:c, borderRadius:2 }} />
  </div>
);

// Terminal window — the recurring product mock
const Term = ({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ ...PANEL, overflow:'hidden', ...style }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--bdr)' }}>
      <span style={{ display:'flex', gap:5 }}>
        {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--bdr)', border:'1px solid var(--dim2)' }}/>)}
      </span>
      <span style={{ fontFamily:MONO, fontSize:10, color:'var(--dim2)', letterSpacing:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</span>
      {right && <span style={{ marginLeft:'auto', flexShrink:0 }}>{right}</span>}
    </div>
    <div style={{ padding:'16px 18px' }}>{children}</div>
  </div>
);

// Feature spec row — replaces emoji pills
const Spec = ({ icon, title, desc }: { icon: IconName; title: string; desc: string }) => (
  <div style={{ display:'flex', gap:14, padding:'15px 0', borderTop:'1px solid var(--bdr)' }}>
    <div style={{ width:34, height:34, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--surf)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon name={icon} size={15} color="var(--blu)" />
    </div>
    <div>
      <div style={{ fontSize:13.5, fontWeight:700, marginBottom:3 }}>{title}</div>
      <div style={{ fontSize:12.5, color:'var(--dim)', lineHeight:1.65 }}>{desc}</div>
    </div>
  </div>
);

const SignalLogo = () => <BrandIcon size={26} />;

// ── Marquee tiles (rendered twice for seamless loop) ─────────────────────────
const MQ1 = () => (
  <>
    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>NSE · AI Scan</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700 }}>RELIANCE</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim)', marginTop:2 }}>₹2,912 · <span style={{ color:'var(--grn)' }}>▲ +1.80%</span></div>
        </div>
        <Tag tone="up" label="↑ MOMENTUM"/>
      </div>
      <Meter v={87} c="var(--grn)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>SCORE 87/100</div>
    </div>

    <div style={{ ...TILE, minWidth:220 }}>
      <TLab>Portfolio AI</TLab>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:9 }}>16 stocks screened</div>
      {[['Rising','var(--grn)','5'],['Building','var(--blu)','4'],['Declining','var(--red)','2']].map(([l,c,n]) => (
        <div key={l} style={{ display:'flex', justifyContent:'space-between', fontFamily:MONO, fontSize:10.5, marginBottom:4 }}>
          <span style={{ color:c }}>{l}</span><span style={{ color:'var(--dim)' }}>{n}</span>
        </div>
      ))}
    </div>

    <div style={{ ...TILE, minWidth:220 }}>
      <TLab>Week 23 · Track Record</TLab>
      <div style={{ fontFamily:GROTESK, fontSize:30, fontWeight:700, color:'var(--grn)', letterSpacing:-1, lineHeight:1, marginBottom:8 }}>71.4%</div>
      <Meter v={71.4} c="var(--grn)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>14 SCANS · 10 STRONG · 2 REVERSED</div>
    </div>

    <div style={{ ...TILE, minWidth:210 }}>
      <TLab>Paper Trading · Day 6</TLab>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
        {[['+8.4%','var(--grn)','P&L'],['71%','var(--txt)','WIN']].map(([v,c,l]) => (
          <div key={l} style={{ textAlign:'center', padding:9, background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:8 }}>
            <div style={{ fontFamily:MONO, fontSize:15, fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontFamily:MONO, fontSize:8.5, color:'var(--dim2)', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>NSE · AI Scan</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700 }}>SBIN</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim)', marginTop:2 }}>₹812 · <span style={{ color:'var(--grn)' }}>▲ +2.1%</span></div>
        </div>
        <Tag tone="up" label="↑ MOMENTUM"/>
      </div>
      <Meter v={78} c="var(--grn)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>SCORE 78/100</div>
    </div>

    <div style={{ ...TILE, minWidth:215 }}>
      <TLab>Backtest · 1 Year</TLab>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {[['+24.3%','var(--grn)','RETURNS'],['1.84','var(--txt)','SHARPE'],['64%','var(--grn)','WIN RATE'],['-8.2%','var(--red)','DRAWDOWN']].map(([v,c,l]) => (
          <div key={l} style={{ textAlign:'center', padding:7, background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:8 }}>
            <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontFamily:MONO, fontSize:8, color:'var(--dim2)', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>NSE · AI Scan</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700 }}>TATAMOTORS</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim)', marginTop:2 }}>₹960 · <span style={{ color:'var(--grn)' }}>▲ +3.5%</span></div>
        </div>
        <Tag tone="up" label="↑ MOMENTUM"/>
      </div>
      <Meter v={81} c="var(--grn)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>RESULT <span style={{ color:'var(--grn)' }}>+8.4%</span> · ZONE HELD</div>
    </div>

    <div style={{ ...TILE, minWidth:215 }}>
      <TLab>Sentiment · X</TLab>
      <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, marginBottom:8 }}>TATAMOTORS</div>
      <div style={{ height:5, background:'color-mix(in srgb, var(--red) 18%, transparent)', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
        <div style={{ height:'100%', width:'76%', background:'var(--grn)', borderRadius:3 }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:MONO, fontSize:10, fontWeight:700 }}>
        <span style={{ color:'var(--grn)' }}>76% BULLISH</span><span style={{ color:'var(--red)' }}>24%</span>
      </div>
    </div>
  </>
);

const MQ2 = () => (
  <>
    <div style={{ ...TILE, minWidth:225 }}>
      <TLab>Account Aggregator</TLab>
      <div style={{ fontFamily:GROTESK, fontSize:24, fontWeight:700, letterSpacing:-0.5, marginBottom:3 }}>₹18.7L</div>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginBottom:9 }}>TOTAL WEALTH · 4 INSTITUTIONS</div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {['SBI','HDFC','mStock','MF'].map(n => (
          <span key={n} style={{ fontFamily:MONO, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4, border:'1px solid var(--bdr)', color:'var(--dim)' }}>{n}</span>
        ))}
      </div>
    </div>

    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>NSE · AI Scan</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700 }}>ZOMATO</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim)', marginTop:2 }}>₹189 · <span style={{ color:'var(--red)' }}>▼ -1.4%</span></div>
        </div>
        <Tag tone="down" label="↓ DECLINING"/>
      </div>
      <Meter v={81} c="var(--red)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>SCORE 81/100 · BELOW SUPPORT</div>
    </div>

    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>ETF &amp; MF Portfolio</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700 }}>₹1,23,000</span>
        <span style={{ fontFamily:MONO, fontSize:15, fontWeight:700, color:'var(--grn)' }}>+24.5%</span>
      </div>
      {[['Mirae Asset','+16.3%'],['NIFTYBEES','+12.0%'],['SBI Small Cap','+40.0%']].map(([n,r]) => (
        <div key={n} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
          <span style={{ color:'var(--dim)' }}>{n}</span><span style={{ fontFamily:MONO, color:'var(--grn)', fontWeight:700 }}>{r}</span>
        </div>
      ))}
    </div>

    <div style={{ ...TILE, minWidth:215 }}>
      <TLab>Broker Connect</TLab>
      {[['mStock','CONNECTED','var(--grn)'],['Zerodha','CONNECT →','var(--blu)'],['Upstox','CONNECT →','var(--blu)']].map(([n,t,c]) => (
        <div key={n} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:7, marginBottom:5 }}>
          <span style={{ fontSize:11, fontWeight:700 }}>{n}</span>
          <span style={{ marginLeft:'auto', fontFamily:MONO, fontSize:8.5, color:c, fontWeight:700, letterSpacing:0.5 }}>{t}</span>
        </div>
      ))}
    </div>

    <div style={{ ...TILE, minWidth:230 }}>
      <TLab>NSE · AI Scan</TLab>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700 }}>HDFCBANK</div>
          <div style={{ fontFamily:MONO, fontSize:10, color:'var(--dim)', marginTop:2 }}>₹1,620 · <span style={{ color:'var(--grn)' }}>▲ +0.6%</span></div>
        </div>
        <Tag tone="flat" label="→ SIDEWAYS"/>
      </div>
      <Meter v={62} c="var(--ylw)"/>
      <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginTop:6 }}>SCORE 62/100</div>
    </div>

    <div style={{ ...TILE, minWidth:225 }}>
      <TLab>Public Track Record</TLab>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontFamily:MONO, fontSize:11.5, fontWeight:700, color:'var(--grn)' }}>TATAMOTORS +8.4%</div>
        <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:2 }}>↑ Momentum zone · held 3 days</div>
      </div>
      <div style={{ paddingTop:8, borderTop:'1px solid var(--bdr)' }}>
        <div style={{ fontFamily:MONO, fontSize:11.5, fontWeight:700, color:'var(--grn)' }}>SBIN +5.9%</div>
        <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:2 }}>↑ Momentum zone · held 2 days</div>
      </div>
    </div>

    <div style={{ ...TILE, minWidth:215 }}>
      <TLab>Algo Indicators</TLab>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {['RSI (14)','EMA 20/50','MACD','Bollinger','ADX','ATR'].map(t => (
          <span key={t} style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, padding:'3px 9px', borderRadius:4, border:'1px solid var(--bdr)', color:'var(--dim)' }}>{t}</span>
        ))}
      </div>
    </div>
  </>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
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

  const sdiv = <div style={{ height:1, background:'var(--bdr)', margin:'0 clamp(20px,6vw,100px)' }}/>;
  const sect = (pad = '100px'): React.CSSProperties => ({ padding:`${pad} clamp(20px,6vw,100px)` });

  return (
    <div style={{ background:'var(--bg)', color:'var(--txt)', minHeight:'100vh', overflowX:'hidden', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── SEBI banner ──────────────────────────────────────── */}
      <div style={{ background:'color-mix(in srgb, var(--ylw) 7%, transparent)', borderBottom:'1px solid color-mix(in srgb, var(--ylw) 18%, transparent)', padding:'8px 24px', textAlign:'center' }}>
        <span style={{ fontSize:11.5, color:'var(--dim)' }}><strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED.</strong> This is a technical screening tool. Scan results are computed indicators — not financial advice. You decide. DYOR.</span>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(20px,5vw,80px)', height:58,
        background:'color-mix(in srgb, var(--bg) 86%, transparent)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderBottom:'1px solid var(--bdr)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:18, fontWeight:800, letterSpacing:-0.5, color:'var(--txt)', textDecoration:'none', fontFamily:GROTESK }}>
          <SignalLogo /> SignalGenie
        </Link>
        <div className="lp-nav-links">
          {(['Scanner','Portfolio','Algo Builder','Pricing','Track Record','Support'] as const).map((l,i) => (
            <a key={l} href={['#signals','#portfolio','#algo','#pricing','/track-record','/support'][i]}
              style={{ fontFamily:MONO, fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', color:'var(--dim)', textDecoration:'none' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--txt)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <Link href="/sign-in" style={{ height:34, padding:'0 15px', borderRadius:8, border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', textDecoration:'none' }}>Sign In</Link>
          <Link href="/sign-in" className="lp-cta-desktop" style={{ height:34, padding:'0 16px', borderRadius:8, background:'var(--blu)', border:'none', color:'#fff', fontSize:12.5, fontWeight:700, alignItems:'center', textDecoration:'none', whiteSpace:'nowrap' }}>Get Started Free →</Link>
        </div>
      </nav>

      {/* ── Index ticker strip ───────────────────────────────── */}
      <div style={{ borderBottom:'1px solid var(--bdr)', background:'var(--surf)' }}>
        <div className="lp-tick" style={{ padding:'0 clamp(20px,5vw,80px)', height:36, alignItems:'center', display:'flex', gap:26, overflowX:'auto', whiteSpace:'nowrap' }}>
          <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.2, color:'var(--grn)', display:'inline-flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--grn)', animation:'blink 2s infinite' }}/>LIVE
          </span>
          {([
            ['NIFTY 50','24,812.75','+0.62%',1],['SENSEX','81,455.40','+0.58%',1],['NIFTY BANK','56,208.10','-0.21%',0],
            ['NIFTY IT','38,914.55','+1.04%',1],['INDIA VIX','13.24','-2.80%',0],['USDINR','83.42','+0.08%',1],['GOLD','72,410','+0.31%',1],
          ] as [string,string,string,number][]).map(([n,v,c,up]) => (
            <span key={n} style={{ fontFamily:MONO, fontSize:10.5, display:'inline-flex', gap:7, alignItems:'baseline', flexShrink:0 }}>
              <span style={{ color:'var(--dim2)', fontWeight:700, letterSpacing:0.5 }}>{n}</span>
              <span style={{ color:'var(--txt)', fontWeight:700 }}>{v}</span>
              <span style={{ color: up ? 'var(--grn)' : 'var(--red)', fontWeight:700 }}>{up ? '▲' : '▼'} {c}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ padding:'0 clamp(20px,5vw,80px)' }}>
        <div className="lp-hero-grid">
          {/* Left — text */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:6, border:'1px solid var(--bdr)', background:'var(--surf)', fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:1.4, color:'var(--dim)', marginBottom:30 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--grn)', animation:'blink 2s infinite' }}/>
              LIVE · NSE &amp; BSE · 4,000+ STOCKS
            </div>
            <h1 style={{ fontFamily:GROTESK, fontSize:'clamp(46px,6.5vw,86px)', fontWeight:700, letterSpacing:-3, lineHeight:.96, marginBottom:24 }}>
              Trade smarter,<br/>
              <span style={{ color:'var(--blu)' }}>with AI.</span>
            </h1>
            <p style={{ fontSize:'clamp(15px,1.6vw,17px)', color:'var(--dim)', lineHeight:1.7, maxWidth:470, marginBottom:12 }}>
              AI-powered portfolio classification, technical screener, no-code Algo Builder, and Paper Trading — for a fraction of what premium services charge.
            </p>
            <p style={{ fontFamily:MONO, fontSize:11, color:'var(--dim2)', lineHeight:1.7, maxWidth:470, marginBottom:36, letterSpacing:0.2 }}>
              // Proprietary ML models — trained on 5 years of NSE/BSE data,<br/>not a wrapper around someone else&apos;s chatbot.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:46 }}>
              <Link href="/sign-in" className="lp-btn" style={{ height:50, padding:'0 28px', borderRadius:10, fontSize:15, fontWeight:700, background:'var(--blu)', color:'#fff', display:'flex', alignItems:'center', textDecoration:'none' }}>
                Start Free — No Card Needed →
              </Link>
              <button onClick={() => setDemoOpen(true)} className="lp-btn" style={{ height:50, padding:'0 24px', borderRadius:10, fontSize:14, fontWeight:600, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:9 }}>
                <Icon name="play" size={13} color="var(--dim)"/> Watch Demo
              </button>
            </div>
            <div className="lp-stats-4" style={{ display:'grid', borderTop:'1px solid var(--bdr)', paddingTop:22 }}>
              {[
                { v:'71.4%', c:'var(--grn)', l:'Scan accuracy' },
                { v:'4,000+',c:'var(--txt)', l:'Stocks tracked' },
                { v:'₹599',  c:'var(--txt)', l:'vs ₹15,000 elsewhere' },
                { v:'6',     c:'var(--txt)', l:'Brokers synced' },
              ].map(st => (
                <div key={st.l}>
                  <div style={{ fontFamily:GROTESK, fontSize:26, fontWeight:700, letterSpacing:-1, color:st.c }}>{st.v}</div>
                  <div style={{ fontFamily:MONO, fontSize:9, color:'var(--dim2)', marginTop:4, letterSpacing:1, textTransform:'uppercase' }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — terminal window */}
          <div className="lp-hero-visual">
            <Term title="signalgenie — scan · NSE" right={<Tag tone="up" label="● LIVE"/>}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <div>
                  <div style={{ fontFamily:MONO, fontSize:16, fontWeight:700 }}>RELIANCE.NS</div>
                  <div style={{ fontSize:11, color:'var(--dim2)', marginTop:3 }}>Reliance Industries · Large Cap</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:MONO, fontSize:20, fontWeight:700 }}>₹2,912.40</div>
                  <div style={{ fontFamily:MONO, fontSize:11, color:'var(--grn)', fontWeight:700, marginTop:3 }}>▲ +1.80%</div>
                </div>
              </div>
              <div style={{ fontFamily:MONO, fontSize:13, color:'var(--grn)', letterSpacing:3, margin:'10px 0 14px', userSelect:'none' }}>▂▃▂▄▅▄▆▇▆█▇█</div>
              <div style={{ borderTop:'1px solid var(--bdr)', paddingTop:13, display:'grid', gridTemplateColumns:'auto 1fr', gap:'10px 16px', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.2, color:'var(--dim2)' }}>ZONE</span>
                <span><Tag tone="up" label="↑ STRONG MOMENTUM"/></span>
                <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.2, color:'var(--dim2)' }}>SCORE</span>
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ flex:1 }}><Meter v={87} c="var(--grn)"/></span>
                  <span style={{ fontFamily:MONO, fontSize:12, fontWeight:700, color:'var(--grn)' }}>87</span>
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['RSI (14)','34.2'],['MACD','+12.4'],['EMA 20/50','ABOVE'],['DELIVERY','63.2%'],['SENTIMENT','76% ▲'],['FII FLOW','+₹842Cr']].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontFamily:MONO, fontSize:8.5, color:'var(--dim2)', letterSpacing:0.8, marginBottom:3 }}>{k}</div>
                    <div style={{ fontFamily:MONO, fontSize:12, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:14, paddingTop:10, fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.8 }}>
                UPDATED 2 MIN AGO · 15/15 INDICATORS · NOT INVESTMENT ADVICE
              </div>
            </Term>
            <div style={{ ...PANEL, position:'absolute', left:-28, bottom:-22, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, animation:'lp-float 7s ease-in-out infinite', boxShadow:'var(--card-shadow)' }}>
              <span style={{ fontFamily:MONO, fontSize:10.5, fontWeight:700 }}>SBIN</span>
              <Tag tone="up" label="↑ MOMENTUM · 78"/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ───────────────────────────────────────────── */}
      <section style={{ padding:'56px 0', overflow:'hidden' }}>
        <div style={{ textAlign:'center', fontFamily:MONO, fontSize:10, fontWeight:700, letterSpacing:2.4, textTransform:'uppercase', color:'var(--dim2)', marginBottom:24 }}>
          Technical scans — Portfolio insights — Real-time intelligence
        </div>
        <div className="mq-wrap" style={{ overflow:'hidden', marginBottom:12 }}>
          <div className="mq-track-r"><MQ1/><MQ1/></div>
        </div>
        <div className="mq-wrap" style={{ overflow:'hidden' }}>
          <div className="mq-track-l"><MQ2/><MQ2/></div>
        </div>
      </section>

      {sdiv}

      {/* ── 01 · AI Technical Scan ───────────────────────────── */}
      <section id="signals" style={sect('clamp(70px,9vw,120px)')}>
        <div className="lp-feat lp-reveal">
          <div>
            <Label n="01">AI Technical Scan</Label>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,3.8vw,48px)', fontWeight:700, letterSpacing:-2, lineHeight:1, marginBottom:18 }}>
              Scan. Analyse. Decide.<br/><span style={{ color:'var(--blu)' }}>Know exactly why.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:26 }}>Every scan result comes with a technical momentum score, Twitter/X sentiment, delivery volume %, and a full breakdown of the 15 indicators that computed it — not a human guess.</p>
            <div>
              <Spec icon="scan" title="Random Forest · 200 trees, 15 indicators" desc="RSI, MACD, EMA, ADX, FII/DII flow, Twitter sentiment, delivery %, earnings, beta — trained on 5Y NSE/BSE data."/>
              <Spec icon="bolt" title="Updated every 2 min · instant alerts" desc="Real-time screener updates during market hours with push + WhatsApp notification when momentum zones shift."/>
              <Spec icon="chart" title="Public track record on Twitter/X" desc="Screener results auto-posted publicly with technical scores. Weekly accuracy scorecards — full accountability."/>
            </div>
          </div>
          <div className="lp-feat-visual">
            <Term title="signalgenie — indicators · RELIANCE.NS" right={<Tag tone="up" label="SCORE 87"/>}>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {([
                  ['RSI (14)','34.2 · recovered from oversold',34,'var(--grn)'],
                  ['MACD','+12.4 · rising',68,'var(--grn)'],
                  ['EMA 20/50','above · golden zone',82,'var(--grn)'],
                  ['ADX','28 · strong trend',56,'var(--ylw)'],
                  ['DELIVERY %','63.2% · accumulation',63,'var(--grn)'],
                  ['SENTIMENT','76% bullish · 212 posts',76,'var(--grn)'],
                ] as [string,string,number,string][]).map(([k,d,v,c],i) => (
                  <div key={k} style={{ display:'grid', gridTemplateColumns:'96px 1fr', gap:'4px 14px', alignItems:'center', padding:'9px 0', borderTop: i ? '1px solid var(--bdr)' : 'none' }}>
                    <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:0.8, color:'var(--dim2)' }}>{k}</span>
                    <span style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center' }}>
                      <span>
                        <Meter v={v} c={c}/>
                        <span style={{ fontFamily:MONO, fontSize:9, color:'var(--dim2)', marginTop:4, display:'block' }}>{d}</span>
                      </span>
                      <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:c }}>{v}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:6, paddingTop:10, fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.8 }}>
                13/15 INDICATORS ALIGNED · UPDATED 2 MIN AGO
              </div>
            </Term>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── 02 · Portfolio Intelligence ──────────────────────── */}
      <section id="portfolio" style={sect('clamp(70px,9vw,120px)')}>
        <div className="lp-feat lp-reveal" style={{ direction:'rtl' }}>
          <div style={{ direction:'ltr' }}>
            <Label n="02">Portfolio Intelligence</Label>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,3.8vw,48px)', fontWeight:700, letterSpacing:-2, lineHeight:1, marginBottom:18 }}>
              Your holdings,<br/><span style={{ color:'var(--blu)' }}>classified by AI.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:26 }}>Connect your broker via secure OAuth or upload Excel. Our model instantly tags every stock — Rising, Building, Holding, Declining — and syncs live P&amp;L every 30 seconds.</p>
            <div>
              <Spec icon="link" title="6 brokers + RBI Account Aggregator" desc="mStock, Zerodha, Upstox, Angel One, HDFC Sec, Groww — or upload .xlsx. AA sync brings in MFs, FDs, NPS, EPF too."/>
              <Spec icon="gauge" title="Live P&L sync every 30 seconds" desc="LTP, unrealised P&L, delivery %, institutional flow — all live during market hours."/>
            </div>
          </div>
          <div className="lp-feat-visual" style={{ direction:'ltr' }}>
            <Term title="signalgenie — portfolio · LIVE" right={<Tag tone="up" label="● SYNC 30S"/>}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontFamily:GROTESK, fontSize:28, fontWeight:700, letterSpacing:-1 }}>₹12,40,000</div>
                <div style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'var(--grn)' }}>▲ +18.4% YoY</div>
              </div>
              {/* Allocation bar */}
              <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', marginBottom:16 }}>
                {[['var(--grn)',31],['var(--blu)',25],['var(--dim2)',31],['var(--red)',13]].map(([c,w],i) => (
                  <div key={i} style={{ width:`${w}%`, background:c as string }}/>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {([
                  ['var(--grn)','RISING','5','RELIANCE, TATAMOTORS…'],
                  ['var(--blu)','BUILDING','4','HDFCBANK, BAJFINANCE…'],
                  ['var(--dim2)','HOLDING','5','TCS, INFY…'],
                  ['var(--red)','DECLINING','2','ZOMATO, PAYTM'],
                ] as [string,string,string,string][]).map(([c,l,n,s],i) => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderTop: i ? '1px solid var(--bdr)' : 'none' }}>
                    <span style={{ width:7, height:7, borderRadius:2, background:c, flexShrink:0 }}/>
                    <span style={{ fontFamily:MONO, fontSize:10.5, fontWeight:700, letterSpacing:1, color:'var(--txt)' }}>{l}</span>
                    <span style={{ fontSize:10.5, color:'var(--dim2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s}</span>
                    <span style={{ marginLeft:'auto', fontFamily:MONO, fontSize:13, fontWeight:700 }}>{n}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:6, paddingTop:10, fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.8 }}>
                6 BROKERS + AA SYNC · 16 STOCKS SCREENED
              </div>
            </Term>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── 03 · Algo Builder ────────────────────────────────── */}
      <section id="algo" style={sect('clamp(70px,9vw,120px)')}>
        <div className="lp-feat lp-reveal">
          <div>
            <Label n="03">Algo Builder</Label>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,3.8vw,48px)', fontWeight:700, letterSpacing:-2, lineHeight:1, marginBottom:18 }}>
              Build your strategy.<br/><span style={{ color:'var(--blu)' }}>No code needed.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:26 }}>Pick a strategy, select indicators, set entry/exit conditions. SignalGenie generates Python code with full 1-year backtest results — then paper-trade it to validate. Your code. Your broker. Your decision.</p>
            <div>
              <Spec icon="code" title="Visual no-code builder" desc="Momentum, Trend Following, Mean Reversion, Breakout — pick type, drag in indicators, set rules in minutes."/>
              <Spec icon="flask" title="1-year backtesting on real NSE data" desc="Sharpe ratio, win rate, max drawdown, full returns — calculated on actual historical data before you risk a rupee."/>
            </div>
          </div>
          <div className="lp-feat-visual">
            <Term title="signalgenie — builder · signal_rsi_ema.py" right={<Tag tone="info" label="⎘ COPY"/>}>
              <div style={{ fontFamily:MONO, fontSize:11.5, lineHeight:1.85 }}>
                <div style={{ color:'var(--dim2)' }}># SignalGenie · RSI + EMA Strategy</div>
                <div><span style={{ color:'var(--txt)' }}>RSI_LOW, RSI_HIGH = </span><span style={{ color:'var(--org)' }}>35, 70</span></div>
                <div><span style={{ color:'var(--txt)' }}>STOP_LOSS = </span><span style={{ color:'var(--org)' }}>2.5</span></div>
                <div><span style={{ color:'var(--pur)' }}>def</span><span style={{ color:'var(--txt)' }}> signal(df):</span></div>
                <div style={{ color:'var(--txt)' }}>{'  if rsi < RSI_LOW and cross:'}</div>
                <div><span style={{ color:'var(--pur)' }}>{'    return'}</span><span style={{ color:'var(--grn)' }}>{' "BUY"'}</span></div>
                <div style={{ color:'var(--txt)' }}>{'  if rsi > RSI_HIGH:'}</div>
                <div><span style={{ color:'var(--pur)' }}>{'    return'}</span><span style={{ color:'var(--red)' }}>{' "SELL"'}</span></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginTop:16 }}>
                {[['+24.3%','var(--grn)','RETURNS'],['1.84','var(--txt)','SHARPE'],['64%','var(--grn)','WIN RATE'],['-8.2%','var(--red)','MAX DD']].map(([v,c,l]) => (
                  <div key={l} style={{ textAlign:'center', padding:'9px 4px', background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:8 }}>
                    <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:c }}>{v}</div>
                    <div style={{ fontFamily:MONO, fontSize:7.5, color:'var(--dim2)', marginTop:3, letterSpacing:0.8 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:14, paddingTop:10, fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.8 }}>
                1Y BACKTEST · REAL NSE DATA · GENERATED CODE IS YOURS
              </div>
            </Term>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── 04 · Paper Trading ───────────────────────────────── */}
      <section id="paper" style={sect('clamp(70px,9vw,120px)')}>
        <div className="lp-feat lp-reveal" style={{ direction:'rtl' }}>
          <div style={{ direction:'ltr' }}>
            <Label n="04">Paper Trading</Label>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,3.8vw,48px)', fontWeight:700, letterSpacing:-2, lineHeight:1, marginBottom:18 }}>
              Test risk-free on<br/><span style={{ color:'var(--blu)' }}>live market data.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.75, marginBottom:26 }}>Deploy your algo with ₹1,00,000 virtual capital on real NSE/BSE live feeds. Watch signals fire, track virtual P&amp;L, tweak any parameter — then go live when you&apos;re confident.</p>
            <div>
              <Spec icon="play" title="Real data, zero real money" desc="Live NSE/BSE market feed with ₹1,00,000 virtual capital. Adjust any strategy parameter anytime."/>
              <Spec icon="layers" title="Download and deploy yourself" desc="After consistent paper-trade results, SignalGenie generates code you download and run via your own broker API. You control the execution."/>
            </div>
          </div>
          <div className="lp-feat-visual" style={{ direction:'ltr' }}>
            <Term title="signalgenie — paper · DAY 6 OF 7" right={<Tag tone="info" label="● RUNNING"/>}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[['+₹8,420','var(--grn)','VIRTUAL P&L'],['71%','var(--txt)','WIN RATE']].map(([v,c,l]) => (
                  <div key={l} style={{ background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:9, padding:'12px 14px' }}>
                    <div style={{ fontFamily:GROTESK, fontSize:22, fontWeight:700, color:c, letterSpacing:-0.5 }}>{v}</div>
                    <div style={{ fontFamily:MONO, fontSize:8.5, color:'var(--dim2)', marginTop:3, letterSpacing:1 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {([
                  ['09:31','ENTRY','var(--grn)','RELIANCE','+₹1,632'],
                  ['14:22','EXIT','var(--red)','INFY','+₹2,340'],
                  ['10:05','FLAT','var(--dim2)','HDFCBANK','—'],
                ] as [string,string,string,string,string][]).map(([t,sig,c,sym,pl],i) => (
                  <div key={t+sym} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderTop: i ? '1px solid var(--bdr)' : 'none' }}>
                    <span style={{ fontFamily:MONO, fontSize:10, color:'var(--dim2)' }}>{t}</span>
                    <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, letterSpacing:1, color:c, border:`1px solid color-mix(in srgb, ${c} 40%, transparent)`, padding:'2px 7px', borderRadius:4 }}>{sig}</span>
                    <span style={{ fontFamily:MONO, fontSize:11.5, fontWeight:700 }}>{sym}</span>
                    <span style={{ marginLeft:'auto', fontFamily:MONO, fontSize:11, fontWeight:700, color: pl==='—' ? 'var(--dim2)' : 'var(--grn)' }}>{pl}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--bdr)', marginTop:6, paddingTop:10, fontFamily:MONO, fontSize:9, color:'var(--dim2)', letterSpacing:0.8 }}>
                ₹1,00,000 VIRTUAL CAPITAL · ZERO REAL-MONEY RISK
              </div>
            </Term>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Bento ────────────────────────────────────────────── */}
      <section style={sect('clamp(70px,9vw,120px)')}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }} className="lp-reveal">
            <Label n="05">Everything Included</Label>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,4vw,46px)', fontWeight:700, letterSpacing:-2 }}>One platform. All the tools.</h2>
          </div>
          <div className="lp-bento lp-reveal">
            {/* Paper Trading — tall */}
            <div className="tall" style={{ ...PANEL, padding:26 }}>
              <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon name="play" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Paper Trading</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, marginBottom:22 }}>Live market data, virtual capital, zero real-money risk. Test and tweak before you decide to use the code yourself.</div>
              <div style={{ background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:11 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--grn)', animation:'blink 2s infinite' }}/>
                  <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1, color:'var(--grn)' }}>RUNNING · DAY 6</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'var(--dim)' }}>Virtual P&amp;L</span>
                  <span style={{ fontFamily:MONO, fontSize:12.5, fontWeight:700, color:'var(--grn)' }}>+₹8,420</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--dim)' }}>Win Rate</span>
                  <span style={{ fontFamily:MONO, fontSize:12.5, fontWeight:700 }}>71%</span>
                </div>
              </div>
            </div>
            {/* Account Aggregator */}
            <div style={{ ...PANEL, padding:26 }}>
              <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon name="link" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Account Aggregator</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>RBI-regulated AA sync — stocks, MFs, FDs, NPS, EPF in one SignalGenie dashboard.</div>
            </div>
            {/* Earnings Calendar */}
            <div style={{ ...PANEL, padding:26 }}>
              <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon name="calendar" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Earnings Calendar</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>AI-predicted earnings impact for every NSE/BSE quarterly result — pre-position before the announcement.</div>
            </div>
            {/* Track Record — span2 */}
            <div className="span2" style={{ ...PANEL, padding:26 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'center' }}>
                <div>
                  <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                    <Icon name="x" size={14} color="var(--blu)"/>
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Twitter / X Track Record</div>
                  <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>Every scan result auto-posted publicly. Weekly accuracy scorecards — full accountability. Nothing hidden.</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {[['WEEK 23 ACCURACY','71.4%','var(--grn)'],['SCANS RUN','14','var(--txt)'],['↑ STRONG ZONE','10','var(--grn)']].map(([l,v,c]) => (
                    <div key={l} style={{ padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:9, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1, color:'var(--dim2)' }}>{l}</span>
                      <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* US Markets */}
            <div style={{ ...PANEL, padding:26 }}>
              <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon name="globe" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>US Markets <Tag tone="flat" label="SOON"/></div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>NYSE &amp; NASDAQ technical scans for Indian LRS investors. ESPP &amp; RSU tracking included.</div>
            </div>
            {/* Mobile App */}
            <div style={{ ...PANEL, padding:26 }}>
              <div style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon name="phone" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Mobile App <Tag tone="up" label="IOS LIVE"/></div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7 }}>Full SignalGenie on iOS — scan results, alerts, portfolio sync, paper trading in your pocket. Android coming soon.</div>
            </div>
          </div>
        </div>
      </section>

      {sdiv}

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" style={sect('clamp(70px,9vw,120px)')}>
        <div style={{ maxWidth:1160, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:48 }} className="lp-reveal">
            <div style={{ display:'inline-block' }}><Label n="06">Pricing</Label></div>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(30px,4vw,52px)', fontWeight:700, letterSpacing:-2, lineHeight:1.04, marginBottom:14 }}>
              One plan beats<br/><span style={{ color:'var(--blu)' }}>every premium service.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--dim)', maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>Transparent pricing. Cancel anytime. Public accuracy record — verify before you pay.</p>
          </div>

          {/* Period toggle */}
          <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap', justifyContent:'center' }} className="lp-reveal">
            <div style={{ display:'flex', gap:4, background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:4, flexWrap:'wrap' }}>
              {([['mo','Monthly'],['qtr','Quarterly','SAVE 10%'],['half','Half-Yearly','SAVE 17%'],['yr','Annual','SAVE 25%']] as [string,string,string?][]).map(([k,label,badge]) => (
                <button key={k} onClick={() => setPeriod(k as 'mo'|'qtr'|'half'|'yr')}
                  style={{ height:36, padding:'0 16px', borderRadius:8, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s ease',
                    background: period===k ? 'var(--surf2)' : 'transparent',
                    border: period===k ? '1px solid var(--bdr)' : '1px solid transparent',
                    color: period===k ? 'var(--txt)' : 'var(--dim)',
                  }}>
                  {label}
                  {badge && <span style={{ fontFamily:MONO, fontSize:8.5, fontWeight:700, letterSpacing:0.8, padding:'2px 6px', borderRadius:4,
                    background:'color-mix(in srgb, var(--grn) 10%, transparent)', color:'var(--grn)', border:'1px solid color-mix(in srgb, var(--grn) 30%, transparent)' }}>{badge}</span>}
                </button>
              ))}
            </div>
          </div>
          {pr.note && <div style={{ textAlign:'center', fontSize:13, color:'var(--grn)', marginBottom:24, fontWeight:600 }}>{pr.note}</div>}

          {/* Plan cards */}
          <div className="lp-plans lp-reveal">
            {([
              { name:'Free',    price:'₹0',  cycle:'forever · no card', href:'/sign-in',
                feats:['India portfolio (NSE/BSE)','5 screener scans/day','Market Brief + FII/DII'], nope:['No RSU/ESPP tracker','No push alerts','No algo builder'], pro:false },
              { name:'Starter', price:pr.s,  cycle:pr.cy, href:'/sign-in?plan=starter',
                feats:['Unlimited screener scans','Watchlist + push alerts','Paper trading (full)','Track record (accuracy)','Capital gains report'], nope:['No RSU/ESPP tracker','No algo builder'], pro:false },
              { name:'Pro',     price:pr.p,  cycle:pr.cy, href:'/sign-in?plan=pro',
                feats:['RSU & ESPP tracker (E*Trade, Schwab, Shareworks)','US multi-portfolio · combined INR net worth','Algo builder + backtesting','Everything in Starter','Broker sync · coming soon','WhatsApp alerts · coming soon'], nope:[], pro:true },
              { name:'Elite',   price:pr.e,  cycle:pr.cy, href:'/sign-in?plan=elite',
                feats:['Everything in Pro','API access (500 req/day)','Priority support','Custom ML model · coming soon','AA account sync · coming soon'], nope:[], pro:false },
            ] as const).map(plan => (
              <div key={plan.name} className={`lp-plan-card${plan.pro ? ' lp-plan-pro' : ''}`}
                style={{ ...PANEL, padding:'26px 22px', position:'relative', borderColor: plan.pro ? 'var(--blu)' : 'var(--bdr)' }}>
                {plan.pro && (
                  <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:'var(--blu)', color:'#fff', fontFamily:MONO, fontSize:8.5, fontWeight:700, padding:'4px 12px', borderRadius:4, letterSpacing:1.4, whiteSpace:'nowrap' }}>
                    BEST VALUE
                  </div>
                )}
                <div style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:2, color: plan.pro ? 'var(--blu)' : 'var(--dim2)', marginBottom:14, marginTop: plan.pro ? 8 : 0 }}>{plan.name}</div>
                <div style={{ fontFamily:GROTESK, fontSize:40, fontWeight:700, letterSpacing:-2, lineHeight:1, color:'var(--txt)', marginBottom:6 }}>{plan.price}</div>
                <div style={{ fontFamily:MONO, fontSize:9.5, color:'var(--dim2)', marginBottom:24, letterSpacing:0.5 }}>{plan.cycle}</div>
                <div style={{ height:1, background:'var(--bdr)', marginBottom:20 }}/>
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, marginBottom:26, padding:0 }}>
                  {plan.feats.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12.5, color:'var(--txt)', lineHeight:1.5 }}>
                      <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'var(--grn)', flexShrink:0, marginTop:1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                  {plan.nope.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12.5, color:'var(--dim2)', lineHeight:1.5 }}>
                      <span style={{ flexShrink:0, marginTop:1, fontFamily:MONO }}>–</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className="lp-btn" style={{ width:'100%', height:44, borderRadius:9, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center',
                  background: plan.pro ? 'var(--blu)' : 'var(--surf2)',
                  color: plan.pro ? '#fff' : 'var(--txt)',
                  border: plan.pro ? 'none' : '1px solid var(--bdr)' }}>
                  {plan.pro ? 'Start Pro →' : `Get ${plan.name} →`}
                </Link>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div style={{ marginTop:28, ...PANEL, padding:'22px 26px' }} className="lp-reveal">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--bdr)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="ticket" size={15} color="var(--blu)"/>
              </div>
              <div style={{ fontSize:15, fontWeight:700 }}>Have a coupon code?</div>
            </div>
            <div style={{ fontSize:13, color:'var(--dim)', marginBottom:14, marginLeft:42 }}>Apply a discount on any paid plan.</div>
            <div style={{ display:'flex', gap:10, maxWidth:460 }}>
              <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="e.g. SIGNAL20"
                style={{ flex:1, height:44, borderRadius:9, background:'var(--bg)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:700, padding:'0 16px', fontFamily:MONO, outline:'none', textTransform:'uppercase', letterSpacing:1.5 }}
                onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
              <button onClick={applyCoupon} className="lp-btn" style={{ height:44, padding:'0 22px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Apply</button>
            </div>
            {couponMsg && <div style={{ fontSize:13, marginTop:10, fontWeight:600, color:couponMsg.ok?'var(--grn)':'var(--red)' }}>{couponMsg.text}</div>}
          </div>

          {/* SEBI disclaimer */}
          <div style={{ marginTop:16, padding:'14px 22px', background:'color-mix(in srgb, var(--ylw) 4%, transparent)', border:'1px solid color-mix(in srgb, var(--ylw) 14%, transparent)', borderRadius:12 }} className="lp-reveal">
            <p style={{ fontSize:12, color:'var(--dim)', lineHeight:1.7, margin:0 }}>
              <strong style={{ color:'var(--ylw)' }}>SEBI DISCLAIMER:</strong> SignalGenie is <strong style={{ color:'var(--ylw)' }}>NOT registered with SEBI</strong>. This is a <strong style={{ color:'var(--ylw)' }}>technical screening tool</strong>. All scan results and computed indicators are for <strong style={{ color:'var(--ylw)' }}>informational purposes only</strong> — not financial advice, not investment recommendations. Consult a SEBI-registered Research Analyst before investing.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={sect('clamp(60px,8vw,100px)')}>
        <div style={{ maxWidth:1100, margin:'0 auto' }} className="lp-reveal">
          <div style={{ ...PANEL, borderRadius:20, padding:'clamp(48px,7vw,84px) clamp(24px,6vw,80px)', textAlign:'center' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, border:'1px solid var(--bdr)', background:'var(--bg)', borderRadius:6, padding:'6px 14px', marginBottom:24 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--grn)', animation:'blink 2s ease-in-out infinite' }}/>
              <span style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--dim)' }}>Get Started Today</span>
            </div>
            <h2 style={{ fontFamily:GROTESK, fontSize:'clamp(32px,5.5vw,64px)', fontWeight:700, letterSpacing:-2.5, lineHeight:.96, marginBottom:20 }}>
              Stop paying for<br/><span style={{ color:'var(--blu)' }}>unverified calls.</span>
            </h2>
            <p style={{ fontSize:15.5, color:'var(--dim)', maxWidth:470, margin:'0 auto 40px', lineHeight:1.75 }}>
              Free to start. Public track record every week. Verify the accuracy before you spend a single rupee.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
              <Link href="/sign-in" className="lp-btn" style={{ height:52, padding:'0 32px', borderRadius:10, fontSize:15, fontWeight:700, background:'var(--blu)', color:'#fff', display:'flex', alignItems:'center', textDecoration:'none' }}>
                Start Free — No Card Needed →
              </Link>
              <Link href="/dashboard/track-record" className="lp-btn" style={{ height:52, padding:'0 28px', borderRadius:10, fontSize:15, fontWeight:600, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', display:'flex', alignItems:'center', textDecoration:'none' }}>
                View Track Record
              </Link>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', borderTop:'1px solid var(--bdr)', paddingTop:22, maxWidth:560, margin:'0 auto' }}>
              {['NSE · BSE','4,000+ STOCKS','71.4% ACCURACY','LIVE ON TWITTER/X'].map((t,i) => (
                <span key={t} style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, letterSpacing:1.2, color:'var(--dim2)', display:'flex', alignItems:'center', gap:10 }}>
                  {i > 0 && <span style={{ color:'var(--bdr)' }}>/</span>}{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--bdr)', padding:'44px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:32 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:18, fontWeight:700, letterSpacing:-0.5, marginBottom:8, fontFamily:GROTESK }}><SignalLogo /> SignalGenie</div>
            <div style={{ fontSize:12, color:'var(--dim)', maxWidth:270, lineHeight:1.65 }}>AI-powered trading intelligence for NSE &amp; BSE. Not SEBI registered. Not financial advice.</div>
          </div>
          <div style={{ display:'flex', gap:52, flexWrap:'wrap' }}>
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
                <div style={{ fontFamily:MONO, fontSize:9.5, fontWeight:700, color:'var(--dim2)', letterSpacing:1.6, textTransform:'uppercase', marginBottom:14 }}>{col.h}</div>
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
        <div style={{ maxWidth:1200, margin:'28px auto 0', paddingTop:20, borderTop:'1px solid var(--bdr)', fontFamily:MONO, fontSize:10.5, color:'var(--dim2)', lineHeight:1.8, letterSpacing:0.3 }}>
          © 2026 SIGNALGENIE · BUILT BY VAASUDEV AMITAV &amp; SAI KUMAR BETHALA &nbsp;·&nbsp;
          <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> &nbsp;·&nbsp;
          TECHNICAL SCAN RESULTS FOR EDUCATIONAL PURPOSES ONLY &nbsp;·&nbsp; NOT FINANCIAL ADVICE &nbsp;·&nbsp; DYOR
        </div>
      </footer>

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
