'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIDEBAR = [
  { section:'Main', links:[
    { href:'/dashboard',           icon:'📊', label:'Dashboard'    },
    { href:'/signals',             icon:'📈', label:'Live Signals', badge:'3' },
    { href:'/dashboard/portfolio', icon:'💼', label:'My Portfolio'  },
    { href:'/dashboard/etf-mf',    icon:'🏦', label:'ETF & MF'     },
  ]},
  { section:'Tools', links:[
    { href:'/algo-builder',        icon:'⚙️', label:'Algo Builder'  },
    { href:'/paper-trading',       icon:'🧪', label:'Paper Trading' },
    { href:'/dashboard/backtest',  icon:'📋', label:'Backtest'      },
  ]},
  { section:'Insights', links:[
    { href:'/dashboard/sectors',   icon:'🔥', label:'Sector Heatmap'    },
    { href:'/dashboard/fii-dii',   icon:'🌍', label:'FII / DII Flow'    },
    { href:'/dashboard/feed',      icon:'𝕏',  label:'Twitter Feed'      },
    { href:'/dashboard/earnings',  icon:'📅', label:'Earnings Calendar' },
  ]},
  { section:'Account', links:[
    { href:'/dashboard/upgrade',   icon:'⚡', label:'Upgrade Plan'   },
    { href:'/dashboard/brokers',   icon:'🔗', label:'Connect Broker' },
    { href:'/dashboard/refer',     icon:'🎁', label:'Refer & Earn'   },
    { href:'/sign-out',            icon:'🚪', label:'Sign Out'       },
  ]},
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dash-sidebar" style={{ background:'var(--surf)', borderRight:'1px solid var(--bdr)', padding:'16px 10px' }}>
      {SIDEBAR.map(group => (
        <div key={group.section}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--dim2)', letterSpacing:1, textTransform:'uppercase', padding:'12px 10px 6px' }}>{group.section}</div>
          {group.links.map(l => {
            const active = pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href));
            return (
              <Link key={l.label} href={l.href}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:9, fontSize:13, fontWeight: active ? 600 : 500, color: active ? 'var(--bluL)' : 'var(--dim)', background: active ? 'rgba(23,64,245,0.1)' : 'transparent' }}>
                <span style={{ width:16, textAlign:'center', fontSize:14 }}>{l.icon}</span>
                {l.label}
                {l.badge && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'var(--red)', color:'#fff' }}>{l.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
