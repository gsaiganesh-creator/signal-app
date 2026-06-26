'use client';
import { useState, useEffect } from 'react';

interface ZoneStat {
  zone:       string;
  count:      number;
  avg_return: number | null;
  accuracy:   number | null;
}

interface MonthStat {
  month: string;
  wins:  number;
  total: number;
  pct:   number;
}

interface ScanEntry {
  scanned_at: string;
  symbol:     string;
  exchange:   string;
  scan_score: string;
  price_at:   number;
  rsi14:      number | null;
  confidence: number | null;
  return_30d: number | null;
}

interface ScanStats {
  total_scanned:   number;
  closed_count:    number;
  sm_accuracy_pct: number | null;
  zone_stats:      ZoneStat[];
  month_stats:     MonthStat[];
}

interface ScanLogResp {
  entries:      ScanEntry[];
  total_rows:   number;
  stats:        ScanStats | null;
  setup_needed?: boolean;
}

const MONTH_LABEL: Record<string, string> = {
  '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
  '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
};

const ZONE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  'Strong Momentum':  { color:'var(--grn)',  bg:'rgba(0,212,160,0.10)',  border:'rgba(0,212,160,0.25)'  },
  'Building':         { color:'var(--bluL)', bg:'rgba(79,111,250,0.10)', border:'rgba(79,111,250,0.25)' },
  'Sideways':         { color:'var(--ylw)',  bg:'rgba(255,184,0,0.10)',  border:'rgba(255,184,0,0.25)'  },
  'Weak / Declining': { color:'var(--red)',  bg:'rgba(255,59,92,0.10)',  border:'rgba(255,59,92,0.25)'  },
};

export default function TrackRecordPage() {
  const [data,    setData]    = useState<ScanLogResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'zones' | 'log' | 'method'>('zones');

  useEffect(() => {
    localStorage.setItem('signal_visited_track', '1');
    fetch('/api/scan-log?days=90&limit=200')
      .then(r => r.ok ? r.json() as Promise<ScanLogResp> : null)
      .then(d  => { setData(d); setLoading(false); })
      .catch(()  => setLoading(false));
  }, []);

  const stats       = data?.stats ?? null;
  const entries     = data?.entries ?? [];
  const setupNeeded = data?.setup_needed === true;
  const hasData     = entries.length > 0;
  const uniqueStocks = new Set(entries.map(e => e.symbol)).size;

  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.07),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:20, padding:'clamp(18px,4vw,32px) clamp(16px,4vw,36px)', marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--grn)', textTransform:'uppercase', marginBottom:8 }}>ML Scan Track Record</div>
        <div style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:900, letterSpacing:-0.5, marginBottom:6 }}>
          Scan accuracy. Logged daily.<br/>
          <span style={{ color:'var(--grn)' }}>Outcomes verified after 30 days.</span>
        </div>
        <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, maxWidth:520 }}>
          Every scan result logged automatically with momentum zone and price. 30 days later the actual price is fetched and accuracy is measured. No hand-picked entries — fully automated.
        </div>
      </div>

      {/* Setup banner */}
      {!loading && setupNeeded && (
        <div style={{ background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.25)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>⚙️ One-time setup required</div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6 }}>
            Run the SQL block at the top of <code style={{ fontSize:12, color:'var(--grn)' }}>apps/web/app/api/scan-log/route.ts</code> in your Supabase SQL Editor to create the <code>scan_log</code> table.
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="tr-stats-grid" style={{ marginBottom:24 }}>
        {[
          { label:'Scans Logged',         val: loading ? '—' : `${stats?.total_scanned ?? 0}`,  sub:'total scan records',           color:'var(--txt)'  },
          { label:'Outcomes Verified',     val: loading ? '—' : `${stats?.closed_count ?? 0}`,  sub:'30-day prices filled in',      color:'var(--bluL)' },
          { label:'Strong Mmt Accuracy',   val: loading ? '—' : stats?.sm_accuracy_pct != null ? `${stats.sm_accuracy_pct}%` : 'N/A', sub:'% price up after 30d', color:'var(--grn)' },
          { label:'Unique Stocks',         val: loading ? '—' : `${uniqueStocks}`,               sub:'distinct stocks scanned',      color:'var(--ylw)'  },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:13, padding:'16px 18px' }}>
            <div style={{ fontSize:11, color:'var(--dim)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color, letterSpacing:-0.5 }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* No data yet */}
      {!loading && !setupNeeded && !hasData && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'40px 24px', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Scan log is building</div>
          <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.7, maxWidth:400, margin:'0 auto' }}>
            No scan results logged yet. Visit the <strong>Signals</strong> page to trigger the screener — each run logs results here automatically. After 30 days, accuracy outcomes appear.
          </div>
        </div>
      )}

      {/* Monthly accuracy chart — only when outcomes exist */}
      {!loading && stats && stats.month_stats.length > 0 && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Strong Momentum — Monthly Accuracy</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>% of Strong Momentum scans where price rose within 30 days</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
            {stats.month_stats.map(m => (
              <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:12, fontWeight:800, color: m.pct >= 60 ? 'var(--grn)' : m.pct >= 40 ? 'var(--ylw)' : 'var(--red)' }}>{m.pct}%</div>
                <div style={{ width:'100%', height:80, background:'var(--surf2)', borderRadius:6, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${m.pct}%`, background: m.pct >= 60 ? 'rgba(0,212,160,0.5)' : m.pct >= 40 ? 'rgba(255,184,0,0.5)' : 'rgba(255,59,92,0.5)', borderRadius:'4px 4px 0 0', transition:'height 0.5s' }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', textAlign:'center' }}>
                  {MONTH_LABEL[m.month.slice(5)] ?? m.month}<br/>
                  <span style={{ color:'var(--dim2)' }}>{m.wins}/{m.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + content */}
      {!setupNeeded && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {([['zones','📊 Zone Accuracy'],['log','📋 Scan Log'],['method','🔬 Methodology']] as const).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ height:36, padding:'0 16px', borderRadius:9, border:`1px solid ${tab===t?'var(--blu)':'var(--bdr)'}`, background:tab===t?'rgba(23,64,245,0.1)':'var(--surf)', color:tab===t?'var(--bluL)':'var(--dim)', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Zone Accuracy */}
          {tab === 'zones' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {!loading && !hasData && (
                <div style={{ fontSize:13, color:'var(--dim)', padding:'16px', textAlign:'center', background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:12 }}>
                  No scan data yet — zone accuracy will appear after the screener runs and 30 days pass.
                </div>
              )}
              {(stats?.zone_stats ?? []).filter(z => z.count > 0).map(z => {
                const zc = ZONE_CFG[z.zone] ?? { color:'var(--dim)', bg:'var(--surf)', border:'var(--bdr)' };
                return (
                  <div key={z.zone} style={{ background:'var(--card-bg)', border:`1px solid ${zc.border}`, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:20 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:zc.color, marginBottom:4 }}>{z.zone}</div>
                      <div style={{ fontSize:12, color:'var(--dim)' }}>{z.count} scans with 30-day outcomes verified</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:22, fontWeight:900, color: z.accuracy == null ? 'var(--dim)' : z.accuracy >= 60 ? 'var(--grn)' : z.accuracy >= 40 ? 'var(--ylw)' : 'var(--red)' }}>
                        {z.accuracy != null ? `${z.accuracy}%` : 'N/A'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--dim)' }}>
                        accuracy · avg {z.avg_return != null ? `${z.avg_return > 0 ? '+' : ''}${z.avg_return}%` : 'N/A'} / 30d
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scan Log */}
          {tab === 'log' && (
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden' }}>
              {entries.length === 0 ? (
                <div style={{ padding:'32px 24px', textAlign:'center', color:'var(--dim)', fontSize:13 }}>
                  No scan results logged yet. Visit the Signals page to run the screener.
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--surf2)' }}>
                      {[['Date',''],['Symbol',''],['Zone','tr-zone'],['Price At Scan',''],['30d Return',''],['RSI','tr-rsi'],['Score','tr-rsi']].map(([h, cls]) => (
                        <th key={h} className={cls} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--bdr)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const zc = ZONE_CFG[e.scan_score] ?? { color:'var(--dim)', bg:'var(--surf)', border:'var(--bdr)' };
                      return (
                        <tr key={`${e.scanned_at}-${e.symbol}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                          <td style={{ padding:'10px 12px', color:'var(--dim)', fontSize:12, whiteSpace:'nowrap' }}>{e.scanned_at.slice(5)}</td>
                          <td style={{ padding:'10px 12px', fontWeight:700 }}>{e.symbol}</td>
                          <td className="tr-zone" style={{ padding:'10px 12px' }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:zc.bg, color:zc.color, border:`1px solid ${zc.border}` }}>{e.scan_score}</span>
                          </td>
                          <td style={{ padding:'10px 12px', color:'var(--dim)' }}>₹{e.price_at.toLocaleString('en-IN',{ maximumFractionDigits:2 })}</td>
                          <td style={{ padding:'10px 12px', fontWeight:800, color: e.return_30d == null ? 'var(--dim)' : e.return_30d >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                            {e.return_30d != null ? `${e.return_30d >= 0 ? '+' : ''}${e.return_30d}%` : '⏳ pending'}
                          </td>
                          <td className="tr-rsi" style={{ padding:'10px 12px', color:'var(--dim)', fontSize:12 }}>{e.rsi14 ?? '—'}</td>
                          <td className="tr-rsi" style={{ padding:'10px 12px', color:'var(--dim)', fontSize:12 }}>{e.confidence != null ? `${e.confidence}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Methodology */}
          {tab === 'method' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>How scans are logged and verified</div>
                {[
                  { icon:'📊', title:'RSI Filter — 42 to 62',      desc:'Excludes overbought (>62) and deeply oversold (<42) stocks. Sweet spot: momentum building, not extended.' },
                  { icon:'📈', title:'EMA Proximity — within 8%',  desc:'Stock price within 8% of 20-day EMA. Catches stocks near key support/resistance — not chasing, not lagging.' },
                  { icon:'💰', title:'Price Floor — above ₹100',   desc:'Excludes penny stocks and illiquid counters. Minimum liquidity requirement for clean entries.' },
                  { icon:'📦', title:'Universe — 100 NSE stocks',   desc:'Top 4 stocks per sector across 25 sectors. Diversified, liquid, NSE-listed only. No OTC or SME stocks.' },
                  { icon:'🗃️', title:'Auto-logging at scan time',   desc:'When the screener runs, every result is saved: date, symbol, momentum zone, price, RSI, confidence score. No manual selection.' },
                  { icon:'⏱️', title:'30-day outcome backfill',     desc:'A daily job fetches actual price 30 days after each scan and computes the return. This is what drives the accuracy stats.' },
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
                  <strong style={{ color:'var(--ylw)' }}>⚠️ Important:</strong> Scan results are technical screening output — RSI + EMA zone classifications that show <em>where price technically sits</em>, not what to do. Accuracy stats describe past scan performance, not a guarantee of future results. NOT SEBI registered · Not investment advice · DYOR.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize:11, color:'var(--dim2)', marginTop:16, textAlign:'center' }}>
        ⚠️ <strong style={{ color:'var(--ylw)' }}>NOT SEBI REGISTERED</strong> · Technical screening only · Outcomes at 30-day market price · Not investment advice · DYOR
      </div>

      <style>{`
        .tr-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12; }
        .tr-zone, .tr-rsi { display:table-cell; }
        @media (max-width:900px) { .tr-stats-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:600px) {
          .tr-stats-grid { grid-template-columns:repeat(2,1fr); }
          .tr-zone, .tr-rsi { display:none; }
        }
      `}</style>
    </>
  );
}
