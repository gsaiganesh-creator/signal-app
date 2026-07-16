'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrandIcon } from '@/components/Brand';

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
      <BrandIcon size={32} />
      <div style={{ fontSize:15, fontWeight:600 }}>You were invited to SignalGenie</div>
      <div style={{ fontSize:13, color:'#00D4A0', fontWeight:700, marginTop:4 }}>🎁 5% off your first subscription</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>Taking you to sign up…</div>
    </div>
  );
}
