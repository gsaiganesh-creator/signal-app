'use client';
import { useState } from 'react';

const TIERS = [
  { refs:0, disc:0,  label:'Start',        color:'var(--dim)',  height:30  },
  { refs:1, disc:5,  label:'✓ Done',       color:'var(--grn)',  height:52  },
  { refs:2, disc:10, label:'← You are here', color:'var(--ylw)', height:80  },
  { refs:3, disc:20, label:'1 more →',     color:'var(--ylw)',  height:110 },
  { refs:4, disc:40, label:'2 more →',     color:'var(--org)',  height:150 },
  { refs:5, disc:80, label:'🏆 Max!',      color:'var(--pur)',  height:200 },
];

const REFERRALS = [
  { name:'Abhay Vittal', email:'abhay@gmail.com',   joined:'Jun 10, 2026', plan:'Pro · ₹599/mo',     planColor:'var(--org)', status:'✅ Paid',       statusBg:'rgba(0,212,160,0.12)', statusColor:'var(--grn)', disc:'+5% off' },
  { name:'Harshit',      email:'harshit@outlook.com', joined:'Jun 14, 2026', plan:'Starter · ₹199/mo', planColor:'var(--bluL)', status:'✅ Paid',      statusBg:'rgba(0,212,160,0.12)', statusColor:'var(--grn)', disc:'+5% off' },
  { name:'Jaitik',       email:'jaitik@gmail.com',  joined:'Jun 20, 2026', plan:'—',                  planColor:'var(--dim)',  status:'⏳ Signed up', statusBg:'rgba(255,184,0,0.1)', statusColor:'var(--ylw)', disc:'Pending payment' },
];

export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const refLink = 'https://getsignal.in/ref/SG-K92XP';

  function copyLink() {
    navigator.clipboard?.writeText(refLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function shareX() {
    const text = encodeURIComponent('I use SIGNAL for ML-powered stock signals — 71.4% accuracy, fully public track record. Sign up with my link and start free 👇');
    const url  = encodeURIComponent(refLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  function shareWA() {
    const msg = encodeURIComponent('Hey! I use SIGNAL for NSE/BSE stock signals — ML-powered, 71.4% accuracy. Sign up free with my link: ' + refLink);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  return (
    <>
      {/* Hero banner */}
      <div className="g2" style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),rgba(23,64,245,0.06))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:20, padding:'clamp(20px,4vw,36px) clamp(16px,4vw,40px)', display:'grid', gap:32, alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--grn)', marginBottom:10 }}>Referral Programme</div>
          <h1 style={{ fontSize:'clamp(24px,3vw,38px)', fontWeight:900, letterSpacing:-1, marginBottom:12 }}>
            Refer friends.<br/>Earn up to <span style={{ color:'var(--grn)' }}>80% off</span><br/>your annual plan.
          </h1>
          <p style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, maxWidth:480 }}>Every friend you refer who buys any paid plan earns you a discount on your annual subscription — automatically applied at renewal. The more you refer, the bigger the discount. Cap: 5 referrals = 80% off.</p>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:72, fontWeight:900, letterSpacing:-3, color:'var(--grn)', lineHeight:1 }}>10%</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:6 }}>your current discount<br/>earned (2 referrals)</div>
        </div>
      </div>

      {/* Earned banner */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.1),rgba(23,64,245,0.07))', border:'1px solid rgba(0,212,160,0.3)', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' as const, marginBottom:24 }}>
        <div style={{ fontSize:36, flexShrink:0 }}>🏆</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>You&apos;ve referred 2 friends who bought paid plans</div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>Your annual Pro plan renews at <strong style={{ color:'var(--grn)' }}>₹5,388 → ₹4,849</strong> (10% off). Refer 1 more friend to unlock 20% off (₹4,310/yr). Refer 5 total to unlock 80% off!</div>
        </div>
        <div style={{ fontSize:40, fontWeight:900, letterSpacing:-1.5, color:'var(--grn)', textAlign:'right', flexShrink:0 }}>
          10%<br/><span style={{ fontSize:14, color:'var(--dim)', fontWeight:500 }}>off annual</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {[
          { val:'2',  valColor:'var(--grn)', lbl:'Paid referrals' },
          { val:'1',  valColor:'var(--ylw)', lbl:'Pending (signed up, not paid)' },
          { val:'10%',valColor:'var(--grn)', lbl:'Discount unlocked' },
          { val:'3',  valColor:'var(--txt)', lbl:'More referrals to max' },
        ].map(s => (
          <div key={s.lbl} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:13, padding:18, textAlign:'center' as const }}>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, color:s.valColor }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Discount ladder — mobile-friendly stepper */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:20, marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Discount Ladder</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Each paid referral unlocks the next tier. Non-expiring.</div>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {TIERS.map((t, i) => {
            const achieved = i <= 2;
            const current  = i === 2;
            const upcoming = i === 3;
            const bg = current ? 'rgba(0,212,160,0.1)' : achieved ? 'transparent' : upcoming ? 'rgba(255,184,0,0.05)' : 'transparent';
            const border = current ? '1px solid rgba(0,212,160,0.3)' : '1px solid transparent';
            const discColor = current ? 'var(--grn)' : achieved ? 'var(--grn)' : t.color;
            return (
              <div key={t.refs} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:10, background:bg, border, marginBottom:4 }}>
                {/* Step circle */}
                <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900,
                  background: current ? 'var(--ylw)' : achieved ? 'var(--grn)' : 'var(--surf2)',
                  color: (current || achieved) ? '#000' : 'var(--dim)',
                  border: upcoming ? '1px dashed var(--ylw)' : 'none' }}>
                  {achieved && !current ? '✓' : t.refs}
                </div>
                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--txt)' }}>{t.refs} {t.refs===1?'referral':'referrals'}</div>
                  <div style={{ fontSize:11, color: current ? 'var(--ylw)' : 'var(--dim)', fontWeight: current ? 700 : 400 }}>{t.label}</div>
                </div>
                {/* Discount */}
                <div style={{ fontSize:20, fontWeight:900, color:discColor }}>{t.disc}%</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:16, padding:'14px 16px', background:'rgba(255,184,0,0.06)', borderRadius:10, border:'1px solid rgba(255,184,0,0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
            <span style={{ fontWeight:700 }}>Progress to next tier</span>
            <span style={{ fontWeight:700, color:'var(--ylw)' }}>2 / 3 → 20% off</span>
          </div>
          <div style={{ height:7, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:4, width:'66.6%', background:'linear-gradient(90deg,var(--grn),#00A87D)' }}/>
          </div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>1 more paid referral unlocks 20% off your annual plan</div>
        </div>
      </div>

      {/* Referral link box */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:22, marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Your unique referral link</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:10 }}>Share this link. When a friend signs up via it and buys any paid plan, your discount instantly updates.</div>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <input readOnly value={refLink} style={{ flex:1, height:48, borderRadius:11, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--grn)', fontSize:13, fontWeight:700, padding:'0 16px', fontFamily:'monospace', outline:'none', letterSpacing:0.5 }}/>
          <button onClick={copyLink} style={{ height:48, padding:'0 22px', borderRadius:11, background:'var(--grn)', border:'none', color:'#001A12', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {copied ? '✅ Copied!' : '⎘ Copy Link'}
          </button>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' as const }}>
          <button onClick={shareX} style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'#000', border:'1px solid #333', color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
            𝕏 Share on Twitter
          </button>
          <button onClick={shareWA} style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', display:'flex', alignItems:'center', gap:6 }}>
            💬 Share on WhatsApp
          </button>
          <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`, '_blank')} style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', display:'flex', alignItems:'center', gap:6 }}>
            in Share on LinkedIn
          </button>
          <button onClick={copyLink} style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', display:'flex', alignItems:'center', gap:6 }}>
            📧 Copy &amp; Email
          </button>
        </div>
      </div>

      {/* Log + Rules grid */}
      <div className="g-side" style={{ display:'grid', gap:16 }}>

        {/* Referral log */}
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--bdr)' }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Referral Log</div>
            <span style={{ fontSize:12, color:'var(--dim)' }}>3 total</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                {['Friend','Plan','Status','Disc'].map((h,i) => (
                  <th key={h} className={i===1?'mob-hide':''} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'9px 14px', textAlign:'left', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', textTransform:'uppercase' as const, letterSpacing:0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REFERRALS.map(r => (
                <tr key={r.email}>
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{r.name}</div>
                    <div style={{ fontSize:11, color:'var(--dim)' }}>{r.joined}</div>
                  </td>
                  <td className="mob-hide" style={{ padding:'11px 14px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}><span style={{ fontSize:12, fontWeight:700, color:r.planColor }}>{r.plan}</span></td>
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid rgba(28,46,74,0.5)' }}><span style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:6, background:r.statusBg, color:r.statusColor, border:`1px solid ${r.statusColor}40`, whiteSpace:'nowrap' }}>{r.status}</span></td>
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid rgba(28,46,74,0.5)', fontWeight:800, fontSize:13, color: r.disc.startsWith('+') ? 'var(--grn)' : 'var(--dim)' }}>{r.disc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'14px 20px', background:'rgba(255,184,0,0.04)', borderTop:'1px solid var(--bdr)' }}>
            <div style={{ fontSize:12, color:'var(--ylw)' }}>⏳ Jaitik has signed up but hasn&apos;t bought a plan yet. Once they subscribe, your discount jumps to 20%.</div>
          </div>
        </div>

        {/* Tiers + Rules */}
        <div>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bdr)', fontSize:14, fontWeight:700 }}>Discount Tiers</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Referrals','Discount','Annual saving'].map(h => (
                    <th key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'9px 14px', textAlign:'left', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', textTransform:'uppercase' as const, letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { refs:'1 friend',    disc:'5% off',  discColor:'var(--grn)', save:'Save ₹269/yr',    saveColor:'var(--dim)', bg:'rgba(0,212,160,0.03)' },
                  { refs:'2 friends ✓ YOU', disc:'10% off', discColor:'var(--grn)', save:'Save ₹539/yr', saveColor:'var(--grn)', bg:'rgba(0,212,160,0.04)' },
                  { refs:'3 friends',   disc:'20% off', discColor:'var(--ylw)', save:'Save ₹1,078/yr',  saveColor:'var(--dim)', bg:'transparent' },
                  { refs:'4 friends',   disc:'40% off', discColor:'var(--org)', save:'Save ₹2,155/yr',  saveColor:'var(--dim)', bg:'transparent' },
                  { refs:'5 friends 🏆',disc:'80% off', discColor:'var(--pur)', save:'Save ₹4,310/yr',  saveColor:'var(--pur)', bg:'rgba(139,92,246,0.05)' },
                ].map(t => (
                  <tr key={t.refs} style={{ background:t.bg }}>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontWeight:700, fontSize:12 }}>{t.refs}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:t.discColor, fontWeight:800 }}>{t.disc}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:t.saveColor, fontWeight: t.saveColor!=='var(--dim)' ? 700 : 400 }}>{t.save}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>How it works</div>
            {[
              'Share your unique referral link. Friends sign up via your link.',
              'Discount is triggered only when your referred friend buys a paid plan (Starter, Pro, or Elite). Free signups don\'t count.',
              'Discounts apply to annual subscriptions only — monthly and quarterly plans are excluded.',
              'Discounts are incremental and non-expiring — they stack as long as your referred friends remain paying subscribers.',
              'Maximum discount: 80% off annual (5 paid referrals). No further discount beyond 5.',
              'If a referred friend cancels their subscription, your discount tier adjusts accordingly at your next renewal.',
            ].map((rule, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < 5 ? '1px solid var(--bdr)' : 'none', fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--card-bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'var(--dim)', flexShrink:0, marginTop:1 }}>{i+1}</div>
                <div dangerouslySetInnerHTML={{ __html: rule.replace('only when', '<strong>only when</strong>').replace('annual subscriptions only', '<strong>annual subscriptions only</strong>').replace('incremental and non-expiring', '<strong>incremental and non-expiring</strong>').replace('80% off annual', '<strong style="color:var(--pur)">80% off annual</strong>') }}/>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:14 }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Referral discounts apply to SIGNAL subscriptions only · Not financial advice · DYOR
      </div>
    </>
  );
}
