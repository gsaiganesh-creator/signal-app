'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/lib/portfolio-context';
import { usePlan } from '@/lib/use-plan';

const PLAN_LABEL: Record<string, string> = {
  admin: 'ADMIN', elite: 'ELITE', pro: 'PRO', starter: 'STARTER', free: 'FREE',
};
const PLAN_COLOR: Record<string, string> = {
  admin: '#a78bfa', elite: '#FFB800', pro: '#4F6FFA', starter: '#00D4A0', free: '#7A8BAA',
};
const PLAN_BG: Record<string, string> = {
  admin: 'rgba(167,139,250,0.12)', elite: 'rgba(255,184,0,0.12)',
  pro: 'rgba(79,111,250,0.12)', starter: 'rgba(0,212,160,0.12)', free: 'rgba(122,139,170,0.10)',
};

function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconLogOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export function NavUserChip() {
  const { user } = usePortfolio();
  const { plan, isAdmin } = usePlan();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = raw.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const first = raw.split(' ')[0].slice(0, 14);
  const email = user?.email ?? '';

  const planKey = plan ?? 'free';
  const planLabel = PLAN_LABEL[planKey] ?? planKey.toUpperCase();
  const planColor = PLAN_COLOR[planKey] ?? '#7A8BAA';
  const planBg = PLAN_BG[planKey] ?? 'rgba(122,139,170,0.10)';

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  type MenuItem = { icon: React.ReactNode; label: string; href: string };
  const menuItems: MenuItem[] = [
    { icon: <IconBell />, label: 'Notifications',   href: '' },
    { icon: <IconLock />, label: 'Change Password', href: '/dashboard/settings' },
    { icon: <IconZap />,  label: 'Upgrade Plan',     href: '/dashboard/upgrade' },
    { icon: <IconGift />, label: 'Refer & Earn',     href: '/dashboard/refer' },
  ];
  if (isAdmin) {
    menuItems.splice(0, 0, { icon: <IconShield />, label: 'Admin Console', href: '/admin' });
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 20, background: 'var(--surf2)', border: '1px solid var(--bdr)', cursor: 'pointer' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1740F5,#FF5C1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>
          {initials}
        </div>
        <span className="dash-username" style={{ fontSize: 12, fontWeight: 600 }}>{first}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 228, background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden' }}>
          {/* User info header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bdr)', background: 'var(--surf2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1740F5,#FF5C1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{raw}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: '4px 10px', borderRadius: 6, background: planBg, border: `1px solid ${planColor}33`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconZap />
              <span style={{ fontSize: 10, fontWeight: 700, color: planColor }}>{planLabel} PLAN</span>
            </div>
          </div>

          {/* Menu items */}
          {menuItems.map(item => (
            <button key={item.label}
              onClick={() => { setOpen(false); if (item.href) router.push(item.href); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--bdr)', color: item.label === 'Admin Console' ? '#a78bfa' : 'var(--txt)', fontSize: 13, fontWeight: item.label === 'Admin Console' ? 600 : 500, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.label === 'Admin Console' ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Sign out */}
          <button
            onClick={() => { setOpen(false); window.location.href = '/sign-out'; }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'transparent', border: 'none', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,59,92,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconLogOut /></span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
