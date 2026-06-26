'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavLink { href: string; icon: string; label: string; badge?: string; danger?: boolean; }

const TABS: { key: string; icon: string; label: string; links: NavLink[] }[] = [
  {
    key: 'home', icon: '📊', label: 'Home',
    links: [
      { href: '/dashboard',               icon: '🏠', label: 'Dashboard'       },
      { href: '/dashboard/signals',       icon: '📈', label: 'Live Signals'    },
      { href: '/dashboard/portfolio',     icon: '💼', label: 'Indian Portfolio'    },
      { href: '/dashboard/us-portfolio',  icon: '🇺🇸', label: 'US Portfolio'   },
      { href: '/dashboard/equity-comp',   icon: '📊', label: 'ESPP & RSU', badge: 'NEW' },
      { href: '/dashboard/etf-mf',        icon: '🏦', label: 'ETF & MF'       },
    ],
  },
  {
    key: 'tools', icon: '⚙️', label: 'Tools',
    links: [
      { href: '/dashboard/track-record',  icon: '🏆', label: 'Track Record'   },
      { href: '/dashboard/algo-builder',  icon: '⚙️', label: 'Algo Builder'   },
      { href: '/dashboard/algorithms',    icon: '🤖', label: 'Algo Library', badge: 'NEW' },
      { href: '/dashboard/ai-prompts',    icon: '💬', label: 'AI Prompts'     },
      { href: '/dashboard/paper-trading', icon: '🧪', label: 'Paper Trading'  },
      { href: '/dashboard/backtest',      icon: '📋', label: 'Backtest'       },
    ],
  },
  {
    key: 'markets', icon: '🌍', label: 'Markets',
    links: [
      { href: '/dashboard/sectors',       icon: '🔥', label: 'Sector Heatmap' },
      { href: '/dashboard/fii-dii',       icon: '🌍', label: 'FII / DII'      },
      { href: '/dashboard/forex',         icon: '💱', label: 'Forex'          },
      { href: '/dashboard/commodities',   icon: '🥇', label: 'Commodities'    },
      { href: '/dashboard/earnings',      icon: '📅', label: 'Earnings'       },
    ],
  },
  {
    key: 'account', icon: '👤', label: 'Account',
    links: [
      { href: '/dashboard/upgrade',       icon: '⚡', label: 'Upgrade Plan'   },
      { href: '/dashboard/brokers',       icon: '🔗', label: 'Connect Broker' },
      { href: '/dashboard/refer',         icon: '🎁', label: 'Refer & Earn'   },
      { href: '/sign-out',                icon: '🚪', label: 'Sign Out', danger: true },
    ],
  },
];

function resolveTab(pathname: string): string {
  for (const tab of TABS) {
    if (tab.links.some(l => pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href)))) {
      return tab.key;
    }
  }
  return 'home';
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => resolveTab(pathname));

  // Sync tab when navigating
  useEffect(() => { setActiveTab(resolveTab(pathname)); }, [pathname]);

  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <aside className="dash-sidebar" style={{ background: 'linear-gradient(180deg,rgba(17,36,80,0.70),rgba(8,14,42,0.80))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '1px solid rgba(79,111,250,0.20)', display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>

      {/* Tab strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '8px 6px 0' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 4px 10px',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: isActive ? '2px solid var(--blu)' : '2px solid transparent',
                marginBottom: -1,
                color: isActive ? 'var(--bluL)' : 'var(--dim)',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.2, textTransform: 'uppercase' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Links for active tab */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {currentTab.links.map(link => {
          const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          const color  = link.danger ? 'var(--red)' : active ? 'var(--bluL)' : 'var(--dim)';
          const bg     = link.danger ? 'transparent' : active ? 'rgba(23,64,245,0.1)' : 'transparent';
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 9,
                fontSize: 13, fontWeight: active ? 600 : 500,
                color, background: bg, textDecoration: 'none',
              }}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{link.icon}</span>
              {link.label}
              {link.badge && (
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'var(--red)', color: '#fff' }}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Upgrade nudge — only when not in account tab */}
      {activeTab !== 'account' && (
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/dashboard/upgrade" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(255,184,0,0.12),rgba(255,92,26,0.08))',
            border: '1px solid rgba(255,184,0,0.25)',
            color: '#FFB800', fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}>
            <span style={{ fontSize: 15 }}>⚡</span>
            Upgrade to Pro
          </Link>
        </div>
      )}
    </aside>
  );
}
