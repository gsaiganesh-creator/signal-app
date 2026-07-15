'use client';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/sign-in');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #070D1A)', padding: '24px 16px 40px' }}>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>More</h1>

      {sections.map(section => (
        <div key={section.heading} style={{ marginBottom: 28 }}>
          <p style={{ color: '#7A8BAA', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {section.heading}
          </p>
          <div style={{ background: '#0E1628', borderRadius: 12, overflow: 'hidden', border: '1px solid #1C2E4A' }}>
            {section.items.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < section.items.length - 1 ? '1px solid #1C2E4A' : 'none',
                  textDecoration: 'none',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(23,64,245,0.1)', flexShrink: 0, fontSize: 18,
                }}>
                  {item.icon}
                </div>
                <span style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: '#3A4E6A', fontSize: 16 }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSignOut}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12,
          background: '#FF3B5C18', border: '1px solid #FF3B5C44',
          color: '#FF3B5C', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
        }}
      >
        🚪 Sign Out
      </button>
    </div>
  );
}
