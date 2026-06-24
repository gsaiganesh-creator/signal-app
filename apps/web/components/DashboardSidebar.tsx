'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink { href: string; icon: string; label: string; badge?: string; danger?: boolean; }
interface NavSection { section: string; links: NavLink[]; }

const SIDEBAR: NavSection[] = [
  { section:'Main', links:[
    { href:'/dashboard',                  icon:'📊', label:'Dashboard'        },
    { href:'/dashboard/signals',          icon:'📈', label:'Live Signals' },
    { href:'/dashboard/portfolio',        icon:'💼', label:'My Portfolio'     },
    { href:'/dashboard/us-portfolio',     icon:'🇺🇸', label:'US Portfolio'     },
    { href:'/dashboard/etf-mf',           icon:'🏦', label:'ETF & MF'        },
  ]},
  { section:'Tools', links:[
    { href:'/dashboard/algo-builder',     icon:'⚙️', label:'Algo Builder'    },
    { href:'/dashboard/paper-trading',    icon:'🧪', label:'Paper Trading'   },
    { href:'/dashboard/backtest',         icon:'📋', label:'Backtest'        },
  ]},
  { section:'Markets', links:[
    { href:'/dashboard/sectors',          icon:'🔥', label:'Sector Heatmap'  },
    { href:'/dashboard/fii-dii',          icon:'🌍', label:'FII / DII Flow'  },
    { href:'/dashboard/forex',            icon:'💱', label:'Forex'           },
    { href:'/dashboard/commodities',      icon:'🥇', label:'Commodities'     },
    { href:'/dashboard/feed',             icon:'𝕏',  label:'Twitter Feed'    },
    { href:'/dashboard/earnings',         icon:'📅', label:'Earnings'        },
  ]},
  { section:'Account', links:[
    { href:'/dashboard/upgrade',          icon:'⚡', label:'Upgrade Plan'    },
    { href:'/dashboard/brokers',          icon:'🔗', label:'Connect Broker'  },
    { href:'/dashboard/refer',            icon:'🎁', label:'Refer & Earn'    },
    { href:'/sign-out',                   icon:'🚪', label:'Sign Out',       danger:true },
  ]},
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dash-sidebar" style={{ background:'var(--surf)', borderRight:'1px solid var(--bdr)', padding:'16px 10px' }}>
      {SIDEBAR.map(group => (
        <div key={group.section}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim2)', letterSpacing:1, textTransform:'uppercase', padding:'12px 10px 6px' }}>{group.section}</div>
          {group.links.map((link: NavLink) => {
            const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            const color = link.danger ? 'var(--red)' : active ? 'var(--bluL)' : 'var(--dim)';
            const bg    = link.danger ? 'transparent' : active ? 'rgba(23,64,245,0.1)' : 'transparent';
            return (
              <Link key={link.label} href={link.href}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:9, fontSize:13, fontWeight: active ? 600 : 500, color, background: bg }}>
                <span style={{ width:16, textAlign:'center', fontSize:14 }}>{link.icon}</span>
                {link.label}
                {link.badge && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'var(--red)', color:'#fff' }}>{link.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
