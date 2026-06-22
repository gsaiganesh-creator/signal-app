'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href:'/',              label:'Home'        },
  { href:'/track-record', label:'Track Record' },
  { href:'/about',        label:'About'        },
];

export function PublicNav() {
  const path = usePathname();

  return (
    <>
      {/* SEBI banner */}
      <div style={{ background:'rgba(255,184,0,0.07)', borderBottom:'1px solid rgba(255,184,0,0.18)', padding:'7px clamp(16px,5vw,80px)', textAlign:'center' }}>
        <span style={{ fontSize:11, color:'rgba(255,184,0,0.8)' }}>⚠️ <strong>NOT SEBI REGISTERED</strong> — All signals are for informational purposes only. Not financial advice. Trade at your own risk.</span>
      </div>

      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:60, padding:'0 clamp(16px,5vw,80px)', background:'rgba(7,13,26,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--bdr)', position:'sticky', top:0, zIndex:100 }}>

        {/* Logo */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:19, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', textDecoration:'none' }}>
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
            <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
          </svg>
          SIGNAL
        </Link>

        {/* Nav links */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {NAV_LINKS.map(l => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:13, fontWeight: active ? 600 : 500, color: active ? 'var(--bluL)' : 'var(--dim)', display:'flex', alignItems:'center', background: active ? 'rgba(23,64,245,0.1)' : 'transparent', textDecoration:'none' }}>
                {l.label}
              </Link>
            );
          })}
          <Link href="/#pricing" style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:13, fontWeight:500, color:'var(--dim)', display:'flex', alignItems:'center', textDecoration:'none' }}>
            Pricing
          </Link>
        </div>

        {/* Right actions */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ThemeToggle />
          <Link href="/auth" style={{ height:36, padding:'0 16px', borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', textDecoration:'none' }}>
            Sign In
          </Link>
          <Link href="/auth" style={{ height:36, padding:'0 18px', borderRadius:9, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none' }}>
            Start Free →
          </Link>
        </div>
      </nav>
    </>
  );
}
