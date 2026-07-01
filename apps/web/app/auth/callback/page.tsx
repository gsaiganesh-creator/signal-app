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

    supabase.auth.exchangeCodeForSession(code)
      .then(async ({ data, error: err }) => {
        if (err) {
          router.replace(`/sign-in?error=${encodeURIComponent(err.message)}`);
        } else {
          // Record referral if one was stored before sign-in
          const refCode = localStorage.getItem('signal_ref_code');
          if (refCode && data.session?.access_token) {
            localStorage.removeItem('signal_ref_code');
            fetch('/api/referral', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ ref_code: refCode, user_token: data.session.access_token }),
            }).catch(() => {});
          }
          // Hard reload — not router.replace — so the server sees fresh cookies
          // and middleware grants access on first try (eliminates double-login)
          window.location.href = next;
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'exchange_failed';
        router.replace(`/sign-in?error=${encodeURIComponent(msg)}`);
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
        <circle cx="22" cy="4" r="3.6" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.7"/>
        <circle cx="22" cy="0.4" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="25.1" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="25.1" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="22" cy="7.6" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="18.9" cy="5.8" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <circle cx="18.9" cy="2.2" r="0.55" fill="#8B5CF6" opacity="0.8"/>
        <path d="M22 2.2 L22.45 3.55 L23.8 4 L22.45 4.45 L22 5.8 L21.55 4.45 L20.2 4 L21.55 3.55 Z" fill="#FF5C1A"/>
      </svg>
      <div style={{ fontSize:15, fontWeight:600 }}>Completing sign-in…</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>You will be redirected automatically</div>
      <Suspense fallback={null}><Handler /></Suspense>
    </div>
  );
}
