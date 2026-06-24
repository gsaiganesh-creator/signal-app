'use client';
import { useState } from 'react';
import Link from 'next/link';

const LOG_1 = [
  { date:'Jun 19 · 09:31', sym:'RELIANCE',  sig:'BUY',  sigC:'var(--grn)', entry:'₹2,880', exit:'—',      pl:'Running',  plC:'var(--ylw)', status:'OPEN',  sC:'var(--ylw)', sBg:'rgba(255,184,0,0.1)' },
  { date:'Jun 18 · 14:22', sym:'INFY',      sig:'SELL', sigC:'var(--red)', entry:'₹1,450', exit:'₹1,498', pl:'+₹2,340', plC:'var(--grn)', status:'✅ WIN', sC:'var(--grn)', sBg:'rgba(0,212,160,0.1)' },
  { date:'Jun 17 · 10:15', sym:'SBIN',      sig:'BUY',  sigC:'var(--grn)', entry:'₹808',   exit:'₹838',   pl:'+₹1,800', plC:'var(--grn)', status:'✅ WIN', sC:'var(--grn)', sBg:'rgba(0,212,160,0.1)' },
  { date:'Jun 17 · 09:45', sym:'WIPRO',     sig:'BUY',  sigC:'var(--grn)', entry:'₹492',   exit:'₹482',   pl:'−₹600',   plC:'var(--red)', status:'⛔ SL',  sC:'var(--red)', sBg:'rgba(255,59,92,0.1)' },
  { date:'Jun 16 · 11:30', sym:'TCS',       sig:'BUY',  sigC:'var(--grn)', entry:'₹3,820', exit:'₹3,945', pl:'+₹3,750', plC:'var(--grn)', status:'✅ WIN', sC:'var(--grn)', sBg:'rgba(0,212,160,0.1)' },
  { date:'Jun 13 · 09:35', sym:'HDFCBANK',  sig:'BUY',  sigC:'var(--grn)', entry:'₹1,610', exit:'₹1,572', pl:'−₹2,280', plC:'var(--red)', status:'⛔ SL',  sC:'var(--red)', sBg:'rgba(255,59,92,0.1)' },
];

const LOG_2 = [
  { date:'Jun 19 · 09:55', sym:'BAJFINANCE', sig:'BUY', sigC:'var(--grn)', entry:'₹8,200', exit:'—',      pl:'Running',  plC:'var(--ylw)', status:'OPEN',  sC:'var(--ylw)', sBg:'rgba(255,184,0,0.1)' },
  { date:'Jun 18 · 10:10', sym:'TATAMOTORS', sig:'BUY', sigC:'var(--grn)', entry:'₹945',   exit:'₹968',   pl:'+₹1,380', plC:'var(--grn)', status:'✅ WIN', sC:'var(--grn)', sBg:'rgba(0,212,160,0.1)' },
  { date:'Jun 18 · 09:42', sym:'RELIANCE',   sig:'BUY', sigC:'var(--grn)', entry:'₹2,865', exit:'₹2,845', pl:'−₹1,200', plC:'var(--red)', status:'⛔ SL',  sC:'var(--red)', sBg:'rgba(255,59,92,0.1)' },
];

const STRATS = [
  { name:'RSI + EMA Momentum',  sub:'+8.4% · Day 6/7 · 71% win', subC:'var(--grn)', perf:['₹1,08,420','var(--grn)','+8.4%','var(--grn)','71%','var(--grn)','Day 6/7'], log:LOG_1,  curve:"M0,80 L60,78 L100,82 L140,70 L180,65 L220,62 L260,58 L300,52 L340,48 L380,45 L420,42 L460,38 L500,36 L560,32 L600,28", endY:28 },
  { name:'Momentum Breakout',   sub:'+2.1% · Day 2/7 · 60% win', subC:'var(--dim)',  perf:['₹1,02,100','var(--grn)','+2.1%','var(--grn)','60%','var(--grn)','Day 2/7'], log:LOG_2,  curve:"M0,80 L80,80 L140,82 L200,76 L280,72 L360,70 L440,66 L520,62 L600,58",              endY:58 },
];

export default function PaperTradingPage() {
  const [si, setSi]       = useState(0);
  const [rsiL, setRsiL]   = useState(35);
  const [rsiH, setRsiH]   = useState(70);
  const [sl,   setSl  ]   = useState(2.5);
  const [tgt,  setTgt ]   = useState(6.0);
  const st = STRATS[si];
  const [pv, pc, rv, rc, wv, wc, dv] = st.perf;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Paper Trading</div>
          <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>Test strategies risk-free with live NSE/BSE data · Virtual capital ₹1,00,000 per strategy</div>
        </div>
        <Link href="/dashboard/algo-builder" style={{ height:36, padding:'0 18px', borderRadius:9, background:'var(--blu)', border:'none', color:'#fff', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center' }}>+ New Strategy</Link>
      </div>

      {/* Strategy tabs */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
        {STRATS.map((s, i) => (
          <div key={i} onClick={() => setSi(i)}
            style={{ padding:'10px 20px', borderRadius:12, cursor:'pointer', background: si===i ? 'rgba(139,92,246,0.08)' : 'var(--surf)', border:`1px solid ${si===i ? 'var(--pur)' : 'var(--bdr)'}` }}>
            <div style={{ fontSize:13, fontWeight:700, color: si===i ? 'var(--pur)' : 'var(--txt)' }}>{s.name}</div>
            <div style={{ fontSize:11, color:s.subC, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
        <Link href="/dashboard/algo-builder" style={{ padding:'10px 20px', borderRadius:12, background:'var(--surf)', border:'1px dashed var(--bdr)', opacity:0.6, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--dim)' }}>+ Add strategy</div>
          <div style={{ fontSize:11, color:'var(--dim)' }}>From Algo Builder</div>
        </Link>
      </div>

      <div className="paper-main-grid">
        <div>
          {/* Perf cards */}
          <div className="paper-stats-grid">
            {[
              { label:'Virtual Portfolio', val:pv, valC:pc, sub:'Started at ₹1,00,000' },
              { label:'Paper Returns',     val:rv, valC:rc, sub:'Virtual P&L' },
              { label:'Win Rate',          val:wv, valC:wc, sub:`${st.log.filter(l=>l.status.includes('WIN')).length}W · ${st.log.filter(l=>l.status.includes('SL')).length}L` },
              { label:'Time Running',      val:dv, valC:'var(--txt)', sub:'7-day trial' },
            ].map(c => (
              <div key={c.label} style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:13, padding:16 }}>
                <div style={{ fontSize:11, color:'var(--dim)', marginBottom:5 }}>{c.label}</div>
                <div style={{ fontSize:24, fontWeight:900, letterSpacing:-0.5, color:c.valC }}>{c.val}</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Virtual Equity Curve</div>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--grn)' }}>{si===0 ? '▲ +₹8,420 (8.4%)' : '▲ +₹2,100 (2.1%)'}</span>
            </div>
            <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4A0" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#00D4A0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <path d={`${st.curve} L600,100 L0,100 Z`} fill="url(#ecg)"/>
              <path d={st.curve} fill="none" stroke="#00D4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="600" cy={st.endY} r="4" fill="#00D4A0"/>
            </svg>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--dim2)', marginTop:6 }}>
              <span>Jun 13</span><span>Jun 14</span><span>Jun 16</span><span>Jun 17</span><span>Jun 18</span><span>Jun 19</span>
            </div>
          </div>

          {/* Signal log */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Signal Log</div>
              <span style={{ fontSize:11, color:'var(--dim)' }}>{st.log.length} signals fired</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {[['Date & Time','paper-log-date'],['Stock',''],['Signal',''],['Entry',''],['Exit','paper-log-exit'],['P&L',''],['Status','']].map(([h,cls]) => (
                    <th key={h} className={cls} style={{ fontSize:10.5, fontWeight:700, color:'var(--dim)', padding:'7px 10px', textAlign:'left', borderBottom:'1px solid var(--bdr)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {st.log.map((row, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(28,46,74,0.5)' }}>
                    <td className="paper-log-date" style={{ padding:'9px 10px', fontSize:11, color:'var(--dim2)' }}>{row.date}</td>
                    <td style={{ padding:'9px 10px', fontWeight:700 }}>{row.sym}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:row.sigC, display:'inline-block' }}/>
                        {row.sig}
                      </span>
                    </td>
                    <td style={{ padding:'9px 10px' }}>{row.entry}</td>
                    <td className="paper-log-exit" style={{ padding:'9px 10px' }}>{row.exit}</td>
                    <td style={{ padding:'9px 10px', fontWeight:700, color:row.plC }}>{row.pl}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:row.sBg, color:row.sC, fontWeight:700 }}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parameter editor */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Edit Parameters</div>
              <span style={{ fontSize:12, color:'var(--dim)' }}>Changes apply to new signals only</span>
            </div>
            {[
              { label:'RSI Buy threshold',  desc:'Trigger BUY when RSI falls below this value',  val:rsiL, set:setRsiL,  min:10, max:50, step:1 },
              { label:'RSI Sell threshold', desc:'Trigger SELL when RSI rises above this value', val:rsiH, set:setRsiH,  min:50, max:90, step:1 },
              { label:'Stop Loss %',        desc:'Exit if price drops this % from entry',         val:sl,   set:setSl,    min:0.5, max:20, step:0.5 },
              { label:'Target %',           desc:'Take profit at this % gain from entry',          val:tgt,  set:setTgt,   min:1, max:30, step:0.5 },
            ].map(p => (
              <div key={p.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--bdr)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{p.label}</div>
                  <div style={{ fontSize:11, color:'var(--dim)', marginTop:2 }}>{p.desc}</div>
                </div>
                <input type="number" value={p.val} onChange={e => p.set(Number(e.target.value))} min={p.min} max={p.max} step={p.step}
                  style={{ height:34, padding:'0 12px', borderRadius:8, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:700, fontFamily:'inherit', outline:'none', width:100, textAlign:'right' }}/>
              </div>
            ))}
            <button style={{ width:'100%', height:38, borderRadius:10, background:'var(--surf2)', border:'1px solid var(--bdr)', color:'var(--txt)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:14 }}>💾 Save Parameters</button>
          </div>
        </div>

        {/* Right panel */}
        <div>
          <div style={{ background:'rgba(0,212,160,0.05)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--grn)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--grn)', display:'inline-block' }}/>
              {si===0 ? 'Day 6/7 · 1 day left' : 'Day 2/7 · 5 days left'}
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width: si===0 ? '86%' : '29%', background:'linear-gradient(90deg,var(--pur),#6D3EC1)', borderRadius:3 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:'var(--dim)' }}>7-day trial period</span>
              <span style={{ color:'var(--pur)', fontWeight:700 }}>{si===0 ? '6/7 days' : '2/7 days'}</span>
            </div>
          </div>

          <div style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Strategy Summary</div>
            {[
              ['Type',     si===0 ? 'RSI + EMA Momentum' : 'Momentum Breakout'],
              ['Universe', 'NIFTY 50'],
              ['Capital',  '₹1,00,000 virtual'],
              ['SL',       `${sl}%`],
              ['Target',   `${tgt}%`],
            ].map(([k,v]) => (
              <div key={k as string} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(28,46,74,0.5)', fontSize:12 }}>
                <span style={{ color:'var(--dim)' }}>{k}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button style={{ height:48, borderRadius:12, background:'linear-gradient(135deg,var(--grn),#00A87D)', border:'none', color:'#001A12', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🚀 Go Live with Real Money</button>
            <Link href="/dashboard/algo-builder" style={{ height:44, borderRadius:12, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)', color:'var(--pur)', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>⚙️ Edit in Algo Builder</Link>
            <button style={{ height:44, borderRadius:12, background:'transparent', border:'1px solid rgba(255,59,92,0.3)', color:'var(--red)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>⛔ Stop Paper Trading</button>
          </div>
        </div>
      </div>
    </>
  );
}
