import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href:'/dashboard',       label:'📊 Dashboard',    active:true  },
  { href:'/signals',         label:'📈 Signals',      badge:'3'    },
  { href:'/dashboard',       label:'💼 Portfolio'               },
  { href:'/algo-builder',    label:'⚙️ Algo Builder'            },
  { href:'/paper-trading',   label:'🧪 Paper Trade'             },
];

const SIDEBAR = [
  { section:'Main', links:[
    { href:'/dashboard',     icon:'📊', label:'Dashboard',    active:true  },
    { href:'/signals',       icon:'📈', label:'Live Signals', badge:'3'    },
    { href:'/dashboard',     icon:'💼', label:'My Portfolio'              },
    { href:'/dashboard',     icon:'🏦', label:'ETF & MF'                  },
  ]},
  { section:'Tools', links:[
    { href:'/algo-builder',  icon:'⚙️', label:'Algo Builder'              },
    { href:'/paper-trading', icon:'🧪', label:'Paper Trading'             },
    { href:'/dashboard',     icon:'📋', label:'Backtest'                   },
  ]},
  { section:'Insights', links:[
    { href:'/dashboard',     icon:'🔥', label:'Sector Heatmap'            },
    { href:'/dashboard',     icon:'🌍', label:'FII / DII Flow'            },
    { href:'/dashboard',     icon:'𝕏',  label:'Twitter Feed'              },
    { href:'/dashboard',     icon:'📅', label:'Earnings Calendar'         },
  ]},
  { section:'Account', links:[
    { href:'/dashboard',     icon:'⚡', label:'Upgrade Plan'              },
    { href:'/dashboard',     icon:'🔗', label:'Connect Broker'            },
    { href:'/sign-in',       icon:'🚪', label:'Sign Out'                  },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:'var(--bg)', color:'var(--txt)', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>

      {/* Top Nav */}
      <nav style={{ display:'flex', alignItems:'center', height:58, padding:'0 clamp(16px,3vw,32px)', background:'var(--surf)', borderBottom:'1px solid var(--bdr)', position:'sticky', top:0, zIndex:100 }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontSize:18, fontWeight:900, letterSpacing:-0.5, color:'var(--txt)', marginRight:28 }}>
          <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.2"/>
            <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
          </svg>
          SIGNAL
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:2, flex:1 }}>
          {NAV_LINKS.map(l => (
            <Link key={l.href+l.label} href={l.href}
              style={{ height:34, padding:'0 13px', borderRadius:8, fontSize:13, fontWeight: l.active ? 600 : 500, color: l.active ? 'var(--bluL)' : 'var(--dim)', display:'flex', alignItems:'center', gap:6, background: l.active ? 'rgba(23,64,245,0.12)' : 'transparent', position:'relative' }}>
              {l.label}
              {l.badge && <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:8, background:'var(--red)', color:'#fff' }}>{l.badge}</span>}
            </Link>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ThemeToggle />
          <div style={{ width:34, height:34, borderRadius:9, background:'transparent', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <span style={{ fontSize:14 }}>🔔</span>
            <div style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--red)', border:'1.5px solid var(--surf)' }}/>
          </div>
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:'rgba(255,92,26,0.12)', border:'1px solid rgba(255,92,26,0.25)', color:'var(--org)' }}>Pro</span>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 12px 4px 4px', borderRadius:20, background:'var(--surf2)', border:'1px solid var(--bdr)', cursor:'pointer' }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,var(--blu),var(--org))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff' }}>VA</div>
            <span style={{ fontSize:12, fontWeight:600 }}>Vaasudev A.</span>
          </div>
        </div>
      </nav>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', minHeight:'calc(100vh - 58px)' }}>

        {/* Sidebar */}
        <aside style={{ background:'var(--surf)', borderRight:'1px solid var(--bdr)', padding:'16px 10px', display:'flex', flexDirection:'column', gap:4 }}>
          {SIDEBAR.map(group => (
            <div key={group.section}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--dim2)', letterSpacing:1, textTransform:'uppercase', padding:'12px 10px 6px' }}>{group.section}</div>
              {group.links.map(l => (
                <Link key={l.label} href={l.href}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:9, fontSize:13, fontWeight: l.active ? 600 : 500, color: l.active ? 'var(--bluL)' : 'var(--dim)', background: l.active ? 'rgba(23,64,245,0.1)' : 'transparent' }}>
                  <span style={{ width:16, textAlign:'center', fontSize:14 }}>{l.icon}</span>
                  {l.label}
                  {l.badge && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'var(--red)', color:'#fff' }}>{l.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
        </aside>

        {/* Page content */}
        <main style={{ padding:'24px clamp(16px,3vw,32px)', overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
