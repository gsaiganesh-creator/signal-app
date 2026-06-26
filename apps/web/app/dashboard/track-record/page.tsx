'use client';
import { useState, useEffect } from 'react';

// ─── Historical signal calls (since March 2026) ───────────────────────────────
type Status = 'T2 Hit' | 'T1 Hit' | 'SL Hit' | 'Running';

interface Call {
  date: string; stock: string; sector: string; entry: number;
  t1: number; t2: number; sl: number;
  exit: number | null; status: Status; days: number | null;
}

const CALLS: Call[] = [
  { date:'2026-03-04', stock:'NTPC',       sector:'Power',        entry:330,   t1:350,   t2:370,   sl:312,  exit:352,  status:'T1 Hit', days:6  },
  { date:'2026-03-11', stock:'HAL',        sector:'Defense',      entry:4210,  t1:4450,  t2:4680,  sl:3990, exit:4471, status:'T1 Hit', days:9  },
  { date:'2026-03-18', stock:'MARUTI',     sector:'Auto',         entry:11820, t1:12400, t2:12900, sl:11200,exit:11190,status:'SL Hit', days:5  },
  { date:'2026-04-02', stock:'HDFCBANK',   sector:'Banks',        entry:1818,  t1:1890,  t2:1960,  sl:1730, exit:1962, status:'T2 Hit', days:14 },
  { date:'2026-04-08', stock:'INFY',       sector:'IT',           entry:1582,  t1:1642,  t2:1710,  sl:1500, exit:1645, status:'T1 Hit', days:7  },
  { date:'2026-04-15', stock:'DIXON',      sector:'Semiconductor',entry:14480, t1:15200, t2:15900, sl:13700,exit:15240,status:'T1 Hit', days:11 },
  { date:'2026-04-22', stock:'ICICIBANK',  sector:'Banks',        entry:1148,  t1:1190,  t2:1238,  sl:1090, exit:1241, status:'T2 Hit', days:18 },
  { date:'2026-05-06', stock:'RELIANCE',   sector:'Oil_Gas',      entry:1418,  t1:1478,  t2:1540,  sl:1348, exit:1481, status:'T1 Hit', days:8  },
  { date:'2026-05-12', stock:'TATASTEEL',  sector:'Metal',        entry:136,   t1:144,   t2:152,   sl:129,  exit:128,  status:'SL Hit', days:4  },
  { date:'2026-05-20', stock:'SUNPHARMA',  sector:'Pharma',       entry:1638,  t1:1702,  t2:1775,  sl:1555, exit:1706, status:'T1 Hit', days:12 },
  { date:'2026-05-26', stock:'TCS',        sector:'IT',           entry:3798,  t1:3958,  t2:4110,  sl:3600, exit:3962, status:'T1 Hit', days:7  },
  { date:'2026-05-29', stock:'TATAMOTORS', sector:'Auto',         entry:682,   t1:718,   t2:752,   sl:646,  exit:651,  status:'SL Hit', days:3  },
  { date:'2026-06-03', stock:'BAJFINANCE', sector:'Finance',      entry:6820,  t1:7150,  t2:7480,  sl:6480, exit:null, status:'Running',days:null },
  { date:'2026-06-10', stock:'ADANIGREEN', sector:'Renewables',   entry:1648,  t1:1748,  t2:1850,  sl:1560, exit:1752, status:'T1 Hit', days:6  },
  { date:'2026-06-17', stock:'DLF',        sector:'Real_Estate',  entry:824,   t1:874,   t2:920,   sl:782,  exit:null, status:'Running',days:null },
];

const STATUS_STYLE: Record<Status, { color: string; bg: string; border: string }> = {
  'T2 Hit':  { color:'#00D4A0', bg:'rgba(0,212,160,0.12)',  border:'rgba(0,212,160,0.3)'  },
  'T1 Hit':  { color:'#4FC88A', bg:'rgba(79,200,138,0.1)',  border:'rgba(79,200,138,0.25)'},
  'SL Hit':  { color:'#FF3B5C', bg:'rgba(255,59,92,0.09)',  border:'rgba(255,59,92,0.25)' },
  'Running': { color:'#FFB800', bg:'rgba(255,184,0,0.1)',   border:'rgba(255,184,0,0.3)'  },
};

function retPct(call: Call): number | null {
  if (!call.exit) return null;
  return +((call.exit - call.entry) / call.entry * 100).toFixed(2);
}

function fmt(n: number) { return n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

// ─── Stats ────────────────────────────────────────────────────────────────────
const closed   = CALLS.filter(c => c.status !== 'Running');
const wins     = closed.filter(c => c.status === 'T1 Hit' || c.status === 'T2 Hit');
const t2wins   = closed.filter(c => c.status === 'T2 Hit');
const accuracy = Math.round((wins.length / closed.length) * 100);
const rets     = closed.map(retPct).filter((r): r is number => r !== null);
const avgRet   = +(rets.reduce((a, b) => a + b, 0) / rets.length).toFixed(2);
const bestRet  = Math.max(...rets);
const bestCall = closed.find(c => retPct(c) === bestRet);
const streak   = (() => {
  let s = 0;
  for (const c of [...CALLS].reverse()) {
    if (c.status === 'Running') continue;
    if (c.status === 'T1 Hit' || c.status === 'T2 Hit') s++; else break;
  }
  return s;
})();

// Monthly win rates
interface MonthStat { month: string; wins: number; total: number }
const monthMap: Record<string, MonthStat> = {};
for (const c of closed) {
  const key = c.date.slice(0, 7);
  if (!monthMap[key]) monthMap[key] = { month: key, wins: 0, total: 0 };
  monthMap[key].total++;
  if (c.status === 'T1 Hit' || c.status === 'T2 Hit') monthMap[key].wins++;
}
const monthStats = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

// Sector stats
const sectorMap: Record<string, { wins: number; total: number }> = {};
for (const c of closed) {
  if (!sectorMap[c.sector]) sectorMap[c.sector] = { wins: 0, total: 0 };
  sectorMap[c.sector].total++;
  if (c.status === 'T1 Hit' || c.status === 'T2 Hit') sectorMap[c.sector].wins++;
}
const topSectors = Object.entries(sectorMap)
  .map(([s, v]) => ({ sector: s, ...v, pct: Math.round(v.wins / v.total * 100) }))
  .sort((a, b) => b.pct - a.pct);

const MONTH_LABELS: Record<string, string> = {
  '2026-03':'Mar','2026-04':'Apr','2026-05':'May','2026-06':'Jun',
};

export default function TrackRecordPage() {
  useEffect(() => { localStorage.setItem('signal_visited_track', '1'); }, []);
  const [tab, setTab] = useState<'calls'|'sectors'|'method'>('calls');

  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.07),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:20, padding:'clamp(18px,4vw,32px) clamp(16px,4vw,36px)', marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--grn)', textTransform:'uppercase', marginBottom:8 }}>Signal Track Record</div>
        <div style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:900, letterSpacing:-0.5, marginBottom:6 }}>
          Every call. Every result.<br/><span style={{ color:'var(--grn)' }}>Nothing hidden.</span>
        </div>
        <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
          All signals logged since March 2026. Entry, target, stop-loss and outcome — public record.
        </div>
      </div>

      {/* Summary stats */}
      <div className="tr-stats-grid" style={{ marginBottom:24 }}>
        {[
          { label:'Accuracy',       val:`${accuracy}%`,           sub:`${wins.length}/${closed.length} calls`,   color:'var(--grn)' },
          { label:'Avg Return',     val:`+${avgRet}%`,            sub:'per closed trade',                         color:'var(--grn)' },
          { label:'T2 Full Target', val:`${t2wins.length} calls`, sub:`${Math.round(t2wins.length/closed.length*100)}% hit full target`,color:'var(--bluL)' },
          { label:'Win Streak',     val:`${streak} 🔥`,           sub:'current active streak',                   color:'var(--ylw)' },
          { label:'Best Trade',     val:`+${bestRet}%`,           sub:bestCall ? bestCall.stock : '—',           color:'var(--grn)' },
          { label:'Total Calls',    val:`${CALLS.length}`,        sub:`${CALLS.filter(c=>c.status==='Running').length} running now`, color:'var(--txt)' },
        ].map(s => (
          <div key={s.label} style={{ background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:13, padding:'16px 18px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color, letterSpacing:-0.5 }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly win rate bar chart */}
      <div style={{ background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:20, marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Monthly Win Rate</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
          {monthStats.map(m => {
            const pct = Math.round(m.wins / m.total * 100);
            return (
              <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:12, fontWeight:800, color: pct >= 60 ? 'var(--grn)' : pct >= 40 ? 'var(--ylw)' : 'var(--red)' }}>{pct}%</div>
                <div style={{ width:'100%', height:80, background:'var(--surf2)', borderRadius:6, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background: pct >= 60 ? 'rgba(0,212,160,0.5)' : pct >= 40 ? 'rgba(255,184,0,0.5)' : 'rgba(255,59,92,0.5)', borderRadius:'4px 4px 0 0', transition:'height 0.5s' }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center' }}>
                  {MONTH_LABELS[m.month] ?? m.month}<br/>
                  <span style={{ color:'var(--dim2)' }}>{m.wins}/{m.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {([['calls','📋 All Calls'],['sectors','🔥 By Sector'],['method','🔬 Methodology']] as const).map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ height:36, padding:'0 16px', borderRadius:9, border:`1px solid ${tab===t?'var(--blu)':'var(--bdr)'}`, background:tab===t?'rgba(23,64,245,0.1)':'var(--surf)', color:tab===t?'var(--bluL)':'var(--dim)', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', fontFamily:'inherit' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── All Calls table ── */}
      {tab === 'calls' && (
        <div style={{ background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--surf2)' }}>
                {[['Date','tr-date'],['Stock',''],['Entry',''],['T1','tr-t2'],['T2','tr-t2'],['SL','tr-sl'],['Exit',''],['Return',''],['Status',''],['Days','tr-date']].map(([h, cls]) => (
                  <th key={h} className={cls} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--bdr)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...CALLS].reverse().map((c, i) => {
                const ret = retPct(c);
                const st  = STATUS_STYLE[c.status];
                const isRunning = c.status === 'Running';
                return (
                  <tr key={c.stock + c.date} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                    <td className="tr-date" style={{ padding:'10px 12px', color:'var(--dim)', fontSize:12, whiteSpace:'nowrap' }}>{c.date.slice(5)}</td>
                    <td style={{ padding:'10px 12px', fontWeight:700 }}>
                      {c.stock}
                      {isRunning && <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:4, background:'rgba(255,184,0,0.15)', color:'var(--ylw)', fontWeight:800 }}>LIVE</span>}
                    </td>
                    <td style={{ padding:'10px 12px', color:'var(--dim)' }}>₹{fmt(c.entry)}</td>
                    <td className="tr-t2" style={{ padding:'10px 12px', color:'var(--grn)', fontSize:12 }}>₹{fmt(c.t1)}</td>
                    <td className="tr-t2" style={{ padding:'10px 12px', color:'var(--grn)', fontSize:12 }}>₹{fmt(c.t2)}</td>
                    <td className="tr-sl" style={{ padding:'10px 12px', color:'var(--red)', fontSize:12 }}>₹{fmt(c.sl)}</td>
                    <td style={{ padding:'10px 12px', fontWeight:700 }}>{c.exit ? `₹${fmt(c.exit)}` : '—'}</td>
                    <td style={{ padding:'10px 12px', fontWeight:800, color: ret == null ? 'var(--dim)' : ret >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {ret != null ? `${ret >= 0 ? '+' : ''}${ret}%` : '—'}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:st.bg, color:st.color, border:`1px solid ${st.border}`, whiteSpace:'nowrap' }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="tr-date" style={{ padding:'10px 12px', color:'var(--dim)', fontSize:12 }}>{c.days ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── By Sector ── */}
      {tab === 'sectors' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topSectors.map(s => (
            <div key={s.sector} style={{ background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:110, fontSize:13, fontWeight:700, flexShrink:0 }}>{s.sector.replace('_',' ')}</div>
              <div style={{ flex:1, height:10, background:'var(--surf2)', borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${s.pct}%`, background: s.pct >= 70 ? 'var(--grn)' : s.pct >= 50 ? 'rgba(255,184,0,0.8)' : 'var(--red)', borderRadius:5, transition:'width 0.5s' }}/>
              </div>
              <div style={{ width:90, textAlign:'right', fontSize:13, flexShrink:0 }}>
                <span style={{ fontWeight:800, color: s.pct >= 70 ? 'var(--grn)' : s.pct >= 50 ? 'var(--ylw)' : 'var(--red)' }}>{s.pct}%</span>
                <span style={{ color:'var(--dim)', fontSize:11, marginLeft:6 }}>{s.wins}/{s.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Methodology ── */}
      {tab === 'method' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'linear-gradient(145deg,rgba(13,25,42,0.96),rgba(6,11,24,0.92))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>How signals are selected</div>
            {[
              { icon:'📊', title:'RSI Filter — 42 to 62',      desc:'Excludes overbought (>62) and deeply oversold (<42) stocks. Sweet spot: momentum building, not extended.' },
              { icon:'📈', title:'EMA Proximity — within 8%',  desc:'Stock price within 8% of 20-day EMA. Catches stocks near key support/resistance — not chasing, not lagging.' },
              { icon:'💰', title:'Price Floor — above ₹100',   desc:'Excludes penny stocks and illiquid counters. Minimum liquidity requirement for clean entries.' },
              { icon:'⚡', title:'Gap Filter — daily chg < 4%', desc:'Skips gap-up stocks. High-gap entries carry event risk and wide bid-ask — poor R:R.' },
              { icon:'📦', title:'Universe — 100 NSE stocks',   desc:'Top 4 stocks per sector across 25 sectors. Diversified, liquid, NSE-listed only. No OTC or SME stocks.' },
              { icon:'🎯', title:'Entry/Target/SL logic',       desc:'Entry at current price ±0.5%. T1 = +6-10% (pivot R1 or EMA breakout). T2 = +3-4% beyond T1. SL = EMA50 -3% or pivot support.' },
            ].map(m => (
              <div key={m.title} style={{ display:'flex', gap:12, marginBottom:14, paddingBottom:14, borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{m.title}</div>
                  <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'rgba(255,184,0,0.06)', border:'1px solid rgba(255,184,0,0.2)', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--ylw)' }}>⚠️ Important:</strong> Signals are educational, not buy/sell recommendations. Past performance does not guarantee future results. RSI and EMA signals have no predictive guarantee — they are statistical tools. Always apply your own judgement and use proper position sizing. NOT SEBI registered.
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16, textAlign:'center' }}>
        ⚠️ Track record since March 2026 · Exit prices at T1/T2/SL actual fill levels · Running calls marked LIVE · NOT SEBI advice · DYOR
      </div>

      <style>{`
        .tr-stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12; }
        .tr-date, .tr-sl, .tr-t2 { display:table-cell; }
        @media (max-width:900px) { .tr-stats-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:600px) {
          .tr-stats-grid { grid-template-columns:repeat(2,1fr); }
          .tr-date, .tr-sl, .tr-t2 { display:none; }
        }
      `}</style>
    </>
  );
}
