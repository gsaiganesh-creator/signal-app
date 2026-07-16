'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FOUNDERS } from '@/lib/use-plan';

interface LedgerEntry {
  id: string; record_type: 'expense' | 'contribution'; category: string; description: string;
  amount: number; currency: string; is_recurring: boolean; recurrence_interval: string | null;
  person: string; occurred_on: string; notes: string | null; created_by: string; created_at: string;
}
interface Summary {
  totalsByCurrency: Record<string, { expenses: number; contributions: number }>;
  contributionsByPerson: Record<string, Record<string, number>>;
  annualizedRecurring: Record<string, number>;
}

const CATEGORY_LABEL: Record<string, string> = {
  claude_subscription: 'Claude Subscription', app_store_ios: 'App Store (iOS)', app_store_android: 'Play Store (Android)',
  mail: 'Mail / Email', domain: 'Domain', hosting: 'Hosting', api_keys: 'API Keys', other: 'Other', founder_capital: 'Founder Capital',
};

function fmt(n: number, currency: string) {
  const sym = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency + ' ';
  return `${sym}${n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 })}`;
}
function rel(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const card: React.CSSProperties = { background: '#0E1628', border: '1px solid #1C2E4A', borderRadius: 14, padding: '18px 20px' };
const input: React.CSSProperties = { height: 38, padding: '0 12px', borderRadius: 9, background: '#0E1628', border: '1px solid #1C2E4A', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' };
const select: React.CSSProperties = { ...input };

export default function LedgerPage() {
  const [entries, setEntries]   = useState<LedgerEntry[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [token, setToken]       = useState('');
  const [filter, setFilter]     = useState<'all' | 'expense' | 'contribution'>('all');

  const [recordType, setRecordType]   = useState<'expense' | 'contribution'>('expense');
  const [category, setCategory]       = useState('claude_subscription');
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('USD');
  const [isRecurring, setIsRecurring] = useState(true);
  const [interval, setInterval_]      = useState('monthly');
  const [person, setPerson]           = useState('Sai Ganesh');
  const [occurredOn, setOccurredOn]   = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveErr, setSaveErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not signed in'); setLoading(false); return; }
    const email = (session.user.email ?? '').toLowerCase();
    if (!FOUNDERS.map(e => e.toLowerCase()).includes(email)) { setError('Access denied'); setLoading(false); return; }
    setToken(session.access_token);
    const res = await fetch('/api/admin/ledger', { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error ?? `API error ${res.status}`); setLoading(false); return; }
    const d = await res.json() as { entries: LedgerEntry[]; summary: Summary; categories: string[] };
    setEntries(d.entries); setSummary(d.summary); setCategories(d.categories);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addEntry() {
    setSaving(true); setSaveErr('');
    const res = await fetch('/api/admin/ledger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_type: recordType, category, description, amount: Number(amount), currency,
        is_recurring: recordType === 'expense' ? isRecurring : false,
        recurrence_interval: interval, person, occurred_on: occurredOn, notes,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setSaveErr(d.error ?? 'Failed'); setSaving(false); return; }
    setDescription(''); setAmount(''); setNotes('');
    setSaving(false);
    load();
  }

  async function removeEntry(id: string) {
    if (!confirm('Delete this ledger entry?')) return;
    await fetch(`/api/admin/ledger?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  const filtered = entries.filter(e => filter === 'all' || e.record_type === filter);

  return (
    <div style={{ background: '#070D1A', minHeight: '100vh', color: '#fff', fontFamily: "'Inter',system-ui,sans-serif", padding: '32px clamp(16px,4vw,48px) 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <Link href="/admin" style={{ fontSize: 12, color: '#4F6FFA', textDecoration: 'none' }}>← Admin</Link>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Founders Only
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Business Ledger</div>
        <div style={{ fontSize: 12, color: '#7A8BAA', marginBottom: 28 }}>Recurring/one-time costs + founder capital contributions. Only visible to the two of you.</div>

        {error && <div style={{ background: 'rgba(255,59,92,0.07)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 12, padding: '14px 18px', color: '#FF3B5C', marginBottom: 24 }}>❌ {error}</div>}

        {!error && summary && (
          <>
            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
              {Object.entries(summary.totalsByCurrency).map(([cur, t]) => (
                <div key={cur} style={card}>
                  <div style={{ fontSize: 11, color: '#7A8BAA', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cur} Expenses</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#FF3B5C' }}>{fmt(t.expenses, cur)}</div>
                  <div style={{ fontSize: 11, color: '#3A4E6A', marginTop: 4 }}>Contributions in: {fmt(t.contributions, cur)}</div>
                </div>
              ))}
              {Object.entries(summary.annualizedRecurring).map(([cur, v]) => (
                <div key={cur} style={{ ...card, borderColor: 'rgba(255,184,0,0.25)' }}>
                  <div style={{ fontSize: 11, color: '#FFB800', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Annualized burn ({cur})</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(v, cur)}</div>
                  <div style={{ fontSize: 11, color: '#3A4E6A', marginTop: 4 }}>recurring costs × 12</div>
                </div>
              ))}
            </div>

            {/* Per-founder contributions */}
            {Object.keys(summary.contributionsByPerson).length > 0 && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Contributions by Founder</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(summary.contributionsByPerson).map(([p, byCur]) => (
                    <div key={p} style={{ background: 'rgba(0,212,160,0.08)', border: '1px solid rgba(0,212,160,0.25)', borderRadius: 10, padding: '10px 16px', minWidth: 140 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{p}</div>
                      {Object.entries(byCur).map(([cur, v]) => (
                        <div key={cur} style={{ fontSize: 13, fontWeight: 700, color: '#00D4A0' }}>{fmt(v, cur)}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add entry form */}
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['expense', 'contribution'] as const).map(t => (
                  <button key={t} onClick={() => setRecordType(t)}
                    style={{ height: 32, padding: '0 14px', borderRadius: 8, border: `1px solid ${recordType === t ? '#4F6FFA' : '#1C2E4A'}`, background: recordType === t ? 'rgba(79,111,250,0.15)' : 'transparent', color: recordType === t ? '#4F6FFA' : '#7A8BAA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                    {t === 'expense' ? '💸 Expense' : '💰 Contribution'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                {recordType === 'expense' && (
                  <select value={category} onChange={e => setCategory(e.target.value)} style={select}>
                    {categories.filter(c => c !== 'founder_capital').map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
                  </select>
                )}
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g. Claude Max plan)" style={{ ...input, flex: '1 1 220px' }} />
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={0} step="0.01" placeholder="Amount" style={{ ...input, width: 120 }} />
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...select, width: 90 }}>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                {recordType === 'expense' && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A8BAA', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                      Recurring
                    </label>
                    {isRecurring && (
                      <select value={interval} onChange={e => setInterval_(e.target.value)} style={{ ...select, width: 110 }}>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    )}
                  </>
                )}
                <input value={person} onChange={e => setPerson(e.target.value)} placeholder={recordType === 'expense' ? 'Paid by' : 'Contributed by'} style={{ ...input, width: 160 }} />
                <input value={occurredOn} onChange={e => setOccurredOn(e.target.value)} type="date" style={{ ...input, width: 150 }} />
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...input, flex: '1 1 160px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={addEntry} disabled={saving || !description || !amount || !person}
                  style={{ height: 38, padding: '0 20px', borderRadius: 9, background: '#1740F5', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !description || !amount || !person ? 0.5 : 1 }}>
                  {saving ? '…' : `+ Add ${recordType}`}
                </button>
                {saveErr && <span style={{ fontSize: 12, color: '#FF3B5C' }}>{saveErr}</span>}
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['all', 'expense', 'contribution'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ height: 30, padding: '0 12px', borderRadius: 8, border: `1px solid ${filter === f ? '#4F6FFA' : '#1C2E4A'}`, background: filter === f ? 'rgba(79,111,250,0.12)' : 'transparent', color: filter === f ? '#4F6FFA' : '#7A8BAA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Entries table */}
            <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr>
                    {['Type', 'Category', 'Description', 'Amount', 'Recurring', 'Person', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#7A8BAA', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #1C2E4A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid rgba(28,46,74,0.5)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: e.record_type === 'expense' ? 'rgba(255,59,92,0.1)' : 'rgba(0,212,160,0.1)', color: e.record_type === 'expense' ? '#FF3B5C' : '#00D4A0' }}>
                          {e.record_type === 'expense' ? 'Expense' : 'Contribution'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#7A8BAA', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>{CATEGORY_LABEL[e.category] ?? e.category}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid rgba(28,46,74,0.5)' }}>
                        {e.description}
                        {e.notes && <div style={{ fontSize: 10, color: '#3A4E6A' }}>{e.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(28,46,74,0.5)' }}>{fmt(Number(e.amount), e.currency)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#7A8BAA', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>{e.is_recurring ? `↻ ${e.recurrence_interval}` : '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid rgba(28,46,74,0.5)' }}>{e.person}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#7A8BAA', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>{rel(e.occurred_on)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(28,46,74,0.5)' }}>
                        <button onClick={() => removeEntry(e.id)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)', color: '#FF3B5C', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#3A4E6A', fontSize: 12 }}>No entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
