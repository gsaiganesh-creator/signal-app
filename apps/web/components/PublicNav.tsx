'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href:'/',              label:'Home'        },
  { href:'/track-record', label:'Track Record' },
  { href:'/about',        label:'About'        },
  { href:'/#pricing',     label:'Pricing'      },
];

export function PublicNav() {
  const path = usePathname();

  return (
    <>
      {/* SEBI banner */}
      <div style={{ background:'rgba(255,184,0,0.07)', borderBottom:'1px solid rgba(255,184,0,0.18)', padding:'7px clamp(16px,5vw,80px)', textAlign:'center' }}>
        <span style={{ fontSize:11, color:'rgba(255,184,0,0.8)' }}>⚠️ <strong>NOT SEBI REGISTERED</strong> — This is a technical screening tool. Momentum zones are computed indicators, not financial advice. You make your own decisions. DYOR.</span>
      </div>

      {/* Always dark nav — text always white */}
      <nav style={{ display:'flex', alignItems:'center', height:60, padding:'0 clamp(16px,4vw,60px)', background:'rgba(7,13,26,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, zIndex:100 }}>

        {/* Logo */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:19, fontWeight:900, letterSpacing:-0.5, color:'#fff', textDecoration:'none', flexShrink:0, marginRight:24 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <defs>
              <linearGradient id="navBg" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0E1628"/>
                <stop offset="100%" stopColor="#070D1A"/>
              </linearGradient>
              <linearGradient id="navLine" x1="2" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4F6FFA"/>
                <stop offset="100%" stopColor="#00D4A0"/>
              </linearGradient>
            </defs>
            <rect width="26" height="26" rx="5" fill="url(#navBg)"/>
            <polyline points="2,19 7,14 10,16 15,9 19,11 24,5" stroke="url(#navLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="5" r="1.5" fill="#00D4A0"/>
          </svg>
          SignalGenie
        </Link>

        {/* Nav links */}
        <div className="dash-topnav-links" style={{ gap:4 }}>
          {NAV_LINKS.map(l => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href}
                style={{ height:34, padding:'0 12px', borderRadius:8, fontSize:13, fontWeight: active ? 600 : 500,
                  color: active ? '#4F6FFA' : 'rgba(255,255,255,0.55)',
                  display:'flex', alignItems:'center',
                  background: active ? 'rgba(23,64,245,0.15)' : 'transparent',
                  textDecoration:'none', whiteSpace:'nowrap' }}>
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="dash-right" style={{ marginLeft:'auto' }}>
          <ThemeToggle style={{ background:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)' }} />
          <Link href="/auth" style={{ height:34, padding:'0 14px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.85)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', textDecoration:'none', whiteSpace:'nowrap' }}>
            Sign In
          </Link>
          <Link href="/auth" style={{ height:34, padding:'0 16px', borderRadius:8, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none', whiteSpace:'nowrap' }}>
            Start Free →
          </Link>
        </div>
      </nav>
    </>
  );
}
