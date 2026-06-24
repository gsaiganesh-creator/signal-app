'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Handles OAuth callback in Capacitor via custom URL scheme.
// When Google/Twitter redirect to com.gsaiganesh.signal.app://auth/callback?code=xxx,
// iOS fires appUrlOpen — we exchange the code for a session inside the WKWebView.
export function CapacitorOAuthListener() {
  useEffect(() => {
    const isCapacitor = !!(window as { Capacitor?: unknown }).Capacitor;
    if (!isCapacitor) return;

    let cleanup: (() => void) | undefined;

    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const error = parsed.searchParams.get('error');

        if (error) {
          window.location.href = `/sign-in?error=${encodeURIComponent(error)}`;
          return;
        }
        if (!code) return;

        const supabase = createClient();
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (err) {
          window.location.href = `/sign-in?error=${encodeURIComponent(err.message)}`;
        } else {
          window.location.href = '/dashboard';
        }
      });

      cleanup = () => { listener.then(h => h.remove()); };
    });

    return () => { cleanup?.(); };
  }, []);

  return null;
}
