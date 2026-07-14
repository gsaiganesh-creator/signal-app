'use client';
import { useEffect, useState, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useIsNativePlatform } from '@/lib/use-is-native';

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  // Do NOT call Capacitor.isNativePlatform() directly here — Task 1 found this
  // causes a real SSR/hydration mismatch (server render always sees `false`,
  // native client's first render sees `true` immediately), fixed there via this
  // shared post-mount hook. Reuse it rather than reintroducing the same bug.
  const isNative = useIsNativePlatform();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const attemptedRef = useRef(false);

  async function tryUnlock() {
    if (checking) return;
    setChecking(true);
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const result = await BiometricAuth.checkBiometry();
      if (!result.isAvailable) { setLocked(false); return; } // no biometric hardware — skip lock
      await BiometricAuth.authenticate({
        reason: 'Unlock SignalGenie',
        cancelTitle: 'Cancel',
      });
      setLocked(false);
    } catch {
      // authenticate() throws BiometryError on failure/cancel — stay locked, let the user retry via the button.
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!isNative) return;
    // isNative just resolved true (post-mount, per useIsNativePlatform's own
    // effect) — engage the lock now rather than relying on `locked`'s initial
    // state, which must start `false` to stay SSR-safe (see hook above).
    setLocked(true);
    if (!attemptedRef.current) { attemptedRef.current = true; tryUnlock(); }

    const sub = CapacitorApp.addListener('resume', () => {
      setLocked(true);
      attemptedRef.current = false;
    });
    return () => { sub.then(s => s.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  useEffect(() => {
    if (locked && isNative && !attemptedRef.current) { attemptedRef.current = true; tryUnlock(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (!isNative || !locked) return <>{children}</>;

  return (
    <div style={{ position:'fixed', inset:0, background:'#070D1A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, zIndex:9999 }}>
      <div style={{ fontSize:40 }}>🔒</div>
      <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>SignalGenie Locked</div>
      <button onClick={tryUnlock} disabled={checking}
        style={{ height:44, padding:'0 24px', borderRadius:10, background:'#1740F5', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        {checking ? 'Verifying…' : 'Unlock'}
      </button>
    </div>
  );
}
