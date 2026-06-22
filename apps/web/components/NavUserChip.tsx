'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/lib/portfolio-context';

export function NavUserChip() {
  const { user } = usePortfolio();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = raw.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const first = raw.split(' ')[0].slice(0, 14);
  const email = user?.email ?? '';

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px 4px 4px', borderRadius:20, background:'var(--surf2)', border:'1px solid var(--bdr)', cursor:'pointer' }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1740F5,#FF5C1A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff' }}>
          {initials}
        </div>
        <span className="dash-username" style={{ fontSize:12, fontWeight:600 }}>{first}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity:0.5, transition:'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:220, background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', zIndex:200, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--bdr)', background:'var(--surf2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1740F5,#FF5C1A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{raw}</div>
                <div style={{ fontSize:11, color:'var(--dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
              </div>
            </div>
            <div style={{ marginTop:10, padding:'4px 10px', borderRadius:6, background:'rgba(255,92,26,0.1)', border:'1px solid rgba(255,92,26,0.2)', display:'inline-flex', alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--org)' }}>⚡ PRO PLAN</span>
            </div>
          </div>

          {[
            { icon:'🔔', label:'Notifications',  href:'' },
            { icon:'⚡', label:'Upgrade Plan',   href:'/dashboard/upgrade' },
            { icon:'🎁', label:'Refer & Earn',   href:'/dashboard/refer'  },
          ].map(item => (
            <button key={item.label}
              onClick={() => { setOpen(false); if (item.href) router.push(item.href); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', borderBottom:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:500, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <button
            onClick={() => { setOpen(false); router.push('/sign-out'); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', color:'var(--red)', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,59,92,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize:15, width:20, textAlign:'center' }}>🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
