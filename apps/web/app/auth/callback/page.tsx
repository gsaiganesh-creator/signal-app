'use client';
// Client-side OAuth callback — browser client handles exchangeCodeForSession,
// so the session is stored in localStorage (+ cookie). onAuthStateChange in
// PortfolioProvider then fires INITIAL_SESSION with a real session.
//
// The old server-side route.ts approach stored tokens only in server-set
// cookies; the browser client's onAuthStateChange couldn't read them (cookie
// chunking bug in @supabase/ssr 0.12.0) → INITIAL_SESSION fired with null →
// "Session expired" on dashboard → user had to sign in twice.
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function Handler() {
  const router     = useRouter();
  const params     = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const code     = params.get('code');
    const error    = params.get('error');
    const next     = params.get('next') ?? '/dashboard';

    if (error) { router.replace(`/sign-in?error=${encodeURIComponent(error)}`); return; }
    if (!code) { router.replace('/sign-in?error=no_code'); return; }

    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) router.replace('/sign-in?error=auth_callback_failed');
      else     router.replace(next);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0A1525', color:'#fff', fontFamily:'Inter,system-ui,sans-serif', flexDirection:'column', gap:12 }}>
      <svg width="32" height="32" viewBox="0 0 26 26" fill="none">
        <rect width="26" height="26" rx="7" fill="#1740F5" opacity="0.3"/>
        <polyline points="3,20 8,13 12,17 17,7 21,11 24,5" stroke="#4F6FFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="21" cy="11" r="2.8" fill="#FF5C1A"/>
      </svg>
      <div style={{ fontSize:15, fontWeight:600 }}>Completing sign-in…</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>You will be redirected automatically</div>
      <Suspense fallback={null}><Handler /></Suspense>
    </div>
  );
}
