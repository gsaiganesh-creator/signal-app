'use client';
import { useState } from 'react';
import Link from 'next/link';

const STRATS = [
  { icon:'🚀', name:'Momentum',      desc:'Ride stocks with strong price + volume momentum using RSI and EMA crossovers.',  tags:['RSI','EMA','Volume'] },
  { icon:'📈', name:'Trend Following',desc:'Follow the dominant trend using EMAs, MACD, and ADX strength filter.',             tags:['EMA','MACD','ADX'] },
  { icon:'🔄', name:'Mean Reversion', desc:'Buy oversold bounces when price touches Bollinger Band lower with RSI divergence.', tags:['BB','RSI','Stoch'] },
  { icon:'⚡', name:'Breakout',       desc:'Catch stocks breaking 52W highs or consolidation ranges with volume confirmation.', tags:['ATR','Volume','52W'] },
];

const INDS = [
  { name:'RSI (14)',        cat:'Momentum',      def:true  },
  { name:'EMA 20/50',      cat:'Trend',          def:true  },
  { name:'Volume Surge',   cat:'Volume',         def:true  },
  { name:'Delivery %',     cat:'Volume · India', def:true  },
  { name:'ADX (14)',        cat:'Trend Strength', def:true  },
  { name:'MACD (12,26,9)', cat:'Trend',          def:false },
  { name:'Bollinger Bands',cat:'Volatility',      def:false },
  { name:'ATR (14)',        cat:'Volatility',      def:false },
  { name:'Stochastic',     cat:'Momentum',        def:false },
  { name:'𝕏 Sentiment',   cat:'Sentiment',       def:false },
];

const CODE_LINES: [string, string][] = [
  ['#68D391','# SIGNAL Algo · Momentum: RSI + EMA Crossover'],
  ['#68D391','# Auto-generated · NSE · Equity · Jun 2026'],
  ['',''],
  ['#79C0FF','import pandas as pd, numpy as np'],
  ['#79C0FF','from signal_sdk import Broker, Notifier'],
  ['',''],
  ['#F6C90E','RSI_BUY, RSI_SELL = 35, 70'],
  ['#F6C90E','EMA_FAST, EMA_SLOW = 20, 50'],
  ['#F6C90E','STOP_PCT, TARGET_PCT = 2.5, 6.0'],
  ['#F6C90E','UNIVERSE = "NIFTY50"'],
  ['',''],
  ['#FF7D46','def rsi(series, n=14):'],
  ['#E2E8F0','    d=series.diff(); g=d.clip(lower=0); l=-d.clip(upper=0)'],
  ['#E2E8F0','    return 100-100/(1+g.ewm(n).mean()/l.ewm(n).mean())'],
  ['',''],
  ['#FF7D46','def signal(df: pd.DataFrame) -> str:'],
  ['#E2E8F0','    r    = rsi(df["close"])'],
  ['#E2E8F0','    fast = df["close"].ewm(span=EMA_FAST).mean()'],
  ['#E2E8F0','    slow = df["close"].ewm(span=EMA_SLOW).mean()'],
  ['#E2E8F0','    vol  = df["volume"] / df["volume"].rolling(20).mean()'],
  ['#E2E8F0','    if (r.iloc[-1] < RSI_BUY'],
  ['#E2E8F0','            and fast.iloc[-1] > slow.iloc[-1]'],
  ['#E2E8F0','            and vol.iloc[-1] > 1.5):'],
  ['#68D391','        return "BUY"'],
  ['#E2E8F0','    if r.iloc[-1] > RSI_SELL:'],
  ['#FC8181','        return "SELL"'],
  ['#E2E8F0','    return "HOLD"'],
];

const BT = [
  { val:'+24.3%', lbl:'Returns',      c:'var(--grn)' },
  { val:'1.84',   lbl:'Sharpe Ratio', c:'var(--bluL)' },
  { val:'64%',    lbl:'Win Rate',     c:'var(--grn)' },
  { val:'−8.2%',  lbl:'Max Drawdown', c:'var(--red)' },
];

export default function AlgoBuilderPage() {
  const [stratIdx, setStratIdx] = useState(0);
  const [universe, setUniverse] = useState<string[]>(['NIFTY 50']);
  const [checked,  setChecked ] = useState<string[]>(INDS.filter(i=>i.def).map(i=>i.name));
  const [step,     setStep    ] = useState(3);
  const [slVal,    setSlVal   ] = useState('2.5');
  const [tgtVal,   setTgtVal  ] = useState('6.0');
  const [showCode, setShowCode] = useState(false);

  function toggleUni(u: string) { setUniverse(p => p.includes(u) ? p.filter(x=>x!==u) : [...p,u]); }
  function toggleInd(n: string) { setChecked(p => p.includes(n) ? p.filter(x=>x!==n) : [...p,n]); }

  const STEPS = ['Strategy Type','Indicators','Conditions','Backtest & Deploy'];

  return (
    <>
      {/* Hero card — referral style */}
      <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(23,64,245,0.04))', border:'1px solid rgba(139,92,246,0.2)', borderRadius:20, padding:'28px 36px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--pur)', textTransform:'uppercase', marginBottom:8 }}>Algo Builder · Pro</div>
          <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.6, lineHeight:1.2, marginBottom:8 }}>
            Build it once.<br/><span style={{ color:'var(--pur)' }}>Trade it forever.</span>
          </div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:440 }}>
            Pick your strategy type, configure indicators, set SL/Target — SIGNAL generates the logic, backtests on 10 years of NSE data, and deploys it to paper trade automatically.
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:48, fontWeight:900, color:'var(--pur)', lineHeight:1 }}>3</div>
          <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>active strategies</div>
          <div style={{ marginTop:8, padding:'4px 12px', borderRadius:6, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', fontSize:11, fontWeight:700, color:'var(--pur)' }}>+24.3% avg returns</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:-0.4 }}>Strategy Builder</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:2 }}>Configure → backtest → paper trade → deploy.</div>
        </div>
        <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>📂 My Strategies (3)</button>
      </div>

      {/* Step progress */}
      <div className="algo-steps" style={{ gap:0 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display:'contents' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:30, height:30, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0, background: step>i+1 ? 'var(--grn)' : (step===i+1 ? 'var(--blu)' : 'var(--surf2)'), color: step>i+1 ? '#001A12' : (step===i+1 ? '#fff' : 'var(--dim)') }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className="algo-step-label" style={{ color: step>i+1 ? 'var(--grn)' : (step===i+1 ? 'var(--txt)' : 'var(--dim)') }}>{s}</span>
            </div>
            {i < 3 && <div style={{ flex:1, height:2, background: step>i+1 ? 'var(--grn)' : 'var(--bdr)', margin:'0 8px', minWidth:12 }}/>}
          </div>
        ))}
      </div>

      <div className="algo-main-grid">
        <div>
          {/* Step 1 */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Step 1 — Strategy Type</div>
              {step > 1 && <span style={{ fontSize:11, fontWeight:700, color:'var(--grn)', padding:'3px 10px', borderRadius:6, background:'rgba(0,212,160,0.1)' }}>✓ {STRATS[stratIdx].name} selected</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {STRATS.map((s, i) => (
                <div key={s.name} onClick={() => { setStratIdx(i); if (step < 2) setStep(2); }}
                  style={{ border:`2px solid ${stratIdx===i ? 'var(--blu)' : 'var(--bdr)'}`, borderRadius:14, padding:20, cursor:'pointer', background: stratIdx===i ? 'rgba(23,64,245,0.05)' : 'var(--surf)', transition:'all 0.2s' }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>{s.icon}</div>
                  <div style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.55 }}>{s.desc}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
                    {s.tags.map(t => <span key={t} style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:5, background:'var(--surf2)', color:'var(--dim)' }}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Step 2 — Stock Universe &amp; Indicators</div>
              {step > 2 && <span style={{ fontSize:11, fontWeight:700, color:'var(--grn)', padding:'3px 10px', borderRadius:6, background:'rgba(0,212,160,0.1)' }}>✓ {checked.length} indicators selected</span>}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:8 }}>Stock Universe</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {['NIFTY 50','NIFTY 500','NIFTY Midcap 150','My Portfolio','Custom List'].map(u => (
                <button key={u} onClick={() => { toggleUni(u); if (step < 3) setStep(3); }}
                  style={{ height:34, padding:'0 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', background: universe.includes(u) ? 'rgba(23,64,245,0.12)' : 'transparent', border:`1px solid ${universe.includes(u) ? 'var(--blu)' : 'var(--bdr)'}`, color: universe.includes(u) ? 'var(--bluL)' : 'var(--dim)' }}>{u}</button>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--dim)', marginBottom:8 }}>Indicators</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {INDS.map(ind => {
                const on = checked.includes(ind.name);
                return (
                  <div key={ind.name} onClick={() => toggleInd(ind.name)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:11, cursor:'pointer', transition:'all 0.15s', background: on ? 'rgba(23,64,245,0.07)' : 'var(--surf)', border:`1px solid ${on ? 'rgba(23,64,245,0.3)' : 'var(--bdr)'}` }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${on ? 'var(--blu)' : 'var(--bdr)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0, background: on ? 'var(--blu)' : 'transparent', color:'#fff' }}>{on ? '✓' : ''}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{ind.name}</div>
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{ind.cat}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ background:'var(--surf)', border:`1px solid ${step===3 ? 'rgba(23,64,245,0.3)' : 'var(--bdr)'}`, borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Step 3 — Entry &amp; Exit Conditions</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.55, marginBottom:16 }}>Define when SIGNAL should trigger a BUY or SELL. All conditions must be true simultaneously.</div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:8 }}>🟢 BUY when ALL of these are true:</div>
            {[
              { label:'RSI (14)', op:'<', val:'35', note:'oversold', dc:'var(--grn)', c:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)' },
              { label:'EMA20', op:'crosses above', val:'EMA50', note:'golden cross', dc:'var(--grn)', c:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)' },
              { label:'Volume', op:'>', val:'1.5×', note:'surge', dc:'var(--grn)', c:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)' },
            ].map((cond, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', borderRadius:11, marginBottom:7, background:cond.c, border:`1px solid ${cond.bc}` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:cond.dc, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:700, minWidth:80 }}>{cond.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:cond.dc, minWidth:80 }}>{cond.op}</span>
                <span style={{ fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:6, background:'rgba(0,212,160,0.15)', color:cond.dc }}>{cond.val}</span>
                <span style={{ fontSize:11, color:'var(--dim)' }}>{cond.note}</span>
                <button style={{ marginLeft:'auto', width:24, height:24, background:'transparent', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:14 }}>✕</button>
              </div>
            ))}
            <button style={{ height:36, padding:'0 16px', borderRadius:9, background:'transparent', border:'1px dashed var(--bdr)', color:'var(--dim)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginBottom:16 }}>+ Add BUY condition</button>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:8 }}>🔴 SELL when ANY of these is true:</div>
            {[
              { label:'RSI (14)', op:'>', val:'70', note:'overbought', dc:'var(--red)', c:'rgba(255,59,92,0.06)', bc:'rgba(255,59,92,0.2)' },
              { label:'Stop Loss', op:'=', val:`−${slVal}%`, note:'trailing', dc:'var(--red)', c:'rgba(255,59,92,0.06)', bc:'rgba(255,59,92,0.2)' },
              { label:'Target', op:'=', val:`+${tgtVal}%`, note:'take profit', dc:'var(--red)', c:'rgba(255,59,92,0.06)', bc:'rgba(255,59,92,0.2)' },
            ].map((cond, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', borderRadius:11, marginBottom:7, background:cond.c, border:`1px solid ${cond.bc}` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:cond.dc, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:700, minWidth:80 }}>{cond.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:cond.dc, minWidth:80 }}>{cond.op}</span>
                <span style={{ fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:6, background:'rgba(255,59,92,0.15)', color:cond.dc }}>{cond.val}</span>
                <span style={{ fontSize:11, color:'var(--dim)' }}>{cond.note}</span>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16 }}>
              {[
                { label:'Stop Loss %', state:slVal, setState:setSlVal },
                { label:'Target %',    state:tgtVal, setState:setTgtVal },
              ].map(p => (
                <div key={p.label}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--dim)', display:'block', marginBottom:6 }}>{p.label}</label>
                  <input type="number" value={p.state} onChange={e => p.setState(e.target.value)} step="0.5" min="0.5" max="20"
                    style={{ height:36, padding:'0 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', width:'100%' }}/>
                  <div style={{ fontSize:18, fontWeight:900, marginTop:4, color:'var(--txt)' }}>{p.state}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Step 4 — Backtest &amp; Deploy</div>
            <div className="bt-stats-grid">
              {BT.map(b => (
                <div key={b.lbl} style={{ background:'var(--surf2)', border:'1px solid var(--bdr)', borderRadius:11, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:900, color:b.c }}>{b.val}</div>
                  <div style={{ fontSize:10.5, color:'var(--dim)', marginTop:3 }}>{b.lbl}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCode(!showCode)}
              style={{ height:36, padding:'0 16px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginBottom:12 }}>
              {showCode ? '▲ Hide Code' : '▼ View Generated Code'}
            </button>
            {showCode && (
              <div style={{ background:'#0D1117', border:'1px solid #21262D', borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', background:'#161B22', borderBottom:'1px solid #21262D' }}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#8B949E' }}>signal_{STRATS[stratIdx].name.toLowerCase().replace(/ /g,'_')}.py</span>
                  <button style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, background:'rgba(23,64,245,0.15)', color:'var(--bluL)', border:'1px solid rgba(23,64,245,0.3)', cursor:'pointer', fontFamily:'inherit' }}>⎘ Copy</button>
                </div>
                <div style={{ padding:16, fontFamily:'monospace', fontSize:12, lineHeight:1.7, overflowX:'auto' }}>
                  {CODE_LINES.map(([c, line], i) => <div key={i} style={{ color: c || 'transparent', whiteSpace:'pre' }}>{line || ' '}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Your Strategy</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:2 }}>Type</div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>{STRATS[stratIdx].icon} {STRATS[stratIdx].name}</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:2 }}>Universe</div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>{universe.join(', ')}</div>
            <div style={{ fontSize:12, color:'var(--dim)', marginBottom:4 }}>Indicators ({checked.length})</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
              {checked.map(c => <span key={c} style={{ fontSize:10.5, padding:'2px 7px', borderRadius:5, background:'rgba(23,64,245,0.12)', color:'var(--bluL)', border:'1px solid rgba(23,64,245,0.25)' }}>{c}</span>)}
            </div>
            <div style={{ display:'flex', gap:16 }}>
              <div><div style={{ fontSize:11, color:'var(--dim)' }}>Stop Loss</div><div style={{ fontSize:14, fontWeight:800, color:'var(--red)' }}>{slVal}%</div></div>
              <div><div style={{ fontSize:11, color:'var(--dim)' }}>Target</div><div style={{ fontSize:14, fontWeight:800, color:'var(--grn)' }}>{tgtVal}%</div></div>
            </div>
          </div>

          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Link href="/paper-trading" style={{ height:46, borderRadius:12, background:'linear-gradient(135deg,var(--pur),#6D3EC1)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>🧪 Paper Trade This</Link>
              <button style={{ height:46, borderRadius:12, background:'transparent', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save Strategy</button>
              <button onClick={() => setShowCode(!showCode)} style={{ height:46, borderRadius:12, background:'rgba(23,64,245,0.1)', border:'1px solid rgba(23,64,245,0.3)', color:'var(--bluL)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{'</>'} Generate Code</button>
            </div>
          </div>

          <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--pur)', marginBottom:8 }}>PRO TIP</div>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>Paper trade for at least 7 trading days before going live. RSI + EMA strategies typically need 2–3 weeks to show stable win rates.</div>
          </div>
        </div>
      </div>
    </>
  );
}
