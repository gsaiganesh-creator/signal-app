'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TABS, useNavCtx } from '@/components/DashboardNavContext';
import { useIsNativePlatform } from '@/lib/use-is-native';

export function DashboardTopNav() {
  const { activeTab, setActiveTab } = useNavCtx();
  const router = useRouter();
  return (
    <div className="dash-top-tabs">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); router.push(tab.links[0].href); }}
            style={{
              height: 58, padding: '0 14px',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--blu)' : '2px solid transparent',
              color: isActive ? 'var(--txt)' : 'var(--nav-inactive)',
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

const TOUR_KEY_BY_HREF: Record<string, string> = {
  '/dashboard':           'nav-home',
  '/dashboard/signals':   'nav-signals',
  '/dashboard/portfolio': 'nav-portfolio',
};

export function DashboardSubNav() {
  const { activeTab } = useNavCtx();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const full = search ? `${pathname}?${search}` : pathname;
  const tab = TABS.find(t => t.key === activeTab)!;
  const isNative = useIsNativePlatform();
  // App Store guidelines disallow surfacing an in-app purchase/upgrade CTA
  // inside the native shell — hide the Upgrade sub-nav link there.
  const links = tab.links.filter(l => !(isNative && l.href === '/dashboard/upgrade'));

  return (
    <div className="dash-subnav">
      {links.map(link => {
        const active = link.href.includes('?')
          ? link.href === full
          : pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            data-tour={TOUR_KEY_BY_HREF[link.href]}
            style={{
              padding: '0 14px', height: 38,
              display: 'flex', alignItems: 'center',
              fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? 'var(--bluL)' : 'var(--nav-inactive)',
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
