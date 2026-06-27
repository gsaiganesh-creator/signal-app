'use client';
import { useState, useEffect, useCallback } from 'react';
import PlaidLinkButton from '@/components/PlaidLinkButton';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface BrokerConnection {
  id: string; broker_name: string; institution_name: string | null;
  last_synced_at: string | null; created_at: string;
}
interface PlaidHolding {
  symbol: string; qty: number; cost_basis: number | null;
  institution_price: number | null; institution_value: number | null;
  vested_qty: number | null; unvested_qty: number | null;
  security_type: string; account_name: string | null;
}

const INDIA_BROKERS = [
  { id:'zerodha', name:'Zerodha',   sub:'Kite · India\'s largest broker',   logo:'🟩', color:'#387ED1', soon:true },
  { id:'upstox',  name:'Upstox',    sub:'Pro · Ratan Tata backed',           logo:'🟪', color:'#6600CC', soon:true },
  { id:'angel',   name:'Angel One', sub:'SmartAPI · Full suite',             logo:'🟧', color:'#E8552A', soon:true },
];

export default function BrokersPage() {
  const [connections,  setConnections]  = useState<BrokerConnection[]>([]);
  const [holdings,     setHoldings]     = useState<Record<string, PlaidHolding[]>>({});
  const [syncing,      setSyncing]      = useState<string | null>(null);
  const [expandedConn, setExpandedConn] = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [msg,          setMsg]          = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    const h = await fetch(`${SUPA_URL}/rest/v1/broker_connections?select=*&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (h.ok) setConnections(await h.json());
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  async function handlePlaidSuccess(itemId: string, institutionName: string) {
    setMsg(`✅ ${institutionName} connected! Syncing holdings…`);
    await fetchConnections();
    // find new connection and sync
    setTimeout(async () => {
      const r = await fetch(`${SUPA_URL}/rest/v1/broker_connections?plaid_item_id=eq.${itemId}&select=id`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      });
      const [conn] = await r.json();
      if (conn) await syncHoldings(conn.id, institutionName);
    }, 1000);
  }

  async function syncHoldings(connectionId: string, name?: string) {
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
      setMsg(`✅ Synced ${d.synced} holding${d.synced !== 1 ? 's' : ''} from ${name ?? 'broker'}`);
      await fetchConnections();
      await fetchHoldings(connectionId);
      setExpandedConn(connectionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  }

  async function fetchHoldings(connectionId: string) {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/plaid_holdings?broker_connection_id=eq.${connectionId}&select=*&order=symbol.asc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
    );
    if (r.ok) {
      const data: PlaidHolding[] = await r.json();
      setHoldings(prev => ({ ...prev, [connectionId]: data }));
    }
  }

  async function toggleExpand(id: string) {
    if (expandedConn === id) { setExpandedConn(null); return; }
    setExpandedConn(id);
    if (!holdings[id]) await fetchHoldings(id);
  }

  async function deleteConnection(id: string) {
    if (!confirm('Remove this broker connection? Holdings data will also be deleted.')) return;
    await fetch(`${SUPA_URL}/rest/v1/plaid_holdings?broker_connection_id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
    });
    await fetch(`${SUPA_URL}/rest/v1/broker_connections?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
    });
    setConnections(prev => prev.filter(c => c.id !== id));
    setHoldings(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (expandedConn === id) setExpandedConn(null);
  }

  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.07),rgba(0,212,160,0.04))', border:'1px solid rgba(23,64,245,0.15)', borderRadius:20, padding:'28px 32px', marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--bluL)', textTransform:'uppercase', marginBottom:8 }}>Broker Connect</div>
        <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.8, lineHeight:1.2, marginBottom:10 }}>
          Auto-sync your US broker<br/>
          <span style={{ color:'var(--grn)' }}>holdings &amp; cost basis.</span>
        </div>
        <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, marginBottom:18, maxWidth:520 }}>
          Connect E*TRADE, Schwab, Fidelity or any US broker via Plaid. SIGNAL auto-imports your holdings, cost basis, and vested RSU quantity — no manual entry needed. Access tokens are AES-256 encrypted.
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <PlaidLinkButton
            label="Connect US Broker (Plaid)"
            onSuccess={handlePlaidSuccess}
            onError={setError}
          />
          <div style={{ fontSize:11, color:'var(--dim)', display:'flex', gap:8 }}>
            <span style={{ padding:'4px 10px', borderRadius:6, background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.2)', color:'var(--grn)', fontWeight:700 }}>🔒 AES-256</span>
            <span style={{ padding:'4px 10px', borderRadius:6, background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)', color:'var(--ylw)', fontWeight:700 }}>Read-only</span>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {msg   && <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.3)', fontSize:13, color:'var(--grn)' }}>{msg}</div>}
      {error && <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background:'rgba(255,59,92,0.1)', border:'1px solid rgba(255,59,92,0.3)', fontSize:13, color:'var(--red)' }}>⚠ {error} <button onClick={() => setError(null)} style={{ marginLeft:8, background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:12 }}>✕</button></div>}

      {/* Connected brokers */}
      {connections.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--dim)', marginBottom:12, letterSpacing:1, textTransform:'uppercase' }}>Connected Accounts</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {connections.map(c => (
              <div key={c.id} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14 }}>
                <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                     onClick={() => toggleExpand(c.id)}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,rgba(23,64,245,0.15),rgba(79,111,250,0.1))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏦</div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800 }}>{c.institution_name ?? c.broker_name}</div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>
                        {c.last_synced_at ? `Last synced ${new Date(c.last_synced_at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}` : 'Never synced'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={e => { e.stopPropagation(); syncHoldings(c.id, c.institution_name ?? c.broker_name); }}
                      style={{ height:32, padding:'0 14px', borderRadius:8, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.25)', color:'var(--bluL)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: syncing === c.id ? 0.5 : 1 }}>
                      {syncing === c.id ? '⏳ Syncing…' : '🔄 Sync'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteConnection(c.id); }}
                      style={{ height:32, padding:'0 12px', borderRadius:8, background:'rgba(255,59,92,0.08)', border:'1px solid rgba(255,59,92,0.2)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Remove
                    </button>
                    <span style={{ color:'var(--dim)', fontSize:16 }}>{expandedConn === c.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Holdings table */}
                {expandedConn === c.id && (
                  <div style={{ borderTop:'1px solid var(--bdr)', padding:'16px 20px' }}>
                    {!holdings[c.id] ? (
                      <div style={{ fontSize:13, color:'var(--dim)', textAlign:'center', padding:'12px 0' }}>Loading…</div>
                    ) : holdings[c.id].length === 0 ? (
                      <div style={{ fontSize:13, color:'var(--dim)', textAlign:'center', padding:'12px 0' }}>No holdings found. Click Sync to fetch.</div>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                        <thead>
                          <tr style={{ color:'var(--dim)', fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>
                            <th style={{ textAlign:'left',  padding:'6px 8px' }}>Symbol</th>
                            <th style={{ textAlign:'right', padding:'6px 8px' }}>Qty</th>
                            <th style={{ textAlign:'right', padding:'6px 8px' }}>Vested</th>
                            <th style={{ textAlign:'right', padding:'6px 8px' }}>Cost Basis</th>
                            <th style={{ textAlign:'right', padding:'6px 8px' }}>Price</th>
                            <th style={{ textAlign:'right', padding:'6px 8px' }}>Value</th>
                            <th style={{ textAlign:'left',  padding:'6px 8px' }}>Account</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holdings[c.id].map((h, i) => {
                            const gain = h.institution_price && h.cost_basis
                              ? ((h.institution_price - h.cost_basis) / h.cost_basis * 100) : null;
                            return (
                              <tr key={i} style={{ borderTop:'1px solid var(--bdr)' }}>
                                <td style={{ padding:'8px 8px', fontWeight:700 }}>{h.symbol}</td>
                                <td style={{ padding:'8px 8px', textAlign:'right', color:'var(--txt)' }}>{h.qty.toLocaleString()}</td>
                                <td style={{ padding:'8px 8px', textAlign:'right', color: h.unvested_qty ? 'var(--dim)' : 'var(--grn)' }}>
                                  {h.vested_qty != null ? h.vested_qty.toLocaleString() : '—'}
                                  {h.unvested_qty != null && h.unvested_qty > 0 && (
                                    <span style={{ fontSize:10, color:'var(--dim)', marginLeft:4 }}>+{h.unvested_qty} unvested</span>
                                  )}
                                </td>
                                <td style={{ padding:'8px 8px', textAlign:'right', color:'var(--dim)' }}>
                                  {h.cost_basis != null ? `$${h.cost_basis.toFixed(2)}` : '—'}
                                </td>
                                <td style={{ padding:'8px 8px', textAlign:'right' }}>
                                  {h.institution_price != null ? `$${h.institution_price.toFixed(2)}` : '—'}
                                  {gain != null && (
                                    <span style={{ fontSize:10, marginLeft:4, color: gain >= 0 ? 'var(--grn)' : 'var(--red)', fontWeight:700 }}>
                                      {gain >= 0 ? '+' : ''}{gain.toFixed(1)}%
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding:'8px 8px', textAlign:'right', fontWeight:700 }}>
                                  {h.institution_value != null ? `$${h.institution_value.toLocaleString('en-US', { maximumFractionDigits:0 })}` : '—'}
                                </td>
                                <td style={{ padding:'8px 8px', color:'var(--dim)', fontSize:11 }}>{h.account_name ?? '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* India brokers (coming soon) */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--dim)', marginBottom:12, letterSpacing:1, textTransform:'uppercase' }}>India Brokers — Coming Soon</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
          {INDIA_BROKERS.map(b => (
            <div key={b.id} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 20px', opacity:0.55, position:'relative' }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{b.logo}</div>
              <div style={{ fontSize:14, fontWeight:800 }}>{b.name}</div>
              <div style={{ fontSize:11, color:'var(--dim)', marginTop:3 }}>{b.sub}</div>
              <div style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'rgba(255,184,0,0.12)', border:'1px solid rgba(255,184,0,0.3)', color:'var(--ylw)' }}>Soon</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:8 }}>
        ⚠ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Broker sync is for portfolio visibility only · Not investment advice · DYOR
      </div>
    </>
  );
}
