'use client';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SECTION_TINT } from '@/components/MobileBottomNav';
import { useIsNativePlatform } from '@/lib/use-is-native';

const sections = [
  {
    heading: 'Markets',
    items: [
      { label: 'Sectors / Heatmap', href: '/dashboard/sectors',      icon: '🔥' },
      { label: 'FII / DII',         href: '/dashboard/fii-dii',      icon: '🌍' },
      { label: 'Earnings',          href: '/dashboard/earnings',      icon: '📅' },
      { label: 'Market Feed',       href: '/dashboard/feed',          icon: '📰' },
      { label: 'Forex',             href: '/dashboard/forex',         icon: '💱' },
      { label: 'Commodities',       href: '/dashboard/commodities',   icon: '🥇' },
      { label: 'IPO Calendar',      href: '/dashboard/ipo',           icon: '🚀' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { label: 'Watchlist',         href: '/dashboard/watchlist',     icon: '👁' },
      { label: 'Algo Library',      href: '/dashboard/algorithms',    icon: '🤖' },
      { label: 'Algo Builder',      href: '/dashboard/algo-builder',  icon: '⚙️' },
      { label: 'Paper Trading',     href: '/dashboard/paper-trading', icon: '🧪' },
      { label: 'Backtest',          href: '/dashboard/backtest',      icon: '📋' },
      { label: 'Track Record',      href: '/dashboard/track-record',  icon: '🏆' },
      { label: 'AI Prompts',        href: '/dashboard/ai-prompts',    icon: '💬' },
      { label: 'ETF & MF',          href: '/dashboard/etf-mf',        icon: '🏦' },
      { label: 'ESPP & RSU',        href: '/dashboard/equity-comp',   icon: '📊' },
      { label: 'Capital Gains',     href: '/dashboard/capital-gains', icon: '🧾' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Upgrade Plan',      href: '/dashboard/upgrade',           icon: '⚡' },
      { label: 'Connected Brokers', href: '/dashboard/brokers',           icon: '🔗' },
      { label: 'Refer & Earn',      href: '/dashboard/refer',             icon: '🎁' },
      { label: 'Support',           href: '/dashboard/support',           icon: '🛟' },
      { label: 'Risk Disclosure',   href: '/dashboard/risk-disclosure',   icon: '⚠️' },
      { label: 'Settings',          href: '/dashboard/settings',          icon: '⚙️' },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();
  const supabase = createClient();
  const isNative = useIsNativePlatform();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/sign-in');
  }

  // Guideline 3.1.1 — /dashboard/upgrade itself is gated for native (see that
  // page), but no point linking to a page that just tells you to use the web.
  const visibleSections = sections.map(s => ({
    ...s,
    items: s.items.filter(i => !(isNative && i.href === '/dashboard/upgrade')),
  }));

  return (
    <>
      {/* Page header — matches every other dashboard page (e.g. Connect Broker) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>More</div>
        <div style={{ fontSize: 13, color: 'var(--dim)' }}>Every SignalGenie tool and screen in one place</div>
      </div>

      {visibleSections.map(section => {
        const t = SECTION_TINT[section.heading] ?? SECTION_TINT.Markets;
        return (
          <div key={section.heading} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              {section.heading}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 13px', fontSize: 13, fontWeight: 700,
                    background: t.grad, border: `1px solid ${t.bdr}`, borderRadius: 12,
                    color: 'var(--txt)', textDecoration: 'none',
                  }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSignOut}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, marginTop: 4,
          background: SECTION_TINT.Admin.grad, border: `1px solid ${SECTION_TINT.Admin.bdr}`,
          color: 'var(--red)', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        🚪 Sign Out
      </button>
    </>
  );
}
