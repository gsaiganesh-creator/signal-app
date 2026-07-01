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
        <circle cx="22" cy="4" r="3.6" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.7"/>
        <circle cx="22" cy="0.4" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="25.1" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="25.1" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="22" cy="7.6" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="18.9" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="18.9" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <path d="M22 2.2 L22.45 3.55 L23.8 4 L22.45 4.45 L22 5.8 L21.55 4.45 L20.2 4 L21.55 3.55 Z" fill="#FF5C1A"/>
      </svg>
      <div style={{ fontSize:15, fontWeight:600 }}>You were invited to SignalGenie</div>
      <div style={{ fontSize:13, color:'#00D4A0', fontWeight:700, marginTop:4 }}>🎁 5% off your first subscription</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>Taking you to sign up…</div>
    </div>
  );
}
