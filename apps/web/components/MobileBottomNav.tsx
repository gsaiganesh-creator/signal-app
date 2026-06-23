'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href:'/dashboard',               icon:'📊', label:'Home'     },
  { href:'/dashboard/signals',       icon:'📈', label:'Signals'  },
  { href:'/dashboard/portfolio',     icon:'💼', label:'Portfolio'},
  { href:'/dashboard/paper-trading', icon:'🧪', label:'Paper'    },
  { href:'/dashboard/sectors',       icon:'🔥', label:'Sectors'  },
];

export function MobileBottomNav() {
  const path = usePathname();
  return (
    <nav className="dash-mobile-nav">
      {TABS.map(t => {
        const active = path === t.href || (t.href !== '/dashboard' && path.startsWith(t.href));
        return (
          <Link key={t.href} href={t.href} className={active ? 'active' : ''}>
            <span className="icon">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
