'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href:'/dashboard',           label:'📊 Dashboard'   },
  { href:'/signals',             label:'📈 Signals',     badge:'3' },
  { href:'/dashboard/portfolio', label:'💼 Portfolio'   },
  { href:'/algo-builder',        label:'⚙️ Algo Builder' },
  { href:'/paper-trading',       label:'🧪 Paper Trade'  },
];

export function DashboardTopNav() {
  const path = usePathname();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, flex:1 }}>
      {LINKS.map(l => {
        const active = path === l.href || (l.href !== '/dashboard' && path.startsWith(l.href));
        return (
          <Link key={l.href + l.label} href={l.href}
            style={{ height:34, padding:'0 13px', borderRadius:8, fontSize:13, fontWeight: active ? 600 : 500, color: active ? 'var(--bluL)' : 'var(--dim)', display:'flex', alignItems:'center', gap:6, background: active ? 'rgba(23,64,245,0.12)' : 'transparent', position:'relative' }}>
            {l.label}
            {l.badge && <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:8, background:'var(--red)', color:'#fff' }}>{l.badge}</span>}
          </Link>
        );
      })}
    </div>
  );
}
