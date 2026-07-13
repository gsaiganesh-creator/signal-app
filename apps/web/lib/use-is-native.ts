'use client';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/** SSR-safe: always false on server and on the client's first render (avoiding
 * a hydration mismatch), flips to the real value in an effect after mount —
 * matches the pattern already used in CapacitorOAuthListener.tsx/sign-in/page.tsx. */
export function useIsNativePlatform(): boolean {
  const [isNative, setIsNative] = useState(false);
  useEffect(() => { setIsNative(Capacitor.isNativePlatform()); }, []);
  return isNative;
}
