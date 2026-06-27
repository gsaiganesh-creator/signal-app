'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RefPage() {
  const { code } = useParams<{ code: string }>();
  const router   = useRouter();

  useEffect(() => {
    if (code) {
      localStorage.setItem('signal_ref_code', code.toUpperCase());
    }
    router.replace('/sign-in?ref=1');
  }, [code, router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0A1525', color:'#fff', fontFamily:'Inter,system-ui,sans-serif', flexDirection:'column', gap:12 }}>
      <svg width="32" height="32" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.3"/>
        <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
      </svg>
      <div style={{ fontSize:15, fontWeight:600 }}>You were invited to SIGNAL</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>Taking you to sign up…</div>
    </div>
  );
}
