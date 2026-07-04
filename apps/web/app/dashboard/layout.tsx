export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DashboardTopNav, DashboardSubNav } from '@/components/DashboardTopNav';
import { DashboardNavProvider } from '@/components/DashboardNavContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PortfolioProvider } from '@/lib/portfolio-context';
import { NavUserChip } from '@/components/NavUserChip';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider><DashboardNavProvider>
      <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

        {/* Top Nav — 3-col grid: logo | tabs (centered) | controls */}
        <nav className="dash-topnav" style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:58, padding:'0 clamp(12px,3vw,32px)', background:'var(--card-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(79,111,250,0.22)', boxShadow:'0 4px 40px rgba(0,0,0,0.22),0 0 60px rgba(23,64,245,0.08)', position:'sticky', top:0, zIndex:100, overflow:'visible' }}>
          <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', flexShrink:0, justifySelf:'start' }}>
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
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

          {/* Center column — tabs */}
          <DashboardTopNav />

          <div className="dash-right" style={{ marginLeft: 0, justifySelf:'end' }}>
            <ThemeToggle />
            <div className="dash-bell" style={{ width:34, height:34, borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', flexShrink:0 }}>
              <span style={{ fontSize:14 }}>🔔</span>
              <div style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--red)', border:'1.5px solid var(--surf)' }}/>
            </div>
            <span className="dash-pro-badge" style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:'rgba(255,92,26,0.12)', border:'1px solid rgba(255,92,26,0.25)', color:'var(--org)', flexShrink:0 }}>Pro</span>
            <NavUserChip />
          </div>
        </nav>

        {/* Sub-nav strip — below top nav, above page content */}
        <div style={{ borderBottom:'1px solid var(--card-bdr)', background:'var(--card-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', position:'sticky', top:58, zIndex:99 }}>
          <DashboardSubNav />
        </div>

        <div className="dash-layout">
          <main style={{ padding:'24px clamp(12px,3vw,32px)', overflowY:'auto', minWidth:0 }}>
            {children}
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </DashboardNavProvider></PortfolioProvider>
  );
}
