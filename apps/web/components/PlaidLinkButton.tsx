'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface Props {
  onSuccess: (itemId: string, institutionName: string) => void;
  onError?:  (msg: string) => void;
  label?:    string;
  style?:    React.CSSProperties;
}

export default function PlaidLinkButton({ onSuccess, onError, label = 'Connect Broker', style }: Props) {
  const [linkToken, setLinkToken]   = useState<string | null>(null);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.link_token) setLinkToken(d.link_token);
        else { setError(d.error ?? 'Failed to init Plaid'); onError?.(d.error); }
      })
      .catch(e => { setError(e.message); onError?.(e.message); });
  }, [onError]);

  const handleSuccess = useCallback(async (publicToken: string, metadata: { institution?: { name?: string } | null }) => {
    setLoading(true);
    try {
      const institutionName = metadata?.institution?.name ?? 'Unknown';
      const r = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, institution_name: institutionName }),
      });
      const d = await r.json();
      if (d.success) onSuccess(d.item_id, institutionName);
      else { setError(d.error ?? 'Exchange failed'); onError?.(d.error); }
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handleSuccess,
    onExit: (err) => { if (err) setError(err.display_message ?? err.error_message ?? 'Plaid exited'); },
  });

  const btn: React.CSSProperties = {
    height: 40, borderRadius: 10, padding: '0 20px',
    background: 'linear-gradient(135deg,#1740F5,#4F6FFA)',
    border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: ready && !loading ? 'pointer' : 'default',
    opacity: ready && !loading ? 1 : 0.5,
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
    ...style,
  };

  if (error) return (
    <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'rgba(255,59,92,0.1)', borderRadius: 8, border: '1px solid rgba(255,59,92,0.25)' }}>
      ⚠ {error}
    </div>
  );

  return (
    <button style={btn} onClick={() => open()} disabled={!ready || loading}>
      {loading ? '⏳ Connecting…' : ready ? `🔗 ${label}` : '⏳ Loading…'}
    </button>
  );
}
