'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';
import PlaidLinkButton from '@/components/PlaidLinkButton';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface BrokerConnection {
  id: string; broker_name: string; institution_name: string | null;
  last_synced_at: string | null; created_at: string;
}

interface AngelConn {
  client_id: string; expires_at: string;
  last_synced_at: string | null; holdings_count: number;
}

const INDIA_BROKERS = [
  { id:'zerodha', name:'Zerodha', sub:"Kite · India's largest broker", color:'#387ED1', soon:true },
  { id:'upstox',  name:'Upstox',  sub:'Pro · Ratan Tata backed',       color:'#6600CC', soon:true },
];

export default function BrokersPage() {
  const { session } = usePortfolio();

  // Plaid (US)
  const [connections,  setConnections]  = useState<BrokerConnection[]>([]);
  const [syncing,      setSyncing]      = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [msg,          setMsg]          = useState<string | null>(null);

  // Angel One
  const [angelConn,    setAngelConn]    = useState<AngelConn | null>(null);
  const [angelLoading, setAngelLoading] = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [aClientcode,  setAClientcode]  = useState('');
  const [aPassword,    setAPassword]    = useState('');
  const [aTotp,        setATotp]        = useState('');
  const [aConnecting,  setAConnecting]  = useState(false);
  const [aSyncing,     setASyncing]     = useState(false);
  const [aErr,         setAErr]         = useState<string | null>(null);

  const token = session?.access_token ?? null;
  const authHdr = token ? { Authorization: `Bearer ${token}` } : null;

  // Load Plaid connections
  const fetchConnections = useCallback(async () => {
    const h = await fetch(`${SUPA_URL}/rest/v1/broker_connections?select=*&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (h.ok) setConnections(await h.json());
  }, []);

  // Load Angel One connection status
  const fetchAngel = useCallback(async () => {
    if (!authHdr) { setAngelLoading(false); return; }
    setAngelLoading(true);
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/angel_connections?select=client_id,expires_at,last_synced_at,holdings_count`, {
        headers: { apikey: SUPA_KEY, ...authHdr },
      });
      const rows = r.ok ? await r.json() as AngelConn[] : [];
      setAngelConn(rows[0] ?? null);
    } finally { setAngelLoading(false); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchConnections(); fetchAngel(); }, [fetchConnections, fetchAngel]);

  // ─── Plaid handlers ─────────────────────────────────────────────────────────
  async function handlePlaidSuccess(itemId: string, institutionName: string) {
    setMsg(`✅ ${institutionName} connected!`);
    await fetchConnections();
  }

  async function syncPlaid(connectionId: string, name?: string) {
    setSyncing(connectionId);
    setMsg(null);
    try {
      const r = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setMsg(`✅ Synced ${d.synced} holdings from ${name ?? 'broker'}`);
      await fetchConnections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally { setSyncing(null); }
  }

  async function deletePlaid(id: string) {
    if (!confirm('Remove this connection? Holdings data will be deleted.')) return;
    await fetch(`${SUPA_URL}/rest/v1/plaid_holdings?broker_connection_id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    await fetch(`${SUPA_URL}/rest/v1/broker_connections?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    setConnections(prev => prev.filter(c => c.id !== id));
  }

  // ─── Angel One handlers ──────────────────────────────────────────────────────
  async function connectAngel() {
    if (!authHdr) return;
    if (!aClientcode.trim() || !aPassword.trim() || !aTotp.trim()) {
      setAErr('All 3 fields required'); return;
    }
    setAConnecting(true); setAErr(null);
    try {
      const r = await fetch('/api/broker/angel/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({ clientcode: aClientcode.trim(), password: aPassword.trim(), totp: aTotp.trim() }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setAErr(d.error ?? 'Connection failed'); return; }
      setShowModal(false);
      setAClientcode(''); setAPassword(''); setATotp('');
      await fetchAngel();
      // Auto-sync after connect
      await syncAngel(true);
    } finally { setAConnecting(false); }
  }

  async function syncAngel(silent = false) {
    if (!authHdr) return;
    setASyncing(true); if (!silent) setAErr(null);
    try {
      const r = await fetch('/api/broker/angel/sync', {
        method: 'POST', headers: { ...authHdr },
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        if (d.expired) { setAErr('Session expired — click Reconnect'); }
        else { setAErr(d.error ?? 'Sync failed'); }
        return;
      }
      setMsg(`✅ Synced ${d.synced} holdings from Angel One`);
      await fetchAngel();
    } finally { setASyncing(false); }
  }

  async function disconnectAngel() {
    if (!authHdr) return;
    if (!confirm('Disconnect Angel One? Synced holdings will be deleted.')) return;
    await fetch('/api/broker/angel/disconnect', { method: 'DELETE', headers: authHdr });
    setAngelConn(null);
    setMsg('Angel One disconnected');
  }

  const angelExpired = angelConn ? new Date(angelConn.expires_at) < new Date() : false;

  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Connect Broker</div>
        <div style={{ fontSize: 13, color: 'var(--dim)' }}>Auto-sync holdings. Read-only. Tokens AES-256 encrypted.</div>
      </div>

      {/* Status messages */}
      {msg   && <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.3)', fontSize:13, color:'var(--grn)', display:'flex', justifyContent:'space-between' }}>{msg}<button onClick={() => setMsg(null)} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer' }}>✕</button></div>}
      {error && <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background:'rgba(255,59,92,0.1)', border:'1px solid rgba(255,59,92,0.3)', fontSize:13, color:'var(--red)', display:'flex', justifyContent:'space-between' }}>⚠ {error}<button onClick={() => setError(null)} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer' }}>✕</button></div>}

      {/* ── Angel One ─────────────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:'22px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#FF6B35,#E8552A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>A1</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>Angel One</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>SmartAPI · India · Read-only holdings sync</div>
            </div>
          </div>

          {angelLoading ? (
            <div style={{ fontSize:12, color:'var(--dim)' }}>Loading…</div>
          ) : angelConn ? (
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ fontSize:11, color:'var(--dim)' }}>
                {angelConn.client_id} · {angelConn.holdings_count} holdings
                {angelConn.last_synced_at && <> · synced {new Date(angelConn.last_synced_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}</>}
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background: angelExpired ? 'rgba(255,59,92,0.12)' : 'rgba(0,212,160,0.12)', border:`1px solid ${angelExpired ? 'rgba(255,59,92,0.3)' : 'rgba(0,212,160,0.3)'}`, color: angelExpired ? 'var(--red)' : 'var(--grn)' }}>
                {angelExpired ? '⚠ Session expired' : '● Live'}
              </span>
              <button onClick={() => syncAngel()} disabled={aSyncing || angelExpired}
                style={{ height:32, padding:'0 14px', borderRadius:8, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: aSyncing ? 0.5 : 1 }}>
                {aSyncing ? '⏳ Syncing…' : '🔄 Sync'}
              </button>
              <button onClick={() => setShowModal(true)}
                style={{ height:32, padding:'0 14px', borderRadius:8, background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.25)', color:'var(--ylw)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Reconnect
              </button>
              <button onClick={disconnectAngel}
                style={{ height:32, padding:'0 12px', borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => setShowModal(true)}
              style={{ height:38, padding:'0 22px', borderRadius:10, background:'linear-gradient(135deg,#FF6B35,#E8552A)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
              Connect Angel One
            </button>
          )}
        </div>

        {aErr && <div style={{ marginTop:12, padding:'8px 14px', borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', fontSize:12, color:'var(--red)' }}>⚠ {aErr}</div>}

        <div style={{ marginTop:14, fontSize:11, color:'var(--dim2)', display:'flex', gap:8, flexWrap:'wrap' }}>
          <span>🔒 Password used once for auth, never stored</span>
          <span>·</span>
          <span>Session token encrypted AES-256-GCM</span>
          <span>·</span>
          <span>Expires midnight IST daily — reconnect to refresh</span>
        </div>
      </div>

      {/* ── India Coming Soon ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>Coming Soon</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
          {INDIA_BROKERS.map(b => (
            <div key={b.id} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:12, padding:'16px 18px', opacity:0.5, position:'relative' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:`${b.color}22`, border:`1px solid ${b.color}44`, marginBottom:8 }}/>
              <div style={{ fontSize:14, fontWeight:800 }}>{b.name}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{b.sub}</div>
              <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'rgba(255,184,0,0.12)', border:'1px solid rgba(255,184,0,0.3)', color:'var(--ylw)' }}>Soon</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── US Broker (Plaid) ─────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:16, padding:'22px 24px', marginBottom:24 }}>
        <div style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>US Broker (Plaid)</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:14 }}>Connect E*TRADE, Schwab, Fidelity or any US broker</div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <PlaidLinkButton label="Connect US Broker" onSuccess={handlePlaidSuccess} onError={setError} />
          <span style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.2)', color:'var(--grn)', fontWeight:700 }}>🔒 AES-256</span>
        </div>
        {connections.length > 0 && (
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
            {connections.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--surf2)', borderRadius:10, border:'1px solid var(--bdr)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{c.institution_name ?? c.broker_name}</div>
                  <div style={{ fontSize:11, color:'var(--dim)' }}>{c.last_synced_at ? `Synced ${new Date(c.last_synced_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}` : 'Never synced'}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => syncPlaid(c.id, c.institution_name ?? c.broker_name)} disabled={syncing === c.id}
                    style={{ height:30, padding:'0 12px', borderRadius:7, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {syncing === c.id ? '⏳' : '🔄 Sync'}
                  </button>
                  <button onClick={() => deletePlaid(c.id)}
                    style={{ height:30, padding:'0 10px', borderRadius:7, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)' }}>
        ⚠ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Broker sync for portfolio visibility only · Not investment advice · DYOR
      </div>

      {/* ── Angel One Connect Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:20, padding:'28px 28px', width:'100%', maxWidth:420, boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:900 }}>Connect Angel One</div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>SmartAPI · Read-only portfolio sync</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ background:'rgba(255,184,0,0.07)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>
              🔒 Your password is used <strong style={{ color:'var(--txt)' }}>once</strong> for authentication and immediately discarded. Only the session token (valid until midnight IST) is stored, AES-256 encrypted.
            </div>

            {[
              { label:'Client ID', placeholder:'e.g. A123456', value:aClientcode, set:setAClientcode, type:'text' },
              { label:'Login Password', placeholder:'Angel One password', value:aPassword, set:setAPassword, type:'password' },
              { label:'TOTP (6 digits)', placeholder:'From authenticator app', value:aTotp, set:setATotp, type:'text', maxLength:6 },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--dim)', marginBottom:5 }}>{f.label}</div>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  maxLength={(f as {maxLength?: number}).maxLength}
                  style={{ width:'100%', height:40, borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14, padding:'0 12px', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
            ))}

            {aErr && <div style={{ marginBottom:14, padding:'8px 12px', borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', fontSize:12, color:'var(--red)' }}>⚠ {aErr}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={connectAngel} disabled={aConnecting}
                style={{ flex:1, height:42, borderRadius:10, background:'linear-gradient(135deg,#FF6B35,#E8552A)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', border:'none', fontFamily:'inherit', opacity: aConnecting ? 0.6 : 1 }}>
                {aConnecting ? '⏳ Connecting…' : 'Connect & Sync'}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ height:42, padding:'0 18px', borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
            </div>

            <div style={{ marginTop:14, fontSize:10, color:'var(--dim2)', lineHeight:1.6 }}>
              Don't have SmartAPI access? Go to Angel One → My Profile → API Access → Enable SmartAPI and note your Client ID. TOTP setup: link an authenticator app (Google Authenticator) in Angel One security settings.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
