import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { DashboardTopNav, DashboardSubNav } from '@/components/DashboardTopNav';
import { DashboardNavProvider } from '@/components/DashboardNavContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PortfolioProvider } from '@/lib/portfolio-context';
import { NavUserChip } from '@/components/NavUserChip';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider><DashboardNavProvider>
      <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

        {/* Top Nav — 3-col grid: logo | tabs (centered) | controls */}
        <nav style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:58, padding:'0 clamp(12px,3vw,32px)', background:'linear-gradient(145deg,rgba(10,18,36,0.88),rgba(6,11,24,0.85))', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, zIndex:100, overflow:'visible' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontSize:18, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', flexShrink:0, justifySelf:'start' }}>
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
              <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
            </svg>
            SIGNAL
          </Link>

          {/* Center column — tabs */}
          <DashboardTopNav />

          <div className="dash-right" style={{ marginLeft: 0, justifySelf:'end' }}>
            <ThemeToggle />
            <div className="dash-bell" style={{ width:34, height:34, borderRadius:9, background:'transparent', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', flexShrink:0 }}>
              <span style={{ fontSize:14 }}>🔔</span>
              <div style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--red)', border:'1.5px solid var(--surf)' }}/>
            </div>
            <span className="dash-pro-badge" style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:'rgba(255,92,26,0.12)', border:'1px solid rgba(255,92,26,0.25)', color:'var(--org)', flexShrink:0 }}>Pro</span>
            <NavUserChip />
          </div>
        </nav>

        {/* Sub-nav strip — below top nav, above page content */}
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', background:'linear-gradient(145deg,rgba(10,18,36,0.86),rgba(6,11,24,0.82))', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', position:'sticky', top:58, zIndex:99 }}>
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
