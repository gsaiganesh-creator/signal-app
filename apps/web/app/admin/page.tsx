'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FOUNDERS } from '@/lib/use-plan';

interface UserRow {
  id: string; email: string; created_at: string; last_sign_in: string | null;
  last_active: string | null;
  confirmed: boolean; plan: string;
  portfolios: number; india_holdings: number; us_holdings: number;
  india_invested: number; us_invested: number; rsu_grants: number;
}
interface Summary {
  total_users: number; confirmed: number; active_7d: number;
  plan_dist: Record<string, number>;
  total_india_invested: number; total_us_invested: number;
  total_portfolios: number; total_holdings: number; total_rsu_grants: number;
  total_revenue_paise: number; revenue_30d_paise: number; total_payments: number;
}
interface PaymentRow {
  id: string; email: string; plan: string; billing: string; amount: number; currency: string;
  discount_pct: number; promo_code: string | null; razorpay_payment_id: string; created_at: string;
}
interface AdminData { summary: Summary; users: UserRow[]; payments: PaymentRow[]; generated_at: string }

const PLAN_COLOR: Record<string, string> = {
  admin:   '#a78bfa', elite: '#FFB800', pro: '#4F6FFA',
  starter: '#00D4A0', free: '#7A8BAA',
};
const PLAN_BG: Record<string, string> = {
  admin:   'rgba(167,139,250,0.12)', elite: 'rgba(255,184,0,0.12)',
  pro:     'rgba(79,111,250,0.12)',  starter: 'rgba(0,212,160,0.12)',
  free:    'rgba(122,139,170,0.10)',
};

function rel(iso: string | null) {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(d / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

function fmt(n: number, isCrore = false) {
  if (isCrore) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function AdminPage() {
  const [data,    setData]    = useState<AdminData | null>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [planFlt, setPlanFlt] = useState('all');
  const [sort,    setSort]    = useState<{ col: keyof UserRow; dir: 1 | -1 }>({ col: 'created_at', dir: -1 });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not signed in'); setLoading(false); return; }
    const email = (session.user.email ?? '').toLowerCase();
    if (!FOUNDERS.map(e => e.toLowerCase()).includes(email)) {
      setError('Access denied'); setLoading(false); return;
    }
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `API error ${res.status}`);
      setLoading(false); return;
    }
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const card: React.CSSProperties = { background:'#0E1628', border:'1px solid #1C2E4A', borderRadius:14, padding:'18px 20px' };

  const filtered = (data?.users ?? [])
    .filter(u => planFlt === 'all' || u.plan === planFlt)
    .filter(u => !search || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sort.col] ?? 0, bv = b[sort.col] ?? 0;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });

  const toggleSort = (col: keyof UserRow) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: -1 });

  const thStyle: React.CSSProperties = { padding:'10px 12px', fontSize:11, fontWeight:700, color:'#7A8BAA', textAlign:'left', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none', borderBottom:'1px solid #1C2E4A' };
  const tdStyle: React.CSSProperties = { padding:'10px 12px', fontSize:12, color:'#fff', borderBottom:'1px solid rgba(28,46,74,0.5)' };

  return (
    <div style={{ background:'#070D1A', minHeight:'100vh', color:'#fff', fontFamily:"'Inter',system-ui,sans-serif", padding:'32px clamp(16px,4vw,48px) 64px' }}>
      <div style={{ maxWidth:1400, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
          <Link href="/dashboard" style={{ fontSize:12, color:'#4F6FFA', textDecoration:'none' }}>← Dashboard</Link>
          <div style={{ flex:1 }} />
          <div style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, background:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.25)', letterSpacing:1, textTransform:'uppercase' }}>
            Admin Console
          </div>
          <Link href="/admin/promo-codes" style={{ height:34, padding:'0 16px', borderRadius:9, background:'#0E1628', border:'1px solid #1C2E4A', color:'#7A8BAA', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center' }}>🎟️ Promo Codes</Link>
          <Link href="/admin/ledger" style={{ height:34, padding:'0 16px', borderRadius:9, background:'#0E1628', border:'1px solid #1C2E4A', color:'#7A8BAA', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center' }}>📒 Ledger</Link>
          <button onClick={load} disabled={loading}
            style={{ height:34, padding:'0 16px', borderRadius:9, background:'#0E1628', border:'1px solid #1C2E4A', color:'#7A8BAA', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? '…' : '↺ Refresh'}
          </button>
        </div>

        <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>
          SignalGenie Admin
        </div>
        {data && <div style={{ fontSize:12, color:'#7A8BAA', marginBottom:28 }}>Last refreshed: {new Date(data.generated_at).toLocaleString('en-IN')}</div>}

        {error && (
          <div style={{ background:'rgba(255,59,92,0.07)', border:'1px solid rgba(255,59,92,0.25)', borderRadius:12, padding:'14px 18px', color:'#FF3B5C', marginBottom:24 }}>
            ❌ {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ color:'#7A8BAA', fontSize:14 }}>Loading admin data…</div>
        )}

        {s && (
          <>
            {/* Summary KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
              {([
                { label:'Total Users',       val: String(s.total_users),       sub: `${s.confirmed} confirmed`, accent: undefined as string | undefined },
                { label:'Active (7 days)',   val: String(s.active_7d),         sub: `of ${s.total_users} total`, accent: undefined as string | undefined },
                { label:'Total Revenue',     val: fmt(s.total_revenue_paise / 100), sub: `${s.total_payments} payments`, accent: '#00D4A0' },
                { label:'Revenue (30d)',     val: fmt(s.revenue_30d_paise / 100), sub: 'last 30 days', accent: '#00D4A0' },
                { label:'India Invested',    val: fmt(s.total_india_invested), sub: `${s.total_holdings} holdings`, accent: undefined as string | undefined },
                { label:'US Invested',       val: `$${(s.total_us_invested).toLocaleString('en-US',{maximumFractionDigits:0})}`, sub: `${s.total_portfolios} portfolios`, accent: undefined as string | undefined },
                { label:'RSU / ESPP Grants', val: String(s.total_rsu_grants),  sub: 'across all users', accent: undefined as string | undefined },
              ]).map(k => (
                <div key={k.label} style={card}>
                  <div style={{ fontSize:11, color:'#7A8BAA', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</div>
                  <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.5, color: k.accent ?? '#fff' }}>{k.val}</div>
                  <div style={{ fontSize:11, color:'#3A4E6A', marginTop:4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Plan distribution */}
            <div style={{ ...card, marginBottom:24 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Plan Distribution</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {(['admin','elite','pro','starter','free'] as const).map(p => {
                  const n = s.plan_dist[p] ?? 0;
                  const pct = s.total_users > 0 ? ((n / s.total_users) * 100).toFixed(0) : '0';
                  return (
                    <div key={p} style={{ background: PLAN_BG[p], border:`1px solid ${PLAN_COLOR[p]}33`, borderRadius:10, padding:'10px 16px', minWidth:100 }}>
                      <div style={{ fontSize:10, fontWeight:800, color: PLAN_COLOR[p], textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>{p}</div>
                      <div style={{ fontSize:22, fontWeight:900 }}>{n}</div>
                      <div style={{ fontSize:10, color:'#7A8BAA' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent payments */}
            <div style={{ ...card, marginBottom:24, padding:0, overflowX:'auto' }}>
              <div style={{ padding:'14px 18px', fontSize:13, fontWeight:700, borderBottom:'1px solid #1C2E4A' }}>
                Recent Payments {data && `(${data.payments.length})`}
              </div>
              {data && data.payments.length === 0 && (
                <div style={{ padding:'24px 18px', color:'#3A4E6A', fontSize:12, textAlign:'center' }}>No payments yet</div>
              )}
              {data && data.payments.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:760 }}>
                  <thead>
                    <tr>
                      {['Email','Plan','Amount','Discount','Promo Code','Date'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map(p => (
                      <tr key={p.id}>
                        <td style={tdStyle}>{p.email}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:10, background: PLAN_BG[p.plan] ?? 'transparent', color: PLAN_COLOR[p.plan] ?? '#fff', textTransform:'uppercase' }}>{p.plan}</span>
                          <span style={{ fontSize:10, color:'#7A8BAA', marginLeft:6 }}>{p.billing}</span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight:700, color:'#00D4A0' }}>₹{(p.amount / 100).toLocaleString('en-IN', { maximumFractionDigits:0 })}</td>
                        <td style={tdStyle}>{p.discount_pct > 0 ? `${p.discount_pct}%` : '—'}</td>
                        <td style={{ ...tdStyle, fontFamily:'monospace' }}>{p.promo_code ?? '—'}</td>
                        <td style={{ ...tdStyle, color:'#7A8BAA' }}>{rel(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Filters */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email…"
                style={{ height:36, padding:'0 12px', borderRadius:9, background:'#0E1628', border:'1px solid #1C2E4A', color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', minWidth:220 }}/>
              <select value={planFlt} onChange={e => setPlanFlt(e.target.value)}
                style={{ height:36, padding:'0 10px', borderRadius:9, background:'#0E1628', border:'1px solid #1C2E4A', color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none' }}>
                <option value="all">All plans</option>
                <option value="admin">Admin</option>
                <option value="elite">Elite</option>
                <option value="pro">Pro</option>
                <option value="starter">Starter</option>
                <option value="free">Free</option>
              </select>
              <div style={{ marginLeft:'auto', fontSize:12, color:'#7A8BAA', alignSelf:'center' }}>
                {filtered.length} user{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* User table */}
            <div style={{ ...card, padding:0, overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead>
                  <tr>
                    {([
                      ['email',          'Email'         ],
                      ['plan',           'Plan'          ],
                      ['created_at',     'Joined'        ],
                      ['last_active',    'Last Active'   ],
                      ['india_holdings', 'India Holdings'],
                      ['us_holdings',    'US Holdings'   ],
                      ['india_invested', 'India Invested'],
                      ['us_invested',    'US Invested'   ],
                      ['rsu_grants',     'RSU / ESPP'    ],
                    ] as [keyof UserRow, string][]).map(([col, label]) => (
                      <th key={col} style={thStyle} onClick={() => toggleSort(col)}>
                        {label}
                        {sort.col === col ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
                      </th>
                    ))}
                    <th style={{ ...thStyle, cursor:'default' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{ background: FOUNDERS.includes(u.email.toLowerCase()) ? 'rgba(167,139,250,0.04)' : 'transparent' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{u.email}</div>
                        <div style={{ fontSize:10, color:'#3A4E6A' }}>{u.id.slice(0,8)}…</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:10, background: PLAN_BG[u.plan] ?? 'transparent', color: PLAN_COLOR[u.plan] ?? '#fff', border:`1px solid ${PLAN_COLOR[u.plan] ?? '#fff'}33`, textTransform:'uppercase', letterSpacing:0.5 }}>
                          {u.plan}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color:'#7A8BAA' }}>{rel(u.created_at)}</td>
                      <td style={{ ...tdStyle, color:'#7A8BAA' }} title={u.last_sign_in ? `Last login: ${rel(u.last_sign_in)}` : 'Never logged in'}>{rel(u.last_active)}</td>
                      <td style={{ ...tdStyle, textAlign:'center' }}>{u.india_holdings || '—'}</td>
                      <td style={{ ...tdStyle, textAlign:'center' }}>{u.us_holdings || '—'}</td>
                      <td style={tdStyle}>{u.india_invested > 0 ? fmt(u.india_invested) : '—'}</td>
                      <td style={tdStyle}>{u.us_invested > 0 ? `$${u.us_invested.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—'}</td>
                      <td style={{ ...tdStyle, textAlign:'center' }}>{u.rsu_grants || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8,
                          background: u.confirmed ? 'rgba(0,212,160,0.1)' : 'rgba(255,59,92,0.1)',
                          color: u.confirmed ? '#00D4A0' : '#FF3B5C',
                          border: `1px solid ${u.confirmed ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}` }}>
                          {u.confirmed ? '✓ Active' : 'Unconfirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} style={{ ...tdStyle, textAlign:'center', color:'#3A4E6A', padding:32 }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize:11, color:'#3A4E6A', marginTop:16 }}>
              Invested amounts = cost basis (qty × avg_price) — not current market value. · Co-founders highlighted in purple.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
