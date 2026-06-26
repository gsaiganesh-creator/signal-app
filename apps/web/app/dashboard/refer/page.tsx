'use client';
import { useState } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const TIERS = [
  { refs:0, disc:0,  label:'Start',        color:'var(--dim)'  },
  { refs:1, disc:5,  label:'1 friend',     color:'var(--grn)'  },
  { refs:2, disc:10, label:'2 friends',    color:'var(--grn)'  },
  { refs:3, disc:20, label:'3 friends',    color:'var(--ylw)'  },
  { refs:4, disc:40, label:'4 friends',    color:'var(--org)'  },
  { refs:5, disc:80, label:'5 friends 🏆', color:'var(--pur)'  },
];

// Stable short code from user id — unique per user, no backend table needed for link gen
function refCode(userId: string) {
  return 'SG-' + userId.replace(/-/g, '').slice(0, 5).toUpperCase();
}

export default function ReferPage() {
  const { user } = usePortfolio();
  const [copied, setCopied] = useState(false);

  const code    = user ? refCode(user.id) : '—';
  const refLink = user ? `https://getsignal.in/ref/${code}` : '';

  // Will come from Supabase referrals table once built — everyone starts at 0
  const paidRefs:    number = 0;
  const pendingRefs: number = 0;
  const discountPct: number = 0;
  const nextTier    = TIERS[paidRefs + 1];

  function copyLink() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function shareX() {
    const text = encodeURIComponent('I use SIGNAL for ML-powered technical scans — 71.4% scan accuracy, fully public track record. Sign up with my link and start free 👇');
    const url  = encodeURIComponent(refLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }

  function shareWA() {
    const msg = encodeURIComponent('Hey! I use SIGNAL for NSE/BSE technical screener — ML-powered, 71.4% scan accuracy. Sign up free with my link: ' + refLink);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  if (!user) return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--dim)' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:700 }}>Sign in to access your referral link</div>
    </div>
  );

  return (
    <>
      {/* Hero */}
      <div className="g2" style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.08),rgba(23,64,245,0.06))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:20, padding:'clamp(20px,4vw,36px) clamp(16px,4vw,40px)', display:'grid', gap:32, alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--grn)', marginBottom:10 }}>Referral Programme</div>
          <h1 style={{ fontSize:'clamp(24px,3vw,38px)', fontWeight:900, letterSpacing:-1, marginBottom:12 }}>
            Refer friends.<br/>Earn up to <span style={{ color:'var(--grn)' }}>80% off</span><br/>your annual plan.
          </h1>
          <p style={{ fontSize:14, color:'var(--dim)', lineHeight:1.7, maxWidth:480 }}>
            Every friend who buys any paid plan earns you a discount on your annual subscription — applied automatically at renewal. Cap: 5 referrals = 80% off.
          </p>
        </div>
        <div style={{ textAlign:'center' }}>
          {discountPct > 0 ? (
            <>
              <div style={{ fontSize:72, fontWeight:900, letterSpacing:-3, color:'var(--grn)', lineHeight:1 }}>{discountPct}%</div>
              <div style={{ fontSize:13, color:'var(--dim)', marginTop:6 }}>your current discount<br/>({paidRefs} paid referral{paidRefs !== 1 ? 's' : ''})</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:56, fontWeight:900, letterSpacing:-2, color:'var(--dim)', lineHeight:1 }}>0%</div>
              <div style={{ fontSize:13, color:'var(--dim)', marginTop:8, lineHeight:1.6 }}>No referrals yet<br/>Share your link below to start</div>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {discountPct === 0 ? (
        <div style={{ background:'rgba(79,111,250,0.06)', border:'1px solid rgba(79,111,250,0.2)', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' as const, marginBottom:24 }}>
          <div style={{ fontSize:36, flexShrink:0 }}>🎁</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Your referral link is ready</div>
            <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
              Share your unique link. When a friend buys any paid plan, you unlock <strong style={{ color:'var(--grn)' }}>5% off</strong> your annual subscription. Refer 5 friends for <strong style={{ color:'var(--pur)' }}>80% off</strong>.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.1),rgba(23,64,245,0.07))', border:'1px solid rgba(0,212,160,0.3)', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' as const, marginBottom:24 }}>
          <div style={{ fontSize:36, flexShrink:0 }}>🏆</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>You&apos;ve referred {paidRefs} friend{paidRefs !== 1 ? 's' : ''} who bought paid plans</div>
            {nextTier && <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>1 more paid referral unlocks <strong style={{ color:'var(--ylw)' }}>{nextTier.disc}% off</strong>.</div>}
          </div>
          <div style={{ fontSize:40, fontWeight:900, letterSpacing:-1.5, color:'var(--grn)', textAlign:'right' as const, flexShrink:0 }}>
            {discountPct}%<br/><span style={{ fontSize:14, color:'var(--dim)', fontWeight:500 }}>off annual</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="g4" style={{ display:'grid', gap:12, marginBottom:24 }}>
        {[
          { val: paidRefs.toString(),    valColor:'var(--grn)',  lbl:'Paid referrals'   },
          { val: pendingRefs.toString(), valColor:'var(--ylw)',  lbl:'Pending (not paid)' },
          { val: discountPct > 0 ? `${discountPct}%` : '—', valColor:'var(--grn)', lbl:'Discount unlocked' },
          { val: Math.max(0, 5 - paidRefs).toString(), valColor:'var(--txt)', lbl:'More to max reward' },
        ].map(s => (
          <div key={s.lbl} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:13, padding:18, textAlign:'center' as const }}>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, color:s.valColor }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Discount ladder */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:16, padding:20, marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Discount Ladder</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Each paid referral unlocks the next tier. Non-expiring.</div>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {TIERS.filter(t => t.refs > 0).map((t, i) => {
            const tierRefs = i + 1;
            const achieved = paidRefs > tierRefs;
            const current  = paidRefs === tierRefs;
            const upcoming = paidRefs + 1 === tierRefs;
            return (
              <div key={t.refs} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:10,
                background: current ? 'rgba(0,212,160,0.1)' : upcoming ? 'rgba(255,184,0,0.05)' : 'transparent',
                border: current ? '1px solid rgba(0,212,160,0.3)' : '1px solid transparent',
                marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900,
                  background: achieved ? 'var(--grn)' : current ? 'var(--ylw)' : 'var(--surf2)',
                  color: (achieved || current) ? '#000' : 'var(--dim)',
                  border: upcoming ? '1px dashed var(--ylw)' : 'none' }}>
                  {achieved ? '✓' : t.refs}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{t.label}</div>
                  <div style={{ fontSize:11, color: upcoming ? 'var(--ylw)' : current ? 'var(--ylw)' : 'var(--dim)', fontWeight: (upcoming || current) ? 700 : 400 }}>
                    {achieved ? 'Achieved ✓' : current ? 'Your current tier' : upcoming ? '← Next tier' : ''}
                  </div>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color: achieved || current ? 'var(--grn)' : t.color }}>{t.disc}%</div>
              </div>
            );
          })}
        </div>
        {nextTier && (
          <div style={{ marginTop:16, padding:'14px 16px', background:'rgba(255,184,0,0.06)', borderRadius:10, border:'1px solid rgba(255,184,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
              <span style={{ fontWeight:700 }}>Progress to next tier</span>
              <span style={{ fontWeight:700, color:'var(--ylw)' }}>{paidRefs} / {nextTier.refs} → {nextTier.disc}% off</span>
            </div>
            <div style={{ height:7, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, width:`${(paidRefs / nextTier.refs) * 100}%`, background:'linear-gradient(90deg,var(--grn),#00A87D)', transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>
              {nextTier.refs - paidRefs} more paid referral{nextTier.refs - paidRefs !== 1 ? 's' : ''} to unlock {nextTier.disc}% off annual
            </div>
          </div>
        )}
      </div>

      {/* Referral link */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:22, marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Your unique referral link</div>
        <div style={{ fontSize:13, color:'var(--dim)', marginBottom:10 }}>Share this link. When a friend signs up and buys any paid plan, your discount updates automatically.</div>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <input readOnly value={refLink}
            style={{ flex:1, height:48, borderRadius:11, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--grn)', fontSize:13, fontWeight:700, padding:'0 16px', fontFamily:'monospace', outline:'none', letterSpacing:0.5 }}/>
          <button onClick={copyLink}
            style={{ height:48, padding:'0 22px', borderRadius:11, background:'var(--grn)', border:'none', color:'#001A12', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {copied ? '✅ Copied!' : '⎘ Copy Link'}
          </button>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' as const }}>
          <button onClick={shareX}
            style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'#000', border:'1px solid #333', color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
            𝕏 Share on Twitter
          </button>
          <button onClick={shareWA}
            style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', display:'flex', alignItems:'center', gap:6 }}>
            💬 Share on WhatsApp
          </button>
          <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`, '_blank')}
            style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', display:'flex', alignItems:'center', gap:6 }}>
            in Share on LinkedIn
          </button>
          <button onClick={copyLink}
            style={{ height:36, padding:'0 16px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', display:'flex', alignItems:'center', gap:6 }}>
            📧 Copy &amp; Email
          </button>
        </div>
      </div>

      {/* Log + Rules */}
      <div className="g-side" style={{ display:'grid', gap:16 }}>

        {/* Referral log */}
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--bdr)' }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Referral Log</div>
            <span style={{ fontSize:12, color:'var(--dim)' }}>{paidRefs + pendingRefs} total</span>
          </div>
          {paidRefs + pendingRefs === 0 ? (
            <div style={{ padding:'40px 24px', textAlign:'center' as const }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No referrals yet</div>
              <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, maxWidth:300, margin:'0 auto' }}>
                Share your link above. When a friend signs up and buys a plan, they&apos;ll appear here and your discount unlocks automatically.
              </div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Friend','Plan','Status','Disc'].map((h,i) => (
                    <th key={h} className={i===1?'mob-hide':''} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'9px 14px', textAlign:'left' as const, borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', textTransform:'uppercase' as const, letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{/* populated from Supabase referrals table */}</tbody>
            </table>
          )}
        </div>

        {/* Rules */}
        <div>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bdr)', fontSize:14, fontWeight:700 }}>Discount Tiers</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Referrals','Discount','Annual saving'].map(h => (
                    <th key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'9px 14px', textAlign:'left' as const, borderBottom:'1px solid var(--bdr)', background:'var(--surf2)', textTransform:'uppercase' as const, letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ['1 friend',    '5% off',  'var(--grn)', 'Save ₹269/yr'  ],
                  ['2 friends',   '10% off', 'var(--grn)', 'Save ₹539/yr'  ],
                  ['3 friends',   '20% off', 'var(--ylw)', 'Save ₹1,078/yr'],
                  ['4 friends',   '40% off', 'var(--org)', 'Save ₹2,155/yr'],
                  ['5 friends 🏆','80% off', 'var(--pur)', 'Save ₹4,310/yr'],
                ] as const).map(([refs, disc, color, save], i) => (
                  <tr key={refs} style={{ background: paidRefs > i ? 'rgba(0,212,160,0.04)' : 'transparent' }}>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', fontWeight:700, fontSize:12 }}>{refs}{paidRefs > i ? ' ✓' : ''}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', color: paidRefs > i ? 'var(--grn)' : color, fontWeight:800 }}>{disc}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid rgba(28,46,74,0.4)', color:'var(--dim)' }}>{save}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>How it works</div>
            {[
              'Share your unique referral link. Friends sign up via your link.',
              'Discount triggers only when your referred friend buys a paid plan. Free signups don\'t count.',
              'Discounts apply to annual subscriptions only — monthly/quarterly excluded.',
              'Discounts are incremental and non-expiring — they stack as long as friends remain paying subscribers.',
              'Maximum: 80% off annual (5 paid referrals). No further discount beyond 5.',
              'If a referred friend cancels, your discount tier adjusts at your next renewal.',
            ].map((rule, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < 5 ? '1px solid var(--bdr)' : 'none', fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:'var(--surf2)', border:'1px solid var(--card-bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'var(--dim)', flexShrink:0, marginTop:1 }}>{i+1}</div>
                <div>{rule}</div>
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
