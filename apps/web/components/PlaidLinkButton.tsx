'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface Props {
  onSuccess: (itemId: string, institutionName: string) => void;
  onError?:  (msg: string) => void;
  label?:    string;
  style?:    React.CSSProperties;
}

const LS_KEY = 'plaid_link_token';

export default function PlaidLinkButton({ onSuccess, onError, label = 'Connect Broker', style }: Props) {
  const [linkToken,         setLinkToken]         = useState<string | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [receivedRedirect,  setReceivedRedirect]  = useState<string | undefined>(undefined);

  useEffect(() => {
    // Detect OAuth return: Plaid appends ?oauth_state_id=... to the redirect_uri
    const params  = new URLSearchParams(window.location.search);
    const oauthId = params.get('oauth_state_id');

    if (oauthId) {
      // Returning from bank OAuth — restore saved link_token and reopen Link
      const saved = sessionStorage.getItem(LS_KEY);
      if (saved) {
        setLinkToken(saved);
        setReceivedRedirect(window.location.href);
        // Clean the URL without reload
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
    }

    // Normal flow — fetch a fresh link_token
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.link_token) {
          setLinkToken(d.link_token);
          // Persist for potential OAuth redirect
          sessionStorage.setItem(LS_KEY, d.link_token);
        } else {
          const msg = d.error ?? 'Failed to init Plaid';
          setError(msg);
          onError?.(msg);
        }
      })
      .catch(e => { const msg = e.message; setError(msg); onError?.(msg); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuccess = useCallback(async (
    publicToken: string,
    metadata: { institution?: { name?: string } | null },
  ) => {
    setLoading(true);
    sessionStorage.removeItem(LS_KEY);
    try {
      const institutionName = metadata?.institution?.name ?? 'Unknown';
      const r = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, institution_name: institutionName }),
      });
      const d = await r.json();
      if (d.success) onSuccess(d.item_id, institutionName);
      else { const msg = d.error ?? 'Exchange failed'; setError(msg); onError?.(msg); }
    } finally { setLoading(false); }
  }, [onSuccess, onError]);

  const { open, ready } = usePlaidLink({
    token:               linkToken ?? '',
    receivedRedirectUri: receivedRedirect,
    onSuccess:           handleSuccess,
    onExit: (err) => {
      sessionStorage.removeItem(LS_KEY);
      if (err) setError(err.display_message ?? err.error_message ?? 'Plaid exited with error');
    },
  });

  // Auto-open when returning from OAuth
  useEffect(() => {
    if (ready && receivedRedirect) open();
  }, [ready, receivedRedirect, open]);

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
    <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'rgba(255,59,92,0.1)', borderRadius: 8, border: '1px solid rgba(255,59,92,0.25)', display:'flex', gap:8, alignItems:'center' }}>
      ⚠ {error}
      <button onClick={() => { setError(null); sessionStorage.removeItem(LS_KEY); }} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:12 }}>Retry</button>
    </div>
  );

  return (
    <button style={btn} onClick={() => open()} disabled={!ready || loading}>
      {loading ? '⏳ Connecting…' : ready ? `🔗 ${label}` : '⏳ Loading…'}
    </button>
  );
}
