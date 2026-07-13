'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { usePortfolio } from '@/lib/portfolio-context';
import { usePlan } from '@/lib/use-plan';

const SUPA  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Strategy {
  id: string; name: string; type: string;
  capital: number; rsi_low: number; rsi_high: number;
  sl_pct: number; target_pct: number;
  started_at: string; trial_days: number; active: boolean;
  algo_type?: string;
}

const ALGO_PRESETS = [
  { id:'rsi_ema',      icon:'📈', name:'RSI + EMA Crossover',     category:'Momentum',       rsi_low:35, rsi_high:65, sl_pct:2.5, target_pct:6,  desc:'Buy when RSI crosses 35 + price above EMA20. Classic swing entry.' },
  { id:'dual_ema',     icon:'🎯', name:'Dual EMA Trend Follower',  category:'Trend Following', rsi_low:40, rsi_high:70, sl_pct:3,   target_pct:8,  desc:'EMA9 × EMA21 crossover. Rides medium-term trends for 2–6 weeks.' },
  { id:'mean_rev',     icon:'🔄', name:'Mean Reversion BB',        category:'Mean Reversion', rsi_low:30, rsi_high:70, sl_pct:2,   target_pct:4,  desc:'Buy at lower Bollinger Band, sell at upper. Best in range-bound markets.' },
  { id:'vwap',         icon:'⚡', name:'VWAP Intraday Scalper',    category:'Intraday',       rsi_low:40, rsi_high:60, sl_pct:1,   target_pct:2,  desc:'Trade breakouts above/below VWAP with tight SL. Short holding period.' },
  { id:'sector_rot',   icon:'🌐', name:'Sector Rotation Engine',   category:'Macro/Rotation', rsi_low:45, rsi_high:65, sl_pct:4,   target_pct:10, desc:'Rotate into leading sectors monthly based on relative strength.' },
  { id:'breakout',     icon:'🚀', name:'Breakout Momentum',        category:'Breakout',       rsi_low:50, rsi_high:80, sl_pct:3,   target_pct:8,  desc:'Buy 52W high breakouts with volume surge. High win rate in bull markets.' },
] as const;

interface Trade {
  id: string; strategy_id: string;
  symbol: string; signal: string;
  entry_price: number; qty: number; entry_at: string;
  exit_price: number | null; exit_at: string | null;
  pl: number | null; status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authHeader(token: string) {
  return { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getPrice(sym: string): Promise<number | null> {
  try {
    const r = await fetch(`/api/prices?symbol=${encodeURIComponent(sym.includes('.') ? sym : sym + '.NS')}`);
    const d = await r.json() as { price?: number };
    return d.price ?? null;
  } catch { return null; }
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function fmtINR(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function equityCurve(trades: Trade[], capital: number): { path: string; endY: number; lastPL: number } {
  const closed = [...trades]
    .filter(t => t.pl != null && t.exit_at)
    .sort((a, b) => new Date(a.exit_at!).getTime() - new Date(b.exit_at!).getTime());

  const W = 600; const H = 90; const BASE = 80;
  let cum = 0;
  const points: { x: number; y: number }[] = [{ x: 0, y: BASE }];

  closed.forEach((t, i) => {
    cum += (t.pl ?? 0);
    const pct = (cum / capital) * 100;
    const x   = Math.round(((i + 1) / Math.max(closed.length, 1)) * W);
    const y   = Math.max(5, Math.min(H - 5, BASE - pct * 2));
    points.push({ x, y });
  });

  if (points.length === 1) points.push({ x: W, y: BASE });
  else points[points.length - 1].x = W;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return { path, endY: points[points.length - 1].y, lastPL: cum };
}

// ─── Modals ───────────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%', height:40, borderRadius:9, background:'var(--surf2)',
  border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13,
  padding:'0 12px', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
};

function AlgoPickerModal({ token, userId, existing, onDone, onClose }: {
  token: string; userId: string; existing: string[]; onDone(): void; onClose(): void;
}) {
  const [selected,      setSelected] = useState<Set<string>>(new Set());
  const [capital,       setCap]      = useState('100000');
  const [busy,          setBusy]     = useState(false);
  const [err,           setErr]      = useState('');

  // Custom strategy fields
  const [customName,    setCName]    = useState('');
  const [customRsiL,    setCRsiL]    = useState('35');
  const [customRsiH,    setCRsiH]    = useState('65');
  const [customSl,      setCSl]      = useState('2.5');
  const [customTgt,     setCTgt]     = useState('6');
  const [customEma,     setCEma]     = useState<'none'|'ema20'|'ema50'|'ema200'>('ema20');

  const customSelected = selected.has('custom');
  const totalSelected  = selected.size;

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function activate() {
    if (totalSelected === 0) { setErr('Select at least one strategy'); return; }
    if (customSelected && !customName.trim()) { setErr('Enter a name for your custom strategy'); return; }
    setBusy(true); setErr('');

    const ops: Promise<Response>[] = [];

    // Pre-built algos
    ALGO_PRESETS.filter(a => selected.has(a.id)).forEach(a =>
      ops.push(fetch(`${SUPA}/rest/v1/paper_strategies`, {
        method: 'POST',
        headers: { ...authHeader(token), Prefer: 'return=minimal' },
        body: JSON.stringify({
          name: a.name, user_id: userId, algo_type: a.id,
          capital: +capital, rsi_low: a.rsi_low, rsi_high: a.rsi_high,
          sl_pct: a.sl_pct, target_pct: a.target_pct,
        }),
      }))
    );

    // Custom strategy
    if (customSelected) {
      ops.push(fetch(`${SUPA}/rest/v1/paper_strategies`, {
        method: 'POST',
        headers: { ...authHeader(token), Prefer: 'return=minimal' },
        body: JSON.stringify({
          name: customName.trim(), user_id: userId, algo_type: `custom_${customEma}`,
          capital: +capital,
          rsi_low: +customRsiL, rsi_high: +customRsiH,
          sl_pct: +customSl, target_pct: +customTgt,
        }),
      }));
    }

    const results = await Promise.all(ops);
    setBusy(false);
    if (results.every(r => r.ok)) onDone();
    else setErr('Some strategies failed to create. Check Supabase.');
  }

  const EMA_LABELS: Record<string, string> = {
    none: 'No EMA filter',
    ema20: 'Price > EMA 20 (short-term)',
    ema50: 'Price > EMA 50 (medium-term)',
    ema200: 'Price > EMA 200 (long-term uptrend only)',
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', padding:16 }}>
      <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:20, padding:28, width:'min(720px,95vw)', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ fontSize:18, fontWeight:900 }}>Select Strategies</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:20, cursor:'pointer', fontFamily:'inherit', lineHeight:1 }}>×</button>
        </div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:20 }}>Pick one or more — each runs independently with its own trade log and equity curve.</div>

        {/* Pre-built algo cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginBottom:12 }}>
          {ALGO_PRESETS.map(a => {
            const active  = selected.has(a.id);
            const running = existing.includes(a.id);
            return (
              <div key={a.id} onClick={() => !running && toggle(a.id)}
                style={{ padding:16, borderRadius:14, cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
                  background: active ? 'rgba(23,64,245,0.08)' : 'var(--surf2)',
                  border:`1.5px solid ${active ? 'var(--blu)' : 'var(--bdr)'}`,
                  transition:'border-color 0.15s,background 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:22 }}>{a.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{a.name}</div>
                    <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{a.category}</div>
                  </div>
                  {running
                    ? <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'rgba(0,212,160,0.12)', color:'var(--grn)', fontWeight:700 }}>ACTIVE</span>
                    : <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${active ? 'var(--blu)' : 'var(--bdr)'}`, background: active ? 'var(--blu)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {active && <span style={{ color:'#fff', fontSize:11, lineHeight:1 }}>✓</span>}
                      </div>
                  }
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5, marginBottom:8 }}>{a.desc}</div>
                <div style={{ display:'flex', gap:12, fontSize:10, color:'var(--dim)' }}>
                  <span>SL {a.sl_pct}%</span><span>T1 {a.target_pct}%</span><span>RSI {a.rsi_low}–{a.rsi_high}</span>
                </div>
              </div>
            );
          })}

          {/* Custom strategy card */}
          <div onClick={() => toggle('custom')}
            style={{ padding:16, borderRadius:14, cursor:'pointer',
              background: customSelected ? 'rgba(255,184,0,0.07)' : 'var(--surf2)',
              border:`1.5px dashed ${customSelected ? 'var(--ylw)' : 'var(--bdr)'}`,
              transition:'border-color 0.15s,background 0.15s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ fontSize:22 }}>⚙️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800 }}>Custom Strategy</div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>Your own rules</div>
              </div>
              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${customSelected ? 'var(--ylw)' : 'var(--bdr)'}`, background: customSelected ? 'var(--ylw)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {customSelected && <span style={{ color:'#000', fontSize:11, lineHeight:1 }}>✓</span>}
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5 }}>Set your own RSI range, EMA filter, SL and target. Auto-scanner applies your rules each morning.</div>
          </div>
        </div>

        {/* Custom strategy form — shown only when custom selected */}
        {customSelected && (
          <div style={{ padding:20, borderRadius:14, background:'rgba(255,184,0,0.05)', border:'1px solid rgba(255,184,0,0.2)', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--ylw)', marginBottom:14 }}>⚙️ Configure Custom Strategy</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>Strategy name</label>
                <input style={INP} value={customName} placeholder="e.g. My RSI + EMA200 Setup" onChange={e => setCName(e.target.value)} />
              </div>
              {[
                { lbl:'RSI Low (buy below)',  val:customRsiL, set:setCRsiL, ph:'35' },
                { lbl:'RSI High (sell above)', val:customRsiH, set:setCRsiH, ph:'65' },
                { lbl:'Stop Loss %',           val:customSl,   set:setCSl,   ph:'2.5' },
                { lbl:'Target %',              val:customTgt,  set:setCTgt,  ph:'6' },
              ].map(f => (
                <div key={f.lbl}>
                  <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>{f.lbl}</label>
                  <input style={INP} type="number" value={f.val} placeholder={f.ph} onChange={e => f.set(e.target.value)} />
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:8 }}>EMA trend filter</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(['none','ema20','ema50','ema200'] as const).map(v => (
                    <button key={v} onClick={() => setCEma(v)}
                      style={{ padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${customEma===v ? 'var(--ylw)' : 'var(--bdr)'}`, background: customEma===v ? 'rgba(255,184,0,0.12)' : 'var(--surf2)', color: customEma===v ? 'var(--ylw)' : 'var(--dim)' }}>
                      {EMA_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:6 }}>Virtual capital per strategy (₹)</label>
            <input style={{ ...INP, width:200 }} type="number" value={capital} onChange={e => setCap(e.target.value)} />
          </div>
        </div>

        {err && <div style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, height:42, borderRadius:10, background:'transparent', border:'1px solid var(--bdr)', color:'var(--dim)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={activate} disabled={busy || totalSelected === 0}
            style={{ flex:2, height:42, borderRadius:10, background: totalSelected > 0 ? 'var(--grn)' : 'var(--surf2)', border:'none', color: totalSelected > 0 ? '#000' : 'var(--dim)', fontSize:13, fontWeight:800, cursor: totalSelected > 0 ? 'pointer' : 'default', fontFamily:'inherit', transition:'background 0.15s' }}>
            {busy ? 'Activating…' : totalSelected > 0 ? `▶ Activate ${totalSelected} Strateg${totalSelected > 1 ? 'ies' : 'y'}` : 'Select strategies above'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTradeModal({ strategy, token, userId, onDone, onClose, initialSym = '', initialPrice = '', initialSignal = 'BUY' }: { strategy: Strategy; token: string; userId: string; onDone(): void; onClose(): void; initialSym?: string; initialPrice?: string; initialSignal?: 'BUY'|'SELL' }) {
  const [sym, setSym] = useState(initialSym);
  const [signal, setSig] = useState<'BUY'|'SELL'>(initialSignal);
  const [qty, setQty] = useState('10');
  const [price, setPrice] = useState(initialPrice);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function fetchPrice() {
    if (!sym.trim()) return;
    setFetching(true);
    const p = await getPrice(sym.trim().toUpperCase());
    if (p) setPrice(p.toFixed(2));
    else setErr('Could not fetch price — enter manually');
    setFetching(false);
  }

  async function submit() {
    if (!sym.trim() || !price || !qty) { setErr('Fill all fields'); return; }
    setBusy(true); setErr('');
    const r = await fetch(`${SUPA}/rest/v1/paper_trades`, {
      method: 'POST',
      headers: { ...authHeader(token), Prefer: 'return=minimal' },
      body: JSON.stringify({
        strategy_id: strategy.id, user_id: userId,
        symbol: sym.trim().toUpperCase().replace('.NS',''),
        signal, entry_price: +price, qty: +qty, status: 'OPEN',
      }),
    });
    setBusy(false);
    if (r.ok) onDone();
    else setErr('Failed to add trade.');
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)' }}>
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:18, padding:28, width:'min(400px,90vw)' }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Add Paper Trade</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom: initialSym ? 10 : 20 }}>{strategy.name} · Virtual only — no real orders placed</div>
        {initialSym && (
          <div style={{ background:'rgba(0,212,160,0.08)', border:'1px solid rgba(0,212,160,0.25)', borderRadius:9, padding:'8px 12px', marginBottom:16, display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <span>🧪</span>
            <span>Pre-filled from <strong>{initialSym}</strong> signal · Edit fields if needed</span>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {(['BUY','SELL'] as const).map(s => (
            <button key={s} onClick={() => setSig(s)}
              style={{ flex:1, height:38, borderRadius:9, border:`1px solid ${signal===s ? (s==='BUY'?'var(--grn)':'var(--red)') : 'var(--bdr)'}`, background: signal===s ? (s==='BUY'?'rgba(0,212,160,0.1)':'rgba(255,59,92,0.1)') : 'transparent', color: signal===s ? (s==='BUY'?'var(--grn)':'var(--red)') : 'var(--dim)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{s}</button>
          ))}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>NSE Symbol</label>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...INP, flex:1 }} value={sym} placeholder="e.g. RELIANCE" onChange={e => setSym(e.target.value)} onKeyDown={e => e.key==='Enter' && fetchPrice()}/>
            <button onClick={fetchPrice} disabled={fetching} style={{ height:40, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              {fetching ? '…' : 'Fetch'}
            </button>
          </div>
        </div>

        {[
          { lbl:'Entry price (₹)', val:price, set:setPrice, ph:'Auto-fetched or enter manually' },
          { lbl:'Quantity (shares)', val:qty, set:setQty, ph:'10' },
        ].map(f => (
          <div key={f.lbl} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>{f.lbl}</label>
            <input style={INP} type="number" value={f.val} placeholder={f.ph} onChange={e => f.set(e.target.value)} />
          </div>
        ))}

        {price && qty && <div style={{ fontSize:12, color:'var(--dim)', marginBottom:14 }}>Value: {fmtINR(+price * +qty)} · SL at {fmtINR(+price * (1 - strategy.sl_pct/100))} · T1 at {fmtINR(+price * (1 + strategy.target_pct/100))}</div>}

        {err && <div style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, height:40, borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ flex:2, height:40, borderRadius:9, background:signal==='BUY'?'var(--grn)':'var(--red)', border:'none', color: signal==='BUY'?'#000':'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            {busy ? 'Adding…' : `Paper ${signal}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseTradeModal({ trade, token, onDone, onClose }: { trade: Trade; token: string; onDone(): void; onClose(): void }) {
  const [price, setPrice] = useState('');
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function fetchCurrent() {
    setFetching(true);
    const p = await getPrice(trade.symbol);
    if (p) setPrice(p.toFixed(2));
    else setErr('Could not fetch — enter manually');
    setFetching(false);
  }

  async function close() {
    if (!price) { setErr('Enter exit price'); return; }
    const exitP = +price;
    const pl = (exitP - trade.entry_price) * trade.qty * (trade.signal === 'SELL' ? -1 : 1);
    const status = pl >= 0 ? 'WIN' : 'LOSS';
    setBusy(true);
    const r = await fetch(`${SUPA}/rest/v1/paper_trades?id=eq.${trade.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(token), Prefer: 'return=minimal' },
      body: JSON.stringify({ exit_price: exitP, exit_at: new Date().toISOString(), pl: +pl.toFixed(2), status }),
    });
    setBusy(false);
    if (r.ok) onDone();
    else setErr('Failed to close trade.');
  }

  const estPL = price ? ((+price - trade.entry_price) * trade.qty * (trade.signal==='SELL'?-1:1)) : null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)' }}>
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:18, padding:28, width:'min(360px,90vw)' }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Close Trade — {trade.symbol}</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginBottom:20 }}>Entry: {fmtINR(trade.entry_price)} × {trade.qty} shares</div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--dim)', display:'block', marginBottom:5 }}>Exit price (₹)</label>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...INP, flex:1 }} type="number" value={price} placeholder="Current market price" onChange={e => setPrice(e.target.value)}/>
            <button onClick={fetchCurrent} disabled={fetching} style={{ height:40, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:12, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              {fetching ? '…' : 'Live'}
            </button>
          </div>
        </div>
        {estPL != null && (
          <div style={{ padding:'10px 14px', borderRadius:9, background: estPL >= 0 ? 'rgba(0,212,160,0.08)' : 'rgba(255,59,92,0.08)', border:`1px solid ${estPL >= 0 ? 'rgba(0,212,160,0.2)' : 'rgba(255,59,92,0.2)'}`, marginBottom:14 }}>
            <span style={{ fontSize:14, fontWeight:800, color: estPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {estPL >= 0 ? '+' : ''}{fmtINR(estPL)} ({((estPL/(trade.entry_price*trade.qty))*100).toFixed(1)}%)
            </span>
          </div>
        )}
        {err && <div style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, height:40, borderRadius:9, background:'transparent', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={close} disabled={busy} style={{ flex:2, height:40, borderRadius:9, background:'var(--org)', border:'none', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            {busy ? 'Closing…' : 'Close Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProGate = () => (
  <div style={{ position:'absolute', inset:0, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', background:'rgba(7,13,26,0.65)', borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10, border:'1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ fontSize:32 }}>🔒</div>
    <div style={{ fontSize:15, fontWeight:800, color:'rgba(255,255,255,0.95)' }}>Pro Feature</div>
    <div style={{ fontSize:12, color:'var(--dim)', textAlign:'center', maxWidth:260, lineHeight:1.6 }}>Paper trade with virtual capital, track your strategies risk-free. Unlock with Pro.</div>
    {!Capacitor.isNativePlatform() && (
      <Link href="/dashboard/upgrade" style={{ marginTop:6, height:38, padding:'0 20px', borderRadius:9, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>⚡ Upgrade to Pro</Link>
    )}
  </div>
);

export default function PaperTradingPage() {
  const { isPro } = usePlan();
  useEffect(() => { localStorage.setItem('signal_visited_paper', '1'); }, []);

  const { session, user } = usePortfolio();
  const token = session?.access_token ?? '';

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades]         = useState<Trade[]>([]);
  const [si, setSi]                 = useState(0);
  const [loading, setLoading]       = useState(true);

  const [showNew, setShowNew]       = useState(false);
  const [showTrade, setShowTrade]   = useState(false);
  const [duplicating, setDupl]      = useState(false);
  const activeAlgoTypes = strategies.map(s => s.algo_type ?? 'custom');

  // Pre-fill from signals page deep-link (?symbol=RECLTD&price=365&signal=BUY&rsi=59)
  const [quickSym,    setQuickSym]    = useState('');
  const [quickPrice,  setQuickPrice]  = useState('');
  const [quickSignal, setQuickSignal] = useState<'BUY'|'SELL'>('BUY');
  const [quickOpened, setQuickOpened] = useState(false);

  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const sym = p.get('symbol');
    if (sym) {
      setQuickSym(sym);
      setQuickPrice(p.get('price') ?? '');
      setQuickSignal(p.get('signal') === 'SELL' ? 'SELL' : 'BUY');
    }
  }, []);

  // Once strategies load and we have a quick-symbol, auto-open the right modal
  useEffect(() => {
    if (!loading && quickSym && !quickOpened) {
      setQuickOpened(true);
      if (strategies.length > 0) setShowTrade(true);
      else setShowNew(true);
    }
  }, [loading, quickSym, quickOpened, strategies.length]);

  async function duplicateStrategy() {
    if (!st || !user) return;
    setDupl(true);
    await fetch(`${SUPA}/rest/v1/paper_strategies`, {
      method: 'POST',
      headers: { ...authHeader(token), Prefer: 'return=minimal' },
      body: JSON.stringify({
        name: `${st.name} (Copy)`, user_id: user.id,
        algo_type: st.algo_type ?? 'custom',
        capital: st.capital, rsi_low: st.rsi_low, rsi_high: st.rsi_high,
        sl_pct: st.sl_pct, target_pct: st.target_pct,
      }),
    });
    setDupl(false);
    await loadStrategies();
  }
  const [closingTrade, setClosing]  = useState<Trade | null>(null);
  const [savingParams, setSaving]   = useState(false);

  const [rsiL, setRsiL]   = useState(35);
  const [rsiH, setRsiH]   = useState(70);
  const [sl,   setSl  ]   = useState(2.5);
  const [tgt,  setTgt ]   = useState(6.0);

  const st = strategies[si];

  // Load strategies
  const loadStrategies = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const r = await fetch(`${SUPA}/rest/v1/paper_strategies?select=*&active=eq.true&order=created_at.asc`, {
      headers: authHeader(token),
    });
    const raw = await r.json();
    const data: Strategy[] = Array.isArray(raw) ? raw : [];
    setStrategies(data);
    if (data[si]) {
      setRsiL(data[si].rsi_low); setRsiH(data[si].rsi_high);
      setSl(data[si].sl_pct); setTgt(data[si].target_pct);
    }
    setLoading(false);
  }, [token, si]);

  // Load trades for selected strategy
  const loadTrades = useCallback(async () => {
    if (!token || !st) return;
    const r = await fetch(`${SUPA}/rest/v1/paper_trades?strategy_id=eq.${st.id}&order=entry_at.desc`, {
      headers: authHeader(token),
    });
    const rawT = await r.json();
    setTrades(Array.isArray(rawT) ? rawT : []);
  }, [token, st]);

  useEffect(() => { loadStrategies(); }, [loadStrategies]);
  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Sync sliders when switching strategy
  useEffect(() => {
    if (st) { setRsiL(st.rsi_low); setRsiH(st.rsi_high); setSl(st.sl_pct); setTgt(st.target_pct); }
  }, [si, st]);

  async function saveParams() {
    if (!token || !st) return;
    setSaving(true);
    await fetch(`${SUPA}/rest/v1/paper_strategies?id=eq.${st.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(token), Prefer: 'return=minimal' },
      body: JSON.stringify({ rsi_low: rsiL, rsi_high: rsiH, sl_pct: sl, target_pct: tgt }),
    });
    setSaving(false);
    await loadStrategies();
  }

  async function stopStrategy() {
    if (!token || !st || !confirm(`Stop "${st.name}"? Can't undo.`)) return;
    await fetch(`${SUPA}/rest/v1/paper_strategies?id=eq.${st.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(token), Prefer: 'return=minimal' },
      body: JSON.stringify({ active: false }),
    });
    setSi(0);
    await loadStrategies();
  }

  // Computed stats
  const wins   = trades.filter(t => t.status === 'WIN').length;
  const losses = trades.filter(t => t.status === 'LOSS').length;
  const open   = trades.filter(t => t.status === 'OPEN').length;
  const closed = wins + losses;
  const winRate = closed > 0 ? Math.round((wins / closed) * 100) : 0;
  const totalPL = trades.reduce((s, t) => s + (t.pl ?? 0), 0);
  const capital = st?.capital ?? 100_000;
  const currentVal = capital + totalPL;
  const retPct = ((totalPL / capital) * 100).toFixed(1);
  const days = st ? daysSince(st.started_at) : 0;
  const { path: curvePath, endY, lastPL } = st ? equityCurve(trades, capital) : { path: 'M0,80 L600,80', endY: 80, lastPL: 0 };
  const _ = lastPL; // used in computation

  // No session guard
  if (!session || !user) {
    return <div style={{ textAlign:'center', padding:60, color:'var(--dim)' }}>Sign in to use paper trading.</div>;
  }

  // Empty state — no strategies yet
  if (!loading && strategies.length === 0) {
    return (
      <div style={{ position:'relative' }}>
        {!isPro && <ProGate />}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Paper Trading</div>
            <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Test strategies risk-free · Virtual capital · No real orders</div>
          </div>
        </div>
        <div style={{ textAlign:'center', padding:'40px 24px 24px', background:'var(--card-bg)', border:'1px dashed var(--bdr)', borderRadius:16, marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>🧪</div>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Choose your strategies</div>
          <div style={{ fontSize:13, color:'var(--dim)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6 }}>
            Pick from 6 battle-tested algorithms. Each runs independently with ₹1,00,000 virtual capital, its own trade log and equity curve.
          </div>
          <button onClick={() => setShowNew(true)} style={{ height:46, padding:'0 32px', borderRadius:12, background:'linear-gradient(135deg,var(--blu),var(--pur))', border:'none', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            ▶ Select Strategies
          </button>
        </div>
        {showNew && <AlgoPickerModal token={token} userId={user.id} existing={activeAlgoTypes} onDone={async () => { setShowNew(false); await loadStrategies(); if (quickSym) setShowTrade(true); }} onClose={() => setShowNew(false)} />}
      </div>
    );
  }

  return (
    <div style={{ position:'relative' }}>
      {!isPro && <ProGate />}
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Paper Trading</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Virtual capital · No real orders placed · ⚠️ Educational only</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {st && <button onClick={() => setShowTrade(true)} title="Manually add a trade outside what the algorithm picked" style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ Manual Trade</button>}
          <button onClick={() => setShowNew(true)} style={{ height:36, padding:'0 16px', borderRadius:9, background:'linear-gradient(135deg,var(--blu),var(--pur))', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Strategy</button>
        </div>
      </div>

      {/* Auto-scan explainer — the algorithm drives stock selection, not the user */}
      <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(0,212,160,0.06)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:12, padding:'10px 14px', marginBottom:20, fontSize:12.5, color:'var(--dim)' }}>
        <span style={{ fontSize:16 }}>🤖</span>
        <span>Each strategy auto-scans and enters/exits matching stocks daily at market open — no stock picking needed. &ldquo;+ Manual Trade&rdquo; is only for testing a specific stock the algorithm didn&apos;t pick.</span>
      </div>

      {/* Strategy selector tabs */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap', overflowX:'auto', paddingBottom:4 }}>
        {strategies.map((s, i) => {
          const preset = ALGO_PRESETS.find(a => a.id === s.algo_type);
          return (
            <div key={s.id} onClick={() => setSi(i)}
              style={{ padding:'10px 18px', borderRadius:12, cursor:'pointer', flexShrink:0, background: si===i ? 'rgba(139,92,246,0.08)' : 'var(--surf)', border:`1px solid ${si===i ? 'var(--pur)' : 'var(--bdr)'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {preset && <span style={{ fontSize:14 }}>{preset.icon}</span>}
                <div style={{ fontSize:13, fontWeight:700, color: si===i ? 'var(--pur)' : 'var(--txt)' }}>{s.name}</div>
              </div>
              <div style={{ fontSize:11, color: totalPL >= 0 ? 'var(--grn)' : 'var(--red)', marginTop:2 }}>
                {si===i ? `${totalPL >= 0 ? '+' : ''}${retPct}% · ${winRate}% win` : `Active · Day ${daysSince(s.started_at)}`}
              </div>
            </div>
          );
        })}
        <button onClick={() => setShowNew(true)} style={{ padding:'10px 18px', borderRadius:12, background:'var(--card-bg)', border:'1px dashed var(--bdr)', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--dim)' }}>+ New</div>
          <div style={{ fontSize:11, color:'var(--dim)' }}>Add strategy</div>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--dim)' }}>Loading…</div>
      ) : st && (
        <div className="paper-main-grid">
          {/* Left */}
          <div>
            {/* Stats */}
            <div className="paper-stats-grid">
              {[
                { label:'Virtual Portfolio',  val: fmtINR(currentVal),                   valC: totalPL >= 0 ? 'var(--grn)' : 'var(--red)',  sub:`Started at ${fmtINR(capital)}` },
                { label:'Paper Returns',      val:`${totalPL >= 0 ? '+' : ''}${retPct}%`, valC: +retPct >= 0 ? 'var(--grn)' : 'var(--red)', sub: totalPL !== 0 ? `${totalPL >= 0?'+':''}${fmtINR(totalPL)}` : 'No closed trades' },
                { label:'Win Rate',           val:`${winRate}%`,                           valC:'var(--grn)',  sub:`${wins}W · ${losses}L · ${open} open` },
                { label:'Days Running',       val:`Day ${days}`,                           valC:'var(--txt)', sub:`${st.trial_days}-day trial` },
              ].map(c => (
                <div key={c.label} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:13, padding:16 }}>
                  <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>{c.label}</div>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:c.valC }}>{c.val}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Equity curve */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>Virtual Equity Curve</div>
                <span style={{ fontSize:11, fontWeight:700, color: totalPL >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {totalPL >= 0 ? '▲ +' : '▼ '}{fmtINR(Math.abs(totalPL))} ({totalPL >= 0 ? '+' : ''}{retPct}%)
                </span>
              </div>
              <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4A0" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#00D4A0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <path d={`${curvePath} L600,100 L0,100 Z`} fill="url(#ecg)"/>
                <path d={curvePath} fill="none" stroke="#00D4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="600" cy={endY} r="4" fill="#00D4A0"/>
              </svg>
              {trades.filter(t=>t.exit_at).length === 0 && (
                <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center', marginTop:6 }}>Close your first trade to see the curve build.</div>
              )}
            </div>

            {/* Trade log */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>Trade Log</div>
                <span style={{ fontSize:11, color:'var(--dim)' }}>{trades.length} trades</span>
              </div>
              {trades.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--dim)', fontSize:13 }}>
                  No trades yet — click <strong style={{ color:'var(--grn)' }}>+ Paper Trade</strong> to add your first.
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr>
                      {[['Date','paper-log-date'],['Stock',''],['Signal',''],['Entry',''],['Exit','paper-log-exit'],['P&L',''],['Status','']].map(([h,cls]) => (
                        <th key={h} className={cls} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'7px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => {
                      const isOpen  = t.status === 'OPEN';
                      const isWin   = t.status === 'WIN';
                      const plColor = t.pl == null ? 'var(--ylw)' : t.pl >= 0 ? 'var(--grn)' : 'var(--red)';
                      const stBg    = isOpen ? 'rgba(255,184,0,0.1)' : isWin ? 'rgba(0,212,160,0.1)' : 'rgba(255,59,92,0.1)';
                      const stColor = isOpen ? 'var(--ylw)' : isWin ? 'var(--grn)' : 'var(--red)';
                      const stLabel = isOpen ? 'OPEN' : isWin ? '✅ WIN' : '⛔ LOSS';
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid rgba(28,46,74,0.5)', cursor: isOpen ? 'pointer' : 'default' }}
                          onClick={() => isOpen && setClosing(t)}>
                          <td className="paper-log-date" style={{ padding:'9px 10px', fontSize:11, color:'var(--dim2)' }}>
                            {new Date(t.entry_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </td>
                          <td style={{ padding:'9px 10px', fontWeight:700 }}>
                            {t.symbol}
                            {isOpen && <span style={{ marginLeft:5, fontSize:9, color:'var(--dim)' }}>↩ close</span>}
                          </td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:t.signal==='BUY'?'var(--grn)':'var(--red)', display:'inline-block' }}/>
                              {t.signal}
                            </span>
                          </td>
                          <td style={{ padding:'9px 10px' }}>{fmtINR(t.entry_price)}</td>
                          <td className="paper-log-exit" style={{ padding:'9px 10px' }}>{t.exit_price ? fmtINR(t.exit_price) : '—'}</td>
                          <td style={{ padding:'9px 10px', fontWeight:700, color:plColor }}>
                            {t.pl != null ? `${t.pl >= 0 ? '+' : ''}${fmtINR(t.pl)}` : 'Running'}
                          </td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:stBg, color:stColor, fontWeight:700 }}>{stLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Params editor */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:18 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>Parameters</div>
                <span style={{ fontSize:12, color:'var(--dim)' }}>Applies to new signals only</span>
              </div>
              {[
                { label:'RSI Buy threshold',  val:rsiL, set:setRsiL, min:10, max:50, step:1 },
                { label:'RSI Sell threshold', val:rsiH, set:setRsiH, min:50, max:90, step:1 },
                { label:'Stop Loss %',        val:sl,   set:setSl,   min:0.5, max:20, step:0.5 },
                { label:'Target %',           val:tgt,  set:setTgt,  min:1, max:30, step:0.5 },
              ].map(p => (
                <div key={p.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--bdr)' }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{p.label}</div>
                  <input type="number" value={p.val} onChange={e => p.set(+e.target.value)} min={p.min} max={p.max} step={p.step}
                    style={{ height:34, padding:'0 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:13, fontWeight:700, fontFamily:'inherit', outline:'none', width:90, textAlign:'right' }}/>
                </div>
              ))}
              <button onClick={saveParams} disabled={savingParams}
                style={{ width:'100%', height:38, borderRadius:10, background:savingParams?'var(--surf2)':'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:14 }}>
                {savingParams ? 'Saving…' : '💾 Save Parameters'}
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div>
            {/* Trial progress */}
            <div style={{ background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:18, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--pur)', marginBottom:8 }}>Day {days} of {st.trial_days}</div>
              <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:`${Math.min(100, (days/st.trial_days)*100)}%`, background:'linear-gradient(90deg,var(--pur),#6D3EC1)', borderRadius:3 }}/>
              </div>
              <div style={{ fontSize:11, color:'var(--dim)' }}>{Math.max(0, st.trial_days - days)} days remaining</div>
            </div>

            {/* Strategy summary */}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:18, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Strategy Summary</div>
              {[
                ['Algorithm',  (() => { const p = ALGO_PRESETS.find(a => a.id === st.algo_type); return p ? `${p.icon} ${p.category}` : 'Custom'; })()],
                ['Capital',    fmtINR(capital) + ' virtual'],
                ['SL',         `${st.sl_pct}%`],
                ['Target',     `${st.target_pct}%`],
                ['RSI range',  `${st.rsi_low}–${st.rsi_high}`],
                ['Open trades',`${open}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:12 }}>
                  <span style={{ color:'var(--dim)' }}>{k}</span>
                  <span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center', lineHeight:1.5 }}>
                🤖 This algorithm auto-enters matching stocks daily at market open
              </div>
              <button onClick={() => setShowTrade(true)}
                title="Manually add a trade outside what the algorithm picked"
                style={{ height:42, borderRadius:12, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--dim)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                + Manual Trade (override)
              </button>
              <button onClick={duplicateStrategy} disabled={duplicating}
                style={{ height:42, borderRadius:12, background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.25)', color:'var(--ylw)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {duplicating ? 'Duplicating…' : '⧉ Duplicate Strategy'}
              </button>
              <Link href="/dashboard/algorithms"
                style={{ height:42, borderRadius:12, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                ⚙️ View Algo Library
              </Link>
              <button onClick={stopStrategy}
                style={{ height:42, borderRadius:12, background:'transparent', border:'1px solid rgba(255,59,92,0.3)', color:'var(--red)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ⛔ Stop Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showNew     && <AlgoPickerModal token={token} userId={user.id} existing={activeAlgoTypes} onDone={async () => { setShowNew(false); await loadStrategies(); }} onClose={() => setShowNew(false)} />}
      {showTrade   && st && <NewTradeModal strategy={st} token={token} userId={user.id} initialSym={quickSym} initialPrice={quickPrice} initialSignal={quickSignal} onDone={async () => { setShowTrade(false); setQuickSym(''); await loadTrades(); }} onClose={() => { setShowTrade(false); setQuickSym(''); }} />}
      {closingTrade && <CloseTradeModal trade={closingTrade} token={token} onDone={async () => { setClosing(null); await loadTrades(); }} onClose={() => setClosing(null)} />}
    </div>
  );
}
