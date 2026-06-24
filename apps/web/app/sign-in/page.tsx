'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const [tab,   setTab  ] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pass,  setPass ] = useState('');
  const [name,  setName ] = useState('');
  const [msg,   setMsg  ] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function doOAuth(provider: 'google' | 'twitter') {
    setLoading(true);
    // In Capacitor, use URL scheme so OAuth returns to the app (not Safari)
    const isCapacitor = typeof window !== 'undefined' && !!(window as { Capacitor?: unknown }).Capacitor;
    const redirectTo = isCapacitor
      ? `com.gsaiganesh.signal.app://auth/callback`
      : `${location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) { setMsg(error.message); setLoading(false); }
    // on success browser redirects — no more code runs here
  }

  async function doSignIn() {
    if (!email || !pass) { setMsg('Enter email and password.'); return; }
    setLoading(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('not confirmed')) {
        setMsg('⚠️ Check your inbox — click the confirmation email link first, then sign in here.');
      } else if (error.message.toLowerCase().includes('invalid login') || error.message.toLowerCase().includes('invalid credentials')) {
        setMsg('❌ Wrong email or password. Did you sign up with Google instead?');
      } else {
        setMsg(`❌ ${error.message}`);
      }
      setLoading(false); return;
    }
    // Hard redirect so middleware sees fresh session cookie on the server
    window.location.href = '/dashboard';
  }

  async function doSignUp() {
    if (!email || pass.length < 8) { setMsg('Email + password (min 8 chars) required.'); return; }
    setLoading(true); setMsg('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name || undefined },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) { setMsg(`❌ ${error.message}`); setLoading(false); return; }
    if (data.session) {
      // email confirmation is disabled — signed in immediately
      window.location.href = '/dashboard';
      return;
    }
    // email confirmation required
    setMsg('✅ Account created! Check your inbox and click the confirmation link — then come back here to sign in.');
    setLoading(false);
  }

  const inp: React.CSSProperties = {
    width:'100%', height:46, borderRadius:11,
    background:'var(--surf2)', border:'1px solid var(--bdr)',
    color:'var(--txt)', fontSize:14, padding:'0 14px',
    fontFamily:'inherit', outline:'none',
  };

  const isError = msg && !msg.startsWith('✅') && !msg.startsWith('Signing');
  const isOk    = msg.startsWith('✅');

  return (
    <div className="sign-in-outer" style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh', display:'grid', gridTemplateColumns:'clamp(0px,45vw,560px) 1fr' }}>

      {/* ── Left panel — hidden on mobile via width:0 when viewport <700px ── */}
      <div style={{ background:'linear-gradient(145deg,#0A1525 0%,#0D1E3A 50%,#0A1525 100%)', borderRight:'1px solid var(--bdr)', padding:48, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden', minWidth:0 }}
        className="sign-in-left">
        <div style={{ position:'absolute', width:500, height:500, top:-100, left:-100, background:'radial-gradient(circle,rgba(23,64,245,0.14) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:400, height:400, bottom:-100, right:-50, background:'radial-gradient(circle,rgba(0,212,160,0.08) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }}/>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, fontSize:22, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', position:'relative', zIndex:1 }}>
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
            <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
          </svg>
          SIGNAL
        </Link>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'clamp(28px,3vw,42px)', fontWeight:900, letterSpacing:-1.5, lineHeight:1.1, marginBottom:12 }}>
            ML signals.<br/><span style={{ color:'var(--blu)' }}>Transparent</span><br/><span style={{ color:'var(--org)' }}>results.</span>
          </div>
          <p style={{ fontSize:15, color:'var(--dim)', lineHeight:1.65, maxWidth:380 }}>Join traders using Random Forest signals instead of unverified Telegram calls — at ₹199/month.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:40 }}>
            {[
              { user:'RF Pick of the Day', sym:'RELIANCE', sig:'STRONG BUY', pct:'87% conf.', sc:'var(--grn)', sbg:'rgba(0,212,160,0.15)', pc:'var(--grn)' },
              { user:'Paper Trade · Day 6', sym:'RSI+EMA Strategy', sig:'RUNNING', pct:'+8.4% virtual', sc:'var(--pur)', sbg:'rgba(139,92,246,0.15)', pc:'var(--grn)' },
              { user:'Week 23 Scorecard', sym:'Accuracy', sig:'10/14 signals', pct:'71.4%', sc:'var(--bluL)', sbg:'rgba(23,64,245,0.15)', pc:'var(--grn)' },
            ].map((c, i) => (
              <div key={i} style={{ background:'rgba(14,22,40,0.8)', border:'1px solid var(--bdr)', borderRadius:12, padding:'13px 16px', backdropFilter:'blur(10px)' }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6 }}>{c.user}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{c.sym}</div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, background:c.sbg, color:c.sc }}>{c.sig}</span>
                  <span style={{ fontSize:13, fontWeight:800, marginLeft:'auto', color:c.pc }}>{c.pct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:24, position:'relative', zIndex:1 }}>
          {[['var(--grn)','71.4%','Signal accuracy'],['var(--txt)','₹199','Starter / mo'],['var(--blu)','4,000+','Stocks tracked']].map(([c,v,l], i) => (
            <div key={i} style={{ display:'contents' }}>
              {i > 0 && <div style={{ width:1, background:'var(--bdr)' }}/>}
              <div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:-0.5, color:c }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px clamp(24px,5vw,80px)' }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <Link href="/" style={{ fontSize:12, color:'var(--dim)', display:'inline-flex', alignItems:'center', gap:5, marginBottom:28 }}>← Back to homepage</Link>

          {/* Tabs */}
          <div style={{ display:'flex', background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:10, padding:3, gap:3, marginBottom:24 }}>
            {(['signin','signup'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setMsg(''); }}
                style={{ flex:1, height:36, borderRadius:8, fontSize:13, fontWeight:600, background: tab===t ? 'var(--surf)' : 'transparent', border:'none', color: tab===t ? 'var(--txt)' : 'var(--dim)', cursor:'pointer', fontFamily:'inherit', boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div style={{ fontSize:28, fontWeight:900, letterSpacing:-0.8, marginBottom:6 }}>
            {tab === 'signin' ? 'Welcome back' : 'Start for free'}
          </div>
          <div style={{ fontSize:14, color:'var(--dim)', marginBottom:28, lineHeight:1.5 }}>
            {tab === 'signin' ? 'Sign in to your SIGNAL account' : 'Create your SIGNAL account — no card needed'}
          </div>

          {/* OAuth buttons */}
          <button onClick={() => doOAuth('twitter')} disabled={loading}
            style={{ width:'100%', height:48, borderRadius:12, fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:10, background:'#000', border:'1px solid #333', color:'#fff', opacity: loading ? 0.6 : 1 }}>
            <span style={{ fontSize:18, fontWeight:900 }}>𝕏</span>
            {tab === 'signin' ? 'Continue' : 'Sign up'} with Twitter / X
          </button>
          <button onClick={() => doOAuth('google')} disabled={loading}
            style={{ width:'100%', height:48, borderRadius:12, fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:10, background:'var(--surf)', border:'1px solid var(--bdr)', color:'var(--txt)', opacity: loading ? 0.6 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.5 9.2c0-.6-.1-1.1-.2-1.7H9v3.2h4.8c-.2 1.1-.9 2.1-1.9 2.7v2.2h3.1c1.8-1.7 2.5-4.1 2.5-6.4z" fill="#4285F4"/>
              <path d="M9 18c2.4 0 4.4-.8 5.9-2.2l-3.1-2.2c-.8.5-1.8.8-2.8.8-2.2 0-4-1.5-4.7-3.4H1.1v2.3C2.6 16 5.6 18 9 18z" fill="#34A853"/>
              <path d="M4.3 10.9c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5.2H1.1C.4 6.5 0 7.9 0 9.2s.4 2.7 1.1 4l3.2-2.3z" fill="#FBBC05"/>
              <path d="M9 3.6c1.2 0 2.3.4 3.2 1.2l2.4-2.4C13 .9 11.2 0 9 0 5.6 0 2.6 2 1.1 5l3.2 2.3C5 5.1 6.8 3.6 9 3.6z" fill="#EA4335"/>
            </svg>
            {tab === 'signin' ? 'Continue' : 'Sign up'} with Google
          </button>

          <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center', marginBottom:14, lineHeight:1.5 }}>
            ✅ Google sign-in works for both new and existing accounts — no separate sign-up needed.
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--bdr)' }}/>
            <span style={{ fontSize:12, color:'var(--dim2)', whiteSpace:'nowrap' }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:'var(--bdr)' }}/>
          </div>

          {tab === 'signup' && (
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>Full Name</label>
              <input style={inp} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--dim)', marginBottom:6 }}>Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>
          <div style={{ marginBottom:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--dim)' }}>Password</label>
              {tab === 'signin' && <a href="#" style={{ fontSize:12, color:'var(--bluL)' }}>Forgot password?</a>}
            </div>
            <input style={inp} type="password" placeholder={tab === 'signin' ? 'Your password' : 'Min 8 characters'} value={pass} onChange={e => setPass(e.target.value)}
              onFocus={e => e.target.style.borderColor='var(--blu)'} onBlur={e => e.target.style.borderColor='var(--bdr)'}/>
          </div>

          <button onClick={tab === 'signin' ? doSignIn : doSignUp} disabled={loading}
            style={{ width:'100%', height:50, borderRadius:12, background:'linear-gradient(135deg,var(--blu),var(--bluL))', border:'none', color:'#fff', fontSize:16, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', marginTop:6, boxShadow:'0 8px 24px rgba(23,64,245,0.35)', opacity: loading ? 0.7 : 1 }}>
            {loading ? '…' : tab === 'signin' ? 'Sign In →' : 'Create Free Account →'}
          </button>

          {msg && (
            <div style={{ fontSize:12, textAlign:'center', marginTop:10, color: isOk ? 'var(--grn)' : isError ? 'var(--red)' : 'var(--dim)' }}>
              {msg}
            </div>
          )}

          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--dim)' }}>
            {tab === 'signin'
              ? <>No account? <button onClick={() => { setTab('signup'); setMsg(''); }} style={{ background:'none', border:'none', color:'var(--bluL)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Create one free →</button></>
              : <>Have an account? <button onClick={() => { setTab('signin'); setMsg(''); }} style={{ background:'none', border:'none', color:'var(--bluL)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Sign in →</button></>
            }
          </div>

          <div style={{ fontSize:11, color:'var(--dim2)', lineHeight:1.6, textAlign:'center', marginTop:24 }}>
            ⚠️ SIGNAL is <strong>NOT SEBI registered</strong>. All signals are for informational purposes only. Not financial advice.
          </div>
        </div>
      </div>
    </div>
  );
}
