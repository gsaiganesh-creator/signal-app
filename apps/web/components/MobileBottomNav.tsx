'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { usePlan } from '@/lib/use-plan';

// 4 primary tabs — mirrors sidebar tab structure
const PRIMARY_TABS = [
  { key: 'home',      href: '/dashboard',           icon: '🏠', label: 'Home',      aliases: [] },
  { key: 'signals',   href: '/dashboard/signals',   icon: '__logo__', label: 'Signals',   aliases: [] },
  { key: 'portfolio', href: '/dashboard/portfolio', icon: '💼', label: 'Portfolio', aliases: ['/dashboard/us-portfolio'] },
  { key: 'dividends', href: '/dashboard/dividends', icon: '💰', label: 'Dividends', aliases: [] },
];

// More drawer grouped by category
const MORE_SECTIONS = [
  {
    label: 'Markets',
    links: [
      { href: '/dashboard/watchlist',    icon: '👁', label: 'Watchlist'      },
      { href: '/dashboard/us-signals',  icon: '🇺🇸', label: 'US Signals'     },
      { href: '/stocks/compare',        icon: '⚖️', label: 'Compare'        },
      { href: '/dashboard/sectors',     icon: '🔥', label: 'Sector Heatmap' },
      { href: '/dashboard/fii-dii',     icon: '🌍', label: 'FII / DII'      },
      { href: '/dashboard/forex',       icon: '💱', label: 'Forex'          },
      { href: '/dashboard/commodities', icon: '🥇', label: 'Commodities'    },
      { href: '/dashboard/earnings',      icon: '📅', label: 'Earnings'       },
      { href: '/dashboard/ipo',           icon: '🚀', label: 'IPO Calendar'   },
      { href: '/dashboard/capital-gains', icon: '🧾', label: 'Capital Gains'  },
      { href: '/dashboard/dividends',     icon: '💰', label: 'Dividends'      },
      { href: '/dashboard/equity-comp',   icon: '📊', label: 'ESPP & RSU'    },
      { href: '/dashboard/etf-mf',        icon: '🏦', label: 'ETF & MF'      },
    ],
  },
  {
    label: 'Tools',
    links: [
      { href: '/dashboard/algorithms',    icon: '🤖', label: 'Algo Library'  },
      { href: '/dashboard/ai-prompts',    icon: '💬', label: 'AI Prompts'    },
      { href: '/dashboard/paper-trading', icon: '🧪', label: 'Paper Trading' },
      { href: '/dashboard/algo-builder',  icon: '⚙️', label: 'Algo Builder'  },
      { href: '/dashboard/backtest',      icon: '📋', label: 'Backtest'      },
      { href: '/dashboard/track-record',  icon: '🏆', label: 'Track Record'  },
      { href: '/dashboard/feed',          icon: '📰', label: 'Market Feed'   },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/dashboard/upgrade', icon: '⚡', label: 'Upgrade Plan'   },
      { href: '/dashboard/brokers', icon: '🔗', label: 'Connect Broker' },
      { href: '/dashboard/refer',   icon: '🎁', label: 'Refer & Earn'   },
      { href: '/dashboard/support',         icon: '🛟', label: 'Support'        },
      { href: '/dashboard/risk-disclosure', icon: '⚠️', label: 'Risk Disclosure' },
      { href: '/sign-out',          icon: '🚪', label: 'Sign Out'       },
    ],
  },
  {
    label: 'Admin',
    links: [
      { href: '/admin', icon: '🛡️', label: 'Admin Console' },
    ],
  },
];

export function MobileBottomNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { isAdmin } = usePlan();

  const allMoreLinks = MORE_SECTIONS.flatMap(s => s.links);
  const isMoreActive = allMoreLinks.some(l => path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href)));

  return (
    <>
      <nav className="dash-mobile-nav">
        {PRIMARY_TABS.map(t => {
          const active = path === t.href || (t.href !== '/dashboard' && path.startsWith(t.href)) || t.aliases.some(a => path.startsWith(a));
          return (
            <Link key={t.href} href={t.href} className={active ? 'active' : ''} onClick={() => setMoreOpen(false)} data-tour={`nav-${t.key}`}>
              <span className="icon">
                {t.icon === '__logo__' ? (
                  <svg width="20" height="20" viewBox="0 0 26 26" fill="none" style={{ display:'block' }}>
                    <rect width="26" height="26" rx="7" fill={active ? 'rgba(79,111,250,0.25)' : 'rgba(79,111,250,0.1)'}/>
                    <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke={active ? '#4F6FFA' : '#7A8BAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="22" cy="4" r="3.6" stroke={active ? '#8B5CF6' : '#7A8BAA'} strokeWidth="0.6" opacity="0.7"/>
                    <path d="M22 2.2 L22.45 3.55 L23.8 4 L22.45 4.45 L22 5.8 L21.55 4.45 L20.2 4 L21.55 3.55 Z" fill={active ? '#FF5C1A' : '#7A8BAA'}/>
                  </svg>
                ) : t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}

        {/* More */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={isMoreActive || moreOpen ? 'active' : ''}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: (isMoreActive || moreOpen) ? 'var(--bluL)' : 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
          More
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, background: theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)', zIndex: 190 }} />
          <div style={{
            position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 195,
            background: theme === 'dark'
              ? 'linear-gradient(180deg,rgba(17,36,80,0.96),rgba(8,14,42,0.98))'
              : 'var(--surf)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            borderTop: `1px solid ${theme === 'dark' ? 'rgba(79,111,250,0.25)' : 'var(--bdr)'}`,
            borderRadius: '16px 16px 0 0', padding: '4px 0 4px', maxHeight: '75vh', overflowY: 'auto',
            boxShadow: theme === 'dark' ? 'none' : '0 -4px 24px rgba(0,0,0,0.12)',
          }}>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, width: '100%', background: 'none', border: 'none', borderBottom: `1px solid var(--bdr)`, color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dim)', background: 'var(--surf2)', borderRadius: 10, padding: '2px 8px' }}>
                {theme === 'dark' ? 'DARK' : 'LIGHT'}
              </span>
            </button>

            {/* Grouped sections */}
            {MORE_SECTIONS.filter(s => s.label !== 'Admin' || isAdmin).map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', padding: '10px 16px 4px' }}>
                  {section.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {section.links.map(l => {
                    const active = path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href));
                    const isDanger = l.href === '/sign-out';
                    const linkStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, fontWeight: 600, color: isDanger ? 'var(--red)' : active ? 'var(--bluL)' : 'var(--txt)', borderBottom: `1px solid var(--bdr)`, background: active ? 'rgba(79,111,250,0.08)' : 'transparent', textDecoration: 'none' } as const;
                    const content = (
                      <>
                        <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{l.icon}</span>
                        {l.label}
                      </>
                    );
                    // Sign Out must hard-navigate — it's a Route Handler, not a page, and a
                    // client-side soft-nav here leaves the browser's own Supabase client
                    // unaware the session ended, which looks like "sign out doesn't work."
                    if (isDanger) {
                      return <a key={l.href} href={l.href} onClick={() => setMoreOpen(false)} style={linkStyle}>{content}</a>;
                    }
                    return (
                      <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)} style={linkStyle}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
