'use client';
import { useEffect, useState, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { useIsNativePlatform } from '@/lib/use-is-native';

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  // Do NOT call Capacitor.isNativePlatform() directly here — Task 1 found this
  // causes a real SSR/hydration mismatch (server render always sees `false`,
  // native client's first render sees `true` immediately), fixed there via this
  // shared post-mount hook. Reuse it rather than reintroducing the same bug.
  const isNative = useIsNativePlatform();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const attemptedRef = useRef(false);
  // No `resolved` pre-mount gate here on purpose: it was tried and reverted
  // (see commit history) because it blanked the dashboard for one tick on
  // EVERY web page load, not just native — `isNative` itself only resolves
  // post-mount for both platforms, so gating on "resolved" before "isNative"
  // punished the (much larger) web audience to avoid a native-only double
  // fetch. That double-fetch-on-cold-launch (PortfolioProvider fetches once
  // wastefully pre-lock, then again post-unlock) is an accepted, documented
  // tradeoff — do not reintroduce this gate to "fix" it.

  async function tryUnlock() {
    if (checking) return;
    setChecking(true);
    setLockoutMessage(null);
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const result = await BiometricAuth.checkBiometry();
      if (!result.isAvailable) { setLocked(false); return; } // no biometric hardware — skip lock
      await BiometricAuth.authenticate({
        reason: 'Unlock SignalGenie',
        cancelTitle: 'Cancel',
      });
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      setLocked(false);
    } catch (err) {
      if (err instanceof BiometryError) {
        if (err.code === BiometryErrorType.biometryLockout) {
          setLockoutMessage('Too many failed attempts. Use your device passcode to unlock your phone, then reopen the app.');
        } else if (
          err.code === BiometryErrorType.biometryNotAvailable ||
          err.code === BiometryErrorType.biometryNotEnrolled ||
          err.code === BiometryErrorType.noDeviceCredential
        ) {
          setLocked(false); // biometry not set up — skip gate
        }
        // userCancel / authFailed — stay locked, user retries via button
      } else {
        // Unexpected error (plugin bridge issue etc.) — fail open so app is usable
        setLocked(false);
      }
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
      attemptedRef.current = true;
      tryUnlock();
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
      {lockoutMessage && <div style={{ color:'#FF3B5C', fontSize:13, textAlign:'center', maxWidth:280 }}>{lockoutMessage}</div>}
      <button onClick={() => { attemptedRef.current = true; tryUnlock(); }} disabled={checking}
        style={{ height:44, padding:'0 24px', borderRadius:10, background:'#1740F5', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        {checking ? 'Verifying…' : 'Unlock'}
      </button>
    </div>
  );
}
