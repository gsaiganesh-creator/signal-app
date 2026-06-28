'use client';

import { useEffect } from 'react';
import { usePushNotifications } from '@/lib/usePushNotifications';

interface Props { accessToken: string | null; compact?: boolean; }

export function PushSubscribeButton({ accessToken, compact = false }: Props) {
  const { state, subscribe, unsubscribe } = usePushNotifications(accessToken);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (state === 'unsupported') return null;

  const label = {
    loading:      compact ? '…'   : 'Loading…',
    subscribed:   compact ? '🔔'  : '🔔 Alerts ON',
    unsubscribed: compact ? '🔕'  : '🔕 Enable Alerts',
    denied:       compact ? '🚫'  : '🚫 Blocked',
  }[state] ?? '…';

  const tooltip = {
    subscribed:   'Push notifications enabled — click to disable',
    unsubscribed: 'Enable push notifications for price alerts',
    denied:       'Notifications blocked — change in browser settings',
    loading:      '',
  }[state] ?? '';

  const isOn = state === 'subscribed';

  return (
    <button
      title={tooltip}
      disabled={state === 'loading' || state === 'denied' || !accessToken}
      onClick={isOn ? unsubscribe : subscribe}
      style={{
        height: compact ? 32 : 36,
        padding: compact ? '0 10px' : '0 14px',
        borderRadius: 8,
        border: `1px solid ${isOn ? 'rgba(0,212,160,0.4)' : 'var(--bdr)'}`,
        background: isOn ? 'rgba(0,212,160,0.1)' : 'var(--surf2)',
        color: isOn ? 'var(--grn)' : 'var(--dim)',
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        cursor: state === 'loading' || state === 'denied' || !accessToken ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.15s',
        flexShrink: 0,
      }}>
      {label}
    </button>
  );
}
