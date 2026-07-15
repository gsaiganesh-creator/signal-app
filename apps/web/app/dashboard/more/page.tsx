'use client';
import Link from 'next/link';
import {
  Settings, TrendingUp, Briefcase, Users, HelpCircle,
  BookOpen, BarChart2, Leaf, Brain, DollarSign, ChevronRight,
  LogOut, Activity, Globe, Flame, Calendar, Banknote,
  FlaskConical, Shield, LineChart, Layers, Repeat2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const sections = [
  {
    heading: 'Markets',
    items: [
      { label: 'Sectors / Heatmap', href: '/dashboard/sectors',      icon: Layers,       accent: '#00D4A0' },
      { label: 'FII / DII',         href: '/dashboard/fii-dii',      icon: Activity,     accent: '#4F6FFA' },
      { label: 'Earnings',          href: '/dashboard/earnings',      icon: DollarSign,   accent: '#FFB800' },
      { label: 'Market Feed',       href: '/dashboard/feed',          icon: Globe,        accent: '#7A8BAA' },
      { label: 'Forex',             href: '/dashboard/forex',         icon: Repeat2,      accent: '#00D4A0' },
      { label: 'Commodities',       href: '/dashboard/commodities',   icon: Flame,        accent: '#FF5C1A' },
      { label: 'IPO Calendar',      href: '/dashboard/ipo',           icon: Calendar,     accent: '#8B5CF6' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { label: 'Watchlist',         href: '/dashboard/watchlist',     icon: BookOpen,     accent: '#4F6FFA' },
      { label: 'Algo Library',      href: '/dashboard/algorithms',    icon: Layers,       accent: '#00D4A0' },
      { label: 'Algo Builder',      href: '/dashboard/algo-builder',  icon: BarChart2,    accent: '#1740F5' },
      { label: 'Paper Trading',     href: '/dashboard/paper-trading', icon: FlaskConical, accent: '#8B5CF6' },
      { label: 'Backtest',          href: '/dashboard/backtest',      icon: LineChart,    accent: '#4F6FFA' },
      { label: 'Track Record',      href: '/dashboard/track-record',  icon: TrendingUp,   accent: '#00D4A0' },
      { label: 'AI Prompts',        href: '/dashboard/ai-prompts',    icon: Brain,        accent: '#8B5CF6' },
      { label: 'ETF & MF',          href: '/dashboard/etf-mf',        icon: Leaf,         accent: '#00D4A0' },
      { label: 'ESPP & RSU',        href: '/dashboard/equity-comp',   icon: Banknote,     accent: '#FFB800' },
      { label: 'Capital Gains',     href: '/dashboard/capital-gains', icon: DollarSign,   accent: '#FFB800' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Upgrade Plan',      href: '/dashboard/upgrade',           icon: TrendingUp,  accent: '#FFB800' },
      { label: 'Connected Brokers', href: '/dashboard/brokers',           icon: Briefcase,   accent: '#1740F5' },
      { label: 'Refer & Earn',      href: '/dashboard/refer',             icon: Users,       accent: '#FF5C1A' },
      { label: 'Support',           href: '/dashboard/support',           icon: HelpCircle,  accent: '#7A8BAA' },
      { label: 'Risk Disclosure',   href: '/dashboard/risk-disclosure',   icon: Shield,      accent: '#FF3B5C' },
      { label: 'Settings',          href: '/dashboard/settings',          icon: Settings,    accent: '#7A8BAA' },
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
            {section.items.map((item, i) => {
              const Icon = item.icon;
              return (
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
                    background: `${item.accent}22`,
                    flexShrink: 0,
                  }}>
                    <Icon size={18} color={item.accent} />
                  </div>
                  <span style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                  <ChevronRight size={16} color="#3A4E6A" />
                </Link>
              );
            })}
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
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
