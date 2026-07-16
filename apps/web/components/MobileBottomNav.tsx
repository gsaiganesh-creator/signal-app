'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { usePlan } from '@/lib/use-plan';
import { useIsNativePlatform } from '@/lib/use-is-native';

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

// Per-section tint — mirrors the color-coded gradient cards used across the dashboard (kpi-card pattern).
// Exported so app/dashboard/more/page.tsx (the native tab bar's full-page More hub) uses the same palette.
export const SECTION_TINT: Record<string, { grad: string; bdr: string; color: string; iconBg: string }> = {
  Markets: { grad: 'linear-gradient(135deg,rgba(79,111,250,0.14),rgba(79,111,250,0.04))', bdr: 'rgba(79,111,250,0.28)', color: 'var(--bluL)', iconBg: 'rgba(79,111,250,0.18)' },
  Tools:   { grad: 'linear-gradient(135deg,rgba(139,92,246,0.14),rgba(139,92,246,0.04))', bdr: 'rgba(139,92,246,0.3)',  color: 'var(--pur)',  iconBg: 'rgba(139,92,246,0.18)' },
  Account: { grad: 'linear-gradient(135deg,rgba(0,212,160,0.12),rgba(0,212,160,0.03))',   bdr: 'rgba(0,212,160,0.28)', color: 'var(--grn)',  iconBg: 'rgba(0,212,160,0.18)' },
  Admin:   { grad: 'linear-gradient(135deg,rgba(255,59,92,0.14),rgba(255,59,92,0.04))',   bdr: 'rgba(255,59,92,0.3)',  color: 'var(--red)',  iconBg: 'rgba(255,59,92,0.18)' },
};

export function MobileBottomNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { isAdmin } = usePlan();
  const isNative = useIsNativePlatform();

  // The native iOS/Android app shell has its own UITabBar-style chrome
  // (Tasks 4 and 8) — this web bottom nav must render nothing there.
  if (isNative) return null;

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
          <span style={{ fontSize: 18, lineHeight: 1, width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (isMoreActive || moreOpen) ? 'rgba(79,111,250,0.18)' : 'transparent', transition: 'background 0.15s' }}>☰</span>
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
            borderRadius: '20px 20px 0 0', padding: '14px 14px 4px', maxHeight: '75vh', overflowY: 'auto',
            boxShadow: theme === 'dark' ? 'none' : '0 -4px 24px rgba(0,0,0,0.12)',
          }}>

            {/* Theme toggle — same bento card language as the rest of the sheet */}
            <button
              onClick={toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontSize: 13, fontWeight: 700, width: '100%', marginBottom: 14,
                background: 'linear-gradient(135deg,rgba(255,184,0,0.14),rgba(255,184,0,0.04))', border: '1px solid rgba(255,184,0,0.28)', borderRadius: 14,
                color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 15, width: 26, height: 26, borderRadius: 7, background: 'rgba(255,184,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--ylw)', background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 10, padding: '3px 9px' }}>
                {theme === 'dark' ? 'DARK' : 'LIGHT'}
              </span>
            </button>

            {/* Grouped sections — bento card grid, tinted per section like the dashboard KPI cards */}
            {MORE_SECTIONS.filter(s => s.label !== 'Admin' || isAdmin).map(section => {
              const tint = SECTION_TINT[section.label] ?? SECTION_TINT.Markets;
              return (
                <div key={section.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', padding: '0 2px 8px' }}>
                    {section.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {section.links.map(l => {
                      const active = path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href));
                      const isDanger = l.href === '/sign-out';
                      const t = isDanger ? SECTION_TINT.Admin : tint;
                      const cardStyle = {
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 12, fontWeight: 700,
                        color: isDanger ? 'var(--red)' : active ? t.color : 'var(--txt)',
                        background: t.grad, border: `1px solid ${t.bdr}`,
                        outline: active ? `1px solid ${t.color}` : 'none', outlineOffset: -1,
                        borderRadius: 12, textDecoration: 'none',
                      } as const;
                      const content = (
                        <>
                          <span style={{ fontSize: 14, width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span>
                        </>
                      );
                      // Sign Out must hard-navigate — it's a Route Handler, not a page, and a
                      // client-side soft-nav here leaves the browser's own Supabase client
                      // unaware the session ended, which looks like "sign out doesn't work."
                      if (isDanger) {
                        return <a key={l.href} href={l.href} onClick={() => setMoreOpen(false)} style={cardStyle}>{content}</a>;
                      }
                      return (
                        <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)} style={cardStyle}>
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
