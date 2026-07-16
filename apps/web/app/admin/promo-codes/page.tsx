'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FOUNDERS } from '@/lib/use-plan';

interface PromoCode {
  id: string; code: string; discount_pct: number; label: string | null;
  created_by: string; used_by: string | null; used_by_email: string | null;
  used_at: string | null; is_active: boolean; created_at: string;
}

function rel(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const card: React.CSSProperties = { background: '#0E1628', border: '1px solid #1C2E4A', borderRadius: 14, padding: '18px 20px' };
const input: React.CSSProperties = { height: 38, padding: '0 12px', borderRadius: 9, background: '#0E1628', border: '1px solid #1C2E4A', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' };

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  const [code, setCode] = useState('');
  const [discPct, setDiscPct] = useState('20');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not signed in'); setLoading(false); return; }
    const email = (session.user.email ?? '').toLowerCase();
    if (!FOUNDERS.map(e => e.toLowerCase()).includes(email)) { setError('Access denied'); setLoading(false); return; }
    setToken(session.access_token);
    const res = await fetch('/api/admin/promo-codes', { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error ?? `API error ${res.status}`); setLoading(false); return; }
    const d = await res.json() as { codes: PromoCode[] };
    setCodes(d.codes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generateRandom() {
    setCode('SG' + Math.random().toString(36).slice(2, 8).toUpperCase());
  }

  async function createCode() {
    setCreating(true); setCreateErr('');
    const res = await fetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, discount_pct: Number(discPct), label }),
    });
    const d = await res.json();
    if (!res.ok) { setCreateErr(d.error ?? 'Failed'); setCreating(false); return; }
    setCode(''); setLabel(''); setDiscPct('20');
    setCreating(false);
    load();
  }

  async function disableCode(id: string) {
    if (!confirm('Disable this code? It will no longer be redeemable.')) return;
    await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  const available = codes.filter(c => c.is_active && !c.used_by);
  const used = codes.filter(c => c.used_by);
  const disabled = codes.filter(c => !c.is_active && !c.used_by);

  return (
    <div style={{ background: '#070D1A', minHeight: '100vh', color: '#fff', fontFamily: "'Inter',system-ui,sans-serif", padding: '32px clamp(16px,4vw,48px) 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <Link href="/admin" style={{ fontSize: 12, color: '#4F6FFA', textDecoration: 'none' }}>← Admin</Link>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Promo Codes
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>One-Time Promo Codes</div>
        <div style={{ fontSize: 12, color: '#7A8BAA', marginBottom: 28 }}>Generate single-use discount codes — for Twitter giveaways etc. Each code dies after one redemption.</div>

        {error && <div style={{ background: 'rgba(255,59,92,0.07)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 12, padding: '14px 18px', color: '#FF3B5C', marginBottom: 24 }}>❌ {error}</div>}

        {!error && (
          <>
            {/* Generate form */}
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Generate New Code</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CODE (e.g. WILLOW20)" style={{ ...input, minWidth: 200, textTransform: 'uppercase' }} />
                <button onClick={generateRandom} style={{ height: 38, padding: '0 12px', borderRadius: 9, background: '#0E1628', border: '1px solid #1C2E4A', color: '#7A8BAA', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🎲 Random</button>
                <input value={discPct} onChange={e => setDiscPct(e.target.value)} type="number" min={1} max={100} placeholder="Discount %" style={{ ...input, width: 110 }} />
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Willow Whisper Twitter)" style={{ ...input, flex: '1 1 220px' }} />
                <button onClick={createCode} disabled={creating || !code || !discPct}
                  style={{ height: 38, padding: '0 18px', borderRadius: 9, background: '#1740F5', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: creating || !code || !discPct ? 0.5 : 1 }}>
                  {creating ? '…' : '+ Generate'}
                </button>
              </div>
              {createErr && <div style={{ fontSize: 12, color: '#FF3B5C' }}>{createErr}</div>}
            </div>

            {loading ? (
              <div style={{ color: '#7A8BAA', fontSize: 14 }}>Loading…</div>
            ) : (
              <>
                {/* Available codes */}
                <div style={{ ...card, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid #1C2E4A' }}>
                    Available ({available.length})
                  </div>
                  {available.length === 0 && <div style={{ padding: '24px 18px', color: '#3A4E6A', fontSize: 12, textAlign: 'center' }}>No unused codes</div>}
                  {available.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(0,212,160,0.12)', color: '#00D4A0', border: '1px solid rgba(0,212,160,0.25)' }}>{c.discount_pct}% off</span>
                      {c.label && <span style={{ fontSize: 11, color: '#7A8BAA' }}>{c.label}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3A4E6A' }}>{rel(c.created_at)} · by {c.created_by.split('@')[0]}</span>
                      <button onClick={() => disableCode(c.id)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)', color: '#FF3B5C', cursor: 'pointer', fontFamily: 'inherit' }}>Disable</button>
                    </div>
                  ))}
                </div>

                {/* Used codes */}
                <div style={{ ...card, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid #1C2E4A' }}>
                    Redeemed ({used.length})
                  </div>
                  {used.length === 0 && <div style={{ padding: '24px 18px', color: '#3A4E6A', fontSize: 12, textAlign: 'center' }}>None redeemed yet</div>}
                  {used.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1, color: '#7A8BAA', textDecoration: 'line-through' }}>{c.code}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(122,139,170,0.1)', color: '#7A8BAA' }}>{c.discount_pct}% off</span>
                      <span style={{ fontSize: 11, color: '#fff' }}>used by {c.used_by_email}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3A4E6A' }}>{rel(c.used_at)}</span>
                    </div>
                  ))}
                </div>

                {/* Disabled */}
                {disabled.length > 0 && (
                  <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid #1C2E4A', color: '#7A8BAA' }}>
                      Disabled ({disabled.length})
                    </div>
                    {disabled.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid rgba(28,46,74,0.5)', opacity: 0.5 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</span>
                        <span style={{ fontSize: 11, color: '#7A8BAA' }}>{c.discount_pct}% off · never used</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
