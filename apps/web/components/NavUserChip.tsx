'use client';
import { usePortfolio } from '@/lib/portfolio-context';

export function NavUserChip() {
  const { user } = usePortfolio();
  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = raw.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const first = raw.split(' ')[0].slice(0, 14);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 12px 4px 4px', borderRadius:20, background:'var(--surf2)', border:'1px solid var(--bdr)', cursor:'pointer', flexShrink:0 }}>
      <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,var(--blu),var(--org))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff' }}>
        {initials}
      </div>
      <span className="dash-username" style={{ fontSize:12, fontWeight:600 }}>{first}</span>
    </div>
  );
}
