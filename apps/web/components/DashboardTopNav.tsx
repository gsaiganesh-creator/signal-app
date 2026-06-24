'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const TABS = [
  {
    key: 'home', label: 'Home',
    links: [
      { href: '/dashboard',              label: 'Dashboard'   },
      { href: '/dashboard/signals',      label: 'Signals'     },
      { href: '/dashboard/portfolio',    label: 'Portfolio'   },
      { href: '/dashboard/us-portfolio', label: 'US Stocks'   },
      { href: '/dashboard/etf-mf',       label: 'ETF & MF'   },
    ],
  },
  {
    key: 'tools', label: 'Tools',
    links: [
      { href: '/dashboard/algorithms',    label: 'Algo Library'  },
      { href: '/dashboard/ai-prompts',    label: 'AI Prompts'    },
      { href: '/dashboard/algo-builder',  label: 'Algo Builder'  },
      { href: '/dashboard/paper-trading', label: 'Paper Trading' },
      { href: '/dashboard/backtest',      label: 'Backtest'      },
      { href: '/dashboard/track-record',  label: 'Track Record'  },
    ],
  },
  {
    key: 'markets', label: 'Markets',
    links: [
      { href: '/dashboard/sectors',     label: 'Heatmap'     },
      { href: '/dashboard/fii-dii',     label: 'FII / DII'   },
      { href: '/dashboard/forex',       label: 'Forex'       },
      { href: '/dashboard/commodities', label: 'Commodities' },
      { href: '/dashboard/earnings',    label: 'Earnings'    },
    ],
  },
  {
    key: 'account', label: 'Account',
    links: [
      { href: '/dashboard/upgrade', label: 'Upgrade'      },
      { href: '/dashboard/brokers', label: 'Broker'       },
      { href: '/dashboard/refer',   label: 'Refer & Earn' },
      { href: '/sign-out',          label: 'Sign Out'     },
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

export function DashboardTopNav() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => resolveTab(pathname));

  useEffect(() => { setActiveTab(resolveTab(pathname)); }, [pathname]);

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
              color: isActive ? 'var(--txt)' : 'var(--dim)',
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
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => resolveTab(pathname));

  useEffect(() => { setActiveTab(resolveTab(pathname)); }, [pathname]);

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
              color: active ? 'var(--bluL)' : 'var(--dim)',
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
