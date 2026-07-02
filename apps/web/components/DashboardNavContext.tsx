'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export const TABS = [
  {
    key: 'home', label: 'Home',
    links: [
      { href: '/dashboard',           label: 'Dashboard' },
      { href: '/dashboard/signals',   label: 'Signals'   },
      { href: '/dashboard/portfolio', label: 'Portfolio' },
      { href: '/dashboard/etf-mf',    label: 'ETF & MF'  },
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
      { href: '/dashboard/sectors',                 label: 'Heatmap'      },
      { href: '/dashboard/fii-dii',                 label: 'FII / DII'    },
      { href: '/dashboard/signals?tab=fundamental', label: 'Fundamentals' },
      { href: '/dashboard/dividends',               label: 'Dividends'    },
      { href: '/dashboard/earnings',                label: 'Earnings'     },
      { href: '/dashboard/feed',                    label: 'Market Feed'  },
      { href: '/dashboard/forex',                   label: 'Forex'        },
      { href: '/dashboard/commodities',             label: 'Commodities'  },
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

export function resolveTab(pathname: string): string {
  // us-portfolio is part of Portfolio (home tab)
  if (pathname.startsWith('/dashboard/us-portfolio')) return 'home';
  for (const tab of TABS) {
    if (tab.links.some(l => pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href)))) {
      return tab.key;
    }
  }
  return 'home';
}

interface NavCtx { activeTab: string; setActiveTab: (t: string) => void; }
const Ctx = createContext<NavCtx>({ activeTab: 'home', setActiveTab: () => {} });
export const useNavCtx = () => useContext(Ctx);

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => resolveTab(pathname));
  // sync on route change (navigating via Link)
  useEffect(() => { setActiveTab(resolveTab(pathname)); }, [pathname]);
  return <Ctx.Provider value={{ activeTab, setActiveTab }}>{children}</Ctx.Provider>;
}
