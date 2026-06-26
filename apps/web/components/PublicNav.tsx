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
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
            <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
          </svg>
          SIGNAL
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
