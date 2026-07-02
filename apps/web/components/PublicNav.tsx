'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from './ThemeProvider';

const NAV_LINKS = [
  { href:'/#signals',     label:'Scanner'      },
  { href:'/#portfolio',   label:'Portfolio'    },
  { href:'/#algo',        label:'Algo Builder' },
  { href:'/#pricing',     label:'Pricing'      },
  { href:'/track-record', label:'Track Record' },
  { href:'/about',        label:'About'        },
];

export function PublicNav() {
  const path = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav style={{
      position:'sticky', top:0, zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 clamp(20px,5vw,80px)', height:60,
      background: isDark ? 'rgba(7,13,26,0.88)' : 'rgba(240,244,255,0.92)',
      backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
      borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(79,111,250,0.15)',
    }}>

      {/* Logo */}
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, fontSize:19, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', textDecoration:'none', flexShrink:0 }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
          <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="22" cy="4" r="3.6" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.7"/>
          <circle cx="22" cy="0.4" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <circle cx="25.1" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <circle cx="25.1" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <circle cx="22" cy="7.6" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <circle cx="18.9" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <circle cx="18.9" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
          <path d="M22 2.2 L22.45 3.55 L23.8 4 L22.45 4.45 L22 5.8 L21.55 4.45 L20.2 4 L21.55 3.55 Z" fill="#FF5C1A"/>
        </svg>
        SignalGenie
      </Link>

      {/* Nav links */}
      <div className="lp-nav-links">
        {NAV_LINKS.map(l => {
          const active = path === l.href || (l.href === '/about' && path === '/about');
          return (
            <a key={l.href} href={l.href}
              style={{ fontSize:13, fontWeight: active ? 600 : 500, color: active ? 'var(--blu)' : 'var(--dim)', textDecoration:'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--txt)')}
              onMouseLeave={e => (e.currentTarget.style.color = active ? 'var(--blu)' : 'var(--dim)')}>
              {l.label}
            </a>
          );
        })}
      </div>

      {/* Right actions */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <ThemeToggle />
        <Link href="/sign-in" style={{
          height:36, padding:'0 16px', borderRadius:9,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(23,64,245,0.06)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,64,245,0.2)',
          color:'var(--txt)', fontSize:13, fontWeight:600,
          display:'flex', alignItems:'center', textDecoration:'none',
        }}>Sign In</Link>
        <Link href="/sign-in" className="lp-cta-desktop" style={{
          height:36, padding:'0 18px', borderRadius:9,
          background:'var(--blu)', color:'#fff',
          fontSize:13, fontWeight:700,
          display:'flex', alignItems:'center', textDecoration:'none', whiteSpace:'nowrap',
        }}>Get Started Free →</Link>
      </div>
    </nav>
  );
}
