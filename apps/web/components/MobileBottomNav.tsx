'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

// 4 primary tabs — mirrors sidebar tab structure
const PRIMARY_TABS = [
  { key: 'home',    href: '/dashboard',              icon: '🏠', label: 'Home'    },
  { key: 'signals', href: '/dashboard/signals',      icon: '📈', label: 'Signals' },
  { key: 'india',   href: '/dashboard/portfolio',    icon: '💼', label: 'India'   },
  { key: 'us',      href: '/dashboard/us-portfolio', icon: '🇺🇸', label: 'US'      },
];

// More drawer grouped by category
const MORE_SECTIONS = [
  {
    label: 'Markets',
    links: [
      { href: '/dashboard/sectors',     icon: '🔥', label: 'Sector Heatmap' },
      { href: '/dashboard/fii-dii',     icon: '🌍', label: 'FII / DII'      },
      { href: '/dashboard/forex',       icon: '💱', label: 'Forex'          },
      { href: '/dashboard/commodities', icon: '🥇', label: 'Commodities'    },
      { href: '/dashboard/earnings',    icon: '📅', label: 'Earnings'       },
      { href: '/dashboard/equity-comp',   icon: '📊', label: 'ESPP & RSU'    },
      { href: '/dashboard/etf-mf',       icon: '🏦', label: 'ETF & MF'      },
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
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/dashboard/upgrade', icon: '⚡', label: 'Upgrade Plan' },
      { href: '/dashboard/refer',   icon: '🎁', label: 'Refer & Earn' },
      { href: '/sign-out',          icon: '🚪', label: 'Sign Out'     },
    ],
  },
];

export function MobileBottomNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const allMoreLinks = MORE_SECTIONS.flatMap(s => s.links);
  const isMoreActive = allMoreLinks.some(l => path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href)));

  return (
    <>
      <nav className="dash-mobile-nav">
        {PRIMARY_TABS.map(t => {
          const active = path === t.href || (t.href !== '/dashboard' && path.startsWith(t.href));
          return (
            <Link key={t.href} href={t.href} className={active ? 'active' : ''} onClick={() => setMoreOpen(false)}>
              <span className="icon">{t.icon}</span>
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
          <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 190 }} />
          <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 195, background: 'linear-gradient(180deg,rgba(10,18,36,0.95),rgba(6,11,24,0.98))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px 16px 0 0', padding: '4px 0 4px', maxHeight: '75vh', overflowY: 'auto' }}>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(28,46,74,0.4)', color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dim)', background: 'var(--surf2)', borderRadius: 10, padding: '2px 8px' }}>
                {theme === 'dark' ? 'DARK' : 'LIGHT'}
              </span>
            </button>

            {/* Grouped sections */}
            {MORE_SECTIONS.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', padding: '10px 16px 4px' }}>
                  {section.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {section.links.map(l => {
                    const active = path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href));
                    const isDanger = l.href === '/sign-out';
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setMoreOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, fontWeight: 600, color: isDanger ? 'var(--red)' : active ? 'var(--bluL)' : 'var(--txt)', borderBottom: '1px solid rgba(28,46,74,0.3)', background: active ? 'rgba(79,111,250,0.06)' : 'transparent', textDecoration: 'none' }}>
                        <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{l.icon}</span>
                        {l.label}
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
