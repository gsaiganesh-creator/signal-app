'use client';

import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotifications(accessToken: string | null) {
  const [state, setState] = useState<PushState>('loading');

  const checkState = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return;
    }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub ? 'subscribed' : 'unsubscribed');
  }, []);

  useEffect(() => { checkState(); }, [checkState]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!accessToken || !VAPID_PUBLIC_KEY) return false;
    try {
      setState('loading');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ subscription: sub.toJSON(), action: 'subscribe' }),
      });
      setState(res.ok ? 'subscribed' : 'unsubscribed');
      return res.ok;
    } catch { setState('unsubscribed'); return false; }
  }, [accessToken]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false;
    try {
      setState('loading');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ subscription: sub.toJSON(), action: 'unsubscribe' }),
        });
        await sub.unsubscribe();
      }
      setState('unsubscribed');
      return true;
    } catch { setState('subscribed'); return false; }
  }, [accessToken]);

  return { state, subscribe, unsubscribe };
}
