export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DashboardTopNav, DashboardSubNav } from '@/components/DashboardTopNav';
import { DashboardNavProvider } from '@/components/DashboardNavContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { OnboardingTour } from '@/components/OnboardingTour';
import { PortfolioProvider } from '@/lib/portfolio-context';
import { NavUserChip } from '@/components/NavUserChip';
import { BiometricLockGate } from '@/components/BiometricLockGate';
import { BrandIcon } from '@/components/Brand';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BiometricLockGate>
      <PortfolioProvider><DashboardNavProvider>
        <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

          {/* Top Nav — 3-col grid: logo | tabs (centered) | controls */}
          <nav className="dash-topnav" style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:58, padding:'0 clamp(12px,3vw,32px)', background:'var(--card-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid var(--bdr)', position:'sticky', top:0, zIndex:100, overflow:'visible' }}>
            <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', flexShrink:0, justifySelf:'start' }}>
              <BrandIcon size={22} />
              SignalGenie
            </Link>

            {/* Center column — tabs */}
            <DashboardTopNav />

            <div className="dash-right" style={{ marginLeft: 0, justifySelf:'end' }}>
              <div className="dash-theme-wrap"><ThemeToggle /></div>
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
          <OnboardingTour />
        </div>
      </DashboardNavProvider></PortfolioProvider>
    </BiometricLockGate>
  );
}
