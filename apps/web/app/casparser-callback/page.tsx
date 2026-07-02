'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Callback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('inbox_token');
    if (token) sessionStorage.setItem('cas_inbox_token', token);
    router.replace('/dashboard/etf-mf?tab=holdings&cas=1');
  }, [params, router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#070D1A', color:'#fff', fontFamily:'Inter,system-ui,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:14 }}>✅</div>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Gmail connected!</div>
        <div style={{ fontSize:13, color:'#7A8BAA' }}>Redirecting to your portfolio…</div>
      </div>
    </div>
  );
}

export default function CASParserCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#070D1A', color:'#fff' }}>
        Connecting…
      </div>
    }>
      <Callback />
    </Suspense>
  );
}
