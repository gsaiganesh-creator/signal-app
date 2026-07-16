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
import { BrandIcon } from '@/components/Brand';

function Handler() {
  const router     = useRouter();
  const params     = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const code     = params.get('code');
    const error    = params.get('error');
    const next     = params.get('next') ?? '/dashboard';
    const mobile   = params.get('mobile') === '1';

    if (error) { router.replace(`/sign-in?error=${encodeURIComponent(error)}`); return; }

    // Mobile path: relay to app regardless of flow type.
    // The mobile Supabase client holds the PKCE code verifier in AsyncStorage,
    // so we must NOT exchange the code here — send it back to the app via signal://.
    if (mobile) {
      // PKCE: relay the code to the app, which will call exchangeCodeForSession
      if (code) {
        window.location.href = `signal://auth/callback?code=${encodeURIComponent(code)}`;
        return;
      }
      // Implicit fallback: tokens in URL fragment
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const fragment = new URLSearchParams(hash);
      const access_token  = fragment.get('access_token');
      const refresh_token = fragment.get('refresh_token');
      if (access_token && refresh_token) {
        window.location.href =
          `signal://auth/callback?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;
        return;
      }
      router.replace('/sign-in?error=no_tokens');
      return;
    }

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
      <BrandIcon size={32} />
      <div style={{ fontSize:15, fontWeight:600 }}>Completing sign-in…</div>
      <div style={{ fontSize:12, color:'#4A5C7A' }}>You will be redirected automatically</div>
      <Suspense fallback={null}><Handler /></Suspense>
    </div>
  );
}
