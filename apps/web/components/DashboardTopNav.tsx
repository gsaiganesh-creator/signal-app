'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS, useNavCtx } from '@/components/DashboardNavContext';

export function DashboardTopNav() {
  const { activeTab, setActiveTab } = useNavCtx();
  return (
    <div className="dash-top-tabs">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              height: 58, padding: '0 14px',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--blu)' : '2px solid transparent',
              color: isActive ? 'var(--txt)' : 'rgba(255,255,255,0.62)',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardSubNav() {
  const { activeTab } = useNavCtx();
  const pathname = usePathname();
  const tab = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="dash-subnav">
      {tab.links.map(link => {
        const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: '0 14px', height: 38,
              display: 'flex', alignItems: 'center',
              fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? 'var(--bluL)' : 'rgba(255,255,255,0.58)',
              background: active ? 'rgba(23,64,245,0.08)' : 'transparent',
              borderRadius: 7, textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 0.12s, background 0.12s',
            }}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
