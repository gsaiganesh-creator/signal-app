'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Two entry points: (1) the password-reset email link
// (auth/callback?next=/dashboard/settings) — by the time a user lands here the
// recovery code has already been exchanged for a session in auth/callback, or
// (2) NavUserChip's "Change Password" menu item, for any already-logged-in user
// proactively changing their password. Same form either way — supabase.auth.
// updateUser works against any active session, recovery or not.
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/sign-in'); return; }
      setReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpdatePassword() {
    if (pass.length < 8) { setMsg('❌ Password must be at least 8 characters.'); return; }
    if (pass !== confirm) { setMsg('❌ Passwords do not match.'); return; }
    setLoading(true); setMsg('');
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) { setMsg(`❌ ${error.message}`); setLoading(false); return; }
    setLoading(false);
    setDone(true);
    setMsg('✅ Password updated.');
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 46, borderRadius: 11,
    background: 'var(--surf2)', border: '1px solid var(--bdr)',
    color: 'var(--txt)', fontSize: 14, padding: '0 14px',
    fontFamily: 'inherit', outline: 'none',
  };

  if (!ready) return null;

  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Account Settings</div>
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24 }}>Set a new password for your account.</div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 16, padding: 20 }}>
        {done ? (
          <>
            <div style={{ fontSize: 14, color: 'var(--grn)', fontWeight: 700, marginBottom: 14 }}>✅ Password updated successfully.</div>
            <button onClick={() => router.push('/dashboard')}
              style={{ height: 46, width: '100%', borderRadius: 11, background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Continue to Dashboard
            </button>
          </>
        ) : (
          <>
            <label style={{ fontSize: 12, color: 'var(--dim)', display: 'block', marginBottom: 6 }}>New password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="Min 8 characters" style={{ ...inp, marginBottom: 14 }}
              onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()} />

            <label style={{ fontSize: 12, color: 'var(--dim)', display: 'block', marginBottom: 6 }}>Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password" style={{ ...inp, marginBottom: 14 }}
              onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()} />

            {msg && <div style={{ fontSize: 13, color: msg.startsWith('✅') ? 'var(--grn)' : 'var(--red)', marginBottom: 14 }}>{msg}</div>}

            <button onClick={handleUpdatePassword} disabled={loading}
              style={{ height: 46, width: '100%', borderRadius: 11, background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
