'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Exposes window.__navigateTo(path) so the native ShellViewController tab bar
// can trigger client-side Next.js navigation without a full page reload.
// A hard href change (window.location.href) reloads the entire app, which
// remounts BiometricLockGate and triggers Face ID on every tab tap.
export function NativeNavBridge() {
  const router = useRouter();

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__navigateTo = (path: string) => {
      router.push(path);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__navigateTo;
    };
  }, [router]);

  return null;
}
