import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { DashboardTopNav, DashboardSubNav } from '@/components/DashboardTopNav';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PortfolioProvider } from '@/lib/portfolio-context';
import { NavUserChip } from '@/components/NavUserChip';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

        {/* Top Nav */}
        <nav style={{ display:'flex', alignItems:'center', flexWrap:'nowrap', height:58, padding:'0 clamp(12px,3vw,32px)', background:'var(--surf)', borderBottom:'1px solid var(--bdr)', position:'sticky', top:0, zIndex:100, overflow:'visible' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontSize:18, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', marginRight:28, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
              <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
            </svg>
            SIGNAL
          </Link>

          <DashboardTopNav />
          {/* flex spacer — pushes right section to far end */}
          <div style={{ flex: 1 }} />

          <div className="dash-right" style={{ marginLeft: 0 }}>
            <div className="dash-port-switcher"><PortfolioSwitcher /></div>
            <ThemeToggle />
            <div className="dash-bell" style={{ width:34, height:34, borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', flexShrink:0 }}>
              <span style={{ fontSize:14 }}>🔔</span>
              <div style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--red)', border:'1.5px solid var(--surf)' }}/>
            </div>
            <span className="dash-pro-badge" style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:'rgba(255,92,26,0.12)', border:'1px solid rgba(255,92,26,0.25)', color:'var(--org)', flexShrink:0 }}>Pro</span>
            <NavUserChip />
          </div>
        </nav>

        {/* Sub-nav strip — below top nav, above page content */}
        <div style={{ borderBottom:'1px solid var(--bdr)', background:'var(--surf)', position:'sticky', top:58, zIndex:99 }}>
          <DashboardSubNav />
        </div>

        <div className="dash-layout">
          <main style={{ padding:'24px clamp(12px,3vw,32px)', overflowY:'auto', minWidth:0 }}>
            {children}
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </PortfolioProvider>
  );
}
