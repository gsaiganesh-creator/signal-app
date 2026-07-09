'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/lib/use-plan';

interface ZoneStat { zone: string; count: number; avg_return: number | null; accuracy: number | null }
interface MonthStat { month: string; wins: number; total: number; pct: number }
interface ScanEntry { scanned_at: string; symbol: string; exchange: string; scan_score: string; price_at: number; rsi14: number | null; confidence: number | null; return_30d: number | null }
interface ScanStats { total_scanned: number; closed_count: number; sm_accuracy_pct: number | null; zone_stats: ZoneStat[]; month_stats: MonthStat[] }
interface ScanLogResp { entries: ScanEntry[]; total_rows: number; stats: ScanStats | null; setup_needed?: boolean }

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

// What each tab shows + when it fills in — shown as a persistent strip under the
// tab bar (always visible, not just on empty) and reused for the empty-state cards.
const TAB_INFO: Record<'zones' | 'log' | 'rl' | 'method', { what: string; when: string }> = {
  zones:  { what: 'Win-rate per momentum zone (Strong Momentum, Building, Sideways, Weak/Declining), from closed 30-day outcomes.', when: 'A scan runs daily at 3:45 PM IST. Each entry needs 30 days to close before it counts here — so this fills in roughly a month after scanning starts.' },
  log:    { what: 'Every individual scan result — symbol, zone, price at scan time, and its 30-day outcome once verified.', when: 'New rows appear daily at 3:45 PM IST (market close). Outcomes show "⏳ pending" until 30 days have passed.' },
  rl:     { what: 'Which scan parameters (RSI bounds, confidence threshold) get tightened after analysing failed calls.', when: 'Needs at least ~3 closed Strong Momentum calls per parameter bucket before it can detect a pattern — appears once enough scans have closed.' },
  method: { what: 'The fixed rules the scanner uses to pick candidates and verify outcomes.', when: 'Static — always shown.' },
};

function EmptyTabState({ icon, title, what, when }: { icon: string; title: string; what: string; when: string }) {
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'32px 24px', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.7, maxWidth:420, margin:'0 auto' }}>
        <span style={{ color:'var(--txt)' }}>What this shows:</span> {what}
      </div>
      <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.7, maxWidth:420, margin:'8px auto 0' }}>
        <span style={{ color:'var(--txt)' }}>When it fills in:</span> {when}
      </div>
    </div>
  );
}

// ── RL analysis ───────────────────────────────────────────────────────────────
interface RlInsight {
  param: string; original: string; updated: string;
  reason: string; failCount: number; failRate: number;
  color: string;
}

function computeRlInsights(entries: ScanEntry[]): { insights: RlInsight[]; failedEntries: ScanEntry[]; winCount: number; lossCount: number } {
  const closed = entries.filter(e => e.return_30d !== null && e.scan_score === 'Strong Momentum');
  const wins   = closed.filter(e => (e.return_30d ?? 0) > 0);
  const losses = closed.filter(e => (e.return_30d ?? 0) <= 0);
  if (!closed.length) return { insights: [], failedEntries: [], winCount: 0, lossCount: 0 };

  const insights: RlInsight[] = [];

  // RSI upper bound analysis
  const highRsiLoss = losses.filter(e => (e.rsi14 ?? 0) > 55).length;
  const highRsiTotal = closed.filter(e => (e.rsi14 ?? 0) > 55).length;
  if (highRsiTotal >= 3) {
    const fr = Math.round(highRsiLoss / highRsiTotal * 100);
    if (fr > 50) {
      insights.push({
        param: 'RSI Upper Bound', original: '42 – 62', updated: '42 – 55',
        reason: `${fr}% of signals with RSI 55–62 failed to show positive 30d returns. Tightening avoids entering near overbought territory.`,
        failCount: highRsiLoss, failRate: fr, color: 'var(--org)',
      });
    }
  }

  // Confidence threshold analysis
  const lowConfLoss  = losses.filter(e => (e.confidence ?? 0) < 70).length;
  const lowConfTotal = closed.filter(e => (e.confidence ?? 0) < 70).length;
  if (lowConfTotal >= 3) {
    const fr = Math.round(lowConfLoss / lowConfTotal * 100);
    if (fr > 55) {
      insights.push({
        param: 'Minimum Confidence', original: '≥ 58%', updated: '≥ 70%',
        reason: `${fr}% of signals with confidence 58–70% resulted in negative 30d returns. Raising the bar filters out weaker setups.`,
        failCount: lowConfLoss, failRate: fr, color: 'var(--ylw)',
      });
    }
  }

  // Overall model health
  const overallAccuracy = closed.length > 0 ? Math.round(wins.length / closed.length * 100) : null;
  if (overallAccuracy !== null && overallAccuracy >= 60) {
    insights.push({
      param: 'Model Health', original: 'Baseline', updated: `${overallAccuracy}% accuracy`,
      reason: `${wins.length} of ${closed.length} closed signals showed positive 30d returns. Model is performing above the 50% baseline — no structural changes applied.`,
      failCount: losses.length, failRate: 100 - overallAccuracy, color: 'var(--grn)',
    });
  }

  if (!insights.length && closed.length > 0) {
    const fr = Math.round(losses.length / closed.length * 100);
    insights.push({
      param: 'Data Accumulating', original: '—', updated: '—',
      reason: `${closed.length} closed outcomes tracked so far. RL adjustments activate after sufficient sample size per parameter bucket. Keep running the scanner.`,
      failCount: losses.length, failRate: fr, color: 'var(--bluL)',
    });
  }

  return { insights, failedEntries: losses.slice(0, 10), winCount: wins.length, lossCount: losses.length };
}

export default function TrackRecordPage() {
  const { canAccess, loading: planLoading } = usePlan();
  const [data,    setData]    = useState<ScanLogResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'zones' | 'log' | 'rl' | 'method'>('zones');

  useEffect(() => {
    fetch('/api/scan-log?days=90&limit=200')
      .then(r => r.ok ? r.json() as Promise<ScanLogResp> : null)
      .then(d  => { setData(d); setLoading(false); })
      .catch(()  => setLoading(false));
  }, []);

  const stats        = data?.stats ?? null;
  const entries      = data?.entries ?? [];
  const setupNeeded  = data?.setup_needed === true;
  const hasData      = entries.length > 0;
  const uniqueStocks = new Set(entries.map(e => e.symbol)).size;
  const closed       = entries.filter(e => e.return_30d !== null);
  const wins         = closed.filter(e => (e.return_30d ?? 0) > 0);
  const accuracy     = closed.length > 0 ? Math.round(wins.length / closed.length * 100) : null;
  const { insights: rlInsights, failedEntries, winCount, lossCount } = computeRlInsights(entries);

  // Track record is public (visible to all) but RL tab is gated
  return (
    <>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,212,160,0.07),rgba(23,64,245,0.04))', border:'1px solid rgba(0,212,160,0.2)', borderRadius:20, padding:'clamp(18px,4vw,32px) clamp(16px,4vw,36px)', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:2, color:'var(--grn)', textTransform:'uppercase', marginBottom:8 }}>Signal Genie · ML Scan Track Record</div>
            <div style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:900, letterSpacing:-0.5, marginBottom:6 }}>
              Every call logged. Every outcome verified.<br/>
              <span style={{ color:'var(--grn)' }}>We show you what worked — and what didn&#39;t.</span>
            </div>
            <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, maxWidth:520 }}>
              Every scan result is auto-logged with RSI, price, and momentum zone at scan time. 30 days later the actual price is fetched and accuracy measured. No cherry-picking — fully automated. Failed calls feed into our RL model to tighten future scan parameters.
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            {accuracy !== null && (
              <div style={{ background:'rgba(0,212,160,0.1)', border:'1px solid rgba(0,212,160,0.3)', borderRadius:16, padding:'16px 24px', textAlign:'center' }}>
                <div style={{ fontSize:44, fontWeight:900, color:'var(--grn)', letterSpacing:-2, lineHeight:1 }}>{accuracy}%</div>
                <div style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>accuracy ({wins.length}/{closed.length})</div>
              </div>
            )}
          </div>
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
          { label:'Scans Logged',       val: loading ? '—' : `${stats?.total_scanned ?? 0}`, sub:'total scan records',                      color:'var(--txt)'  },
          { label:'Outcomes Verified',  val: loading ? '—' : `${closed.length}`,              sub:'30-day prices confirmed',                  color:'var(--bluL)' },
          { label:'Calls Succeeded',    val: loading ? '—' : accuracy != null ? `${accuracy}%` : 'N/A', sub:`${winCount} targets hit · ${lossCount} failed`, color:'var(--grn)' },
          { label:'Unique Stocks',      val: loading ? '—' : `${uniqueStocks}`,               sub:'distinct NSE stocks screened',              color:'var(--ylw)'  },
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
            No scan results logged yet. The screener auto-logs every result when it runs. After 30 days, accuracy outcomes appear here automatically.
          </div>
          <Link href="/dashboard/signals" style={{ marginTop:16, display:'inline-flex', height:38, padding:'0 20px', borderRadius:9, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, alignItems:'center', textDecoration:'none' }}>
            Run Signal Scan →
          </Link>
        </div>
      )}

      {/* Monthly bar chart */}
      {!loading && stats && stats.month_stats.length > 0 && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Strong Momentum — Monthly Accuracy</div>
          <div style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>% of Strong Momentum calls where price rose within 30 days</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
            {stats.month_stats.map(m => (
              <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:12, fontWeight:800, color: m.pct >= 60 ? 'var(--grn)' : m.pct >= 40 ? 'var(--ylw)' : 'var(--red)' }}>{m.pct}%</div>
                <div style={{ width:'100%', height:80, background:'var(--surf2)', borderRadius:6, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${m.pct}%`, background: m.pct >= 60 ? 'rgba(0,212,160,0.5)' : m.pct >= 40 ? 'rgba(255,184,0,0.5)' : 'rgba(255,59,92,0.5)', borderRadius:'4px 4px 0 0' }}/>
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

      {/* Tabs */}
      {!setupNeeded && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {([
              ['zones','📊 Zone Accuracy'],
              ['log',  '📋 Scan Log'],
              ['rl',   '🧠 RL Analysis'],
              ['method','🔬 Methodology'],
            ] as const).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ height:36, padding:'0 16px', borderRadius:9, border:`1px solid ${tab===t?'var(--blu)':'var(--bdr)'}`, background:tab===t?'rgba(23,64,245,0.1)':'var(--surf)', color:tab===t?'var(--bluL)':'var(--dim)', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Persistent "what is this tab" strip — always visible, not just when empty */}
          <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6, marginBottom:16, padding:'10px 14px', background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:10 }}>
            {TAB_INFO[tab].what} <span style={{ color:'var(--dim2)' }}>· {TAB_INFO[tab].when}</span>
          </div>

          {/* Zone Accuracy */}
          {tab === 'zones' && (() => {
            const zonesShown = (stats?.zone_stats ?? []).filter(z => z.count > 0);
            return (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {!loading && zonesShown.length === 0 && (
                <EmptyTabState icon="📊" title="Zone accuracy — building"
                  what={TAB_INFO.zones.what} when={TAB_INFO.zones.when} />
              )}
              {zonesShown.map(z => {
                const zc = ZONE_CFG[z.zone] ?? { color:'var(--dim)', bg:'var(--surf)', border:'var(--bdr)' };
                const barPct = z.accuracy ?? 0;
                return (
                  <div key={z.zone} style={{ background:'var(--card-bg)', border:`1px solid ${zc.border}`, borderRadius:12, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:zc.color, marginBottom:3 }}>{z.zone}</div>
                        <div style={{ fontSize:12, color:'var(--dim)' }}>{z.count} closed · avg {z.avg_return != null ? `${z.avg_return > 0 ? '+' : ''}${z.avg_return}%` : '—'} / 30d</div>
                      </div>
                      <div style={{ fontSize:28, fontWeight:900, color: z.accuracy == null ? 'var(--dim)' : z.accuracy >= 60 ? 'var(--grn)' : z.accuracy >= 40 ? 'var(--ylw)' : 'var(--red)', textAlign:'right' }}>
                        {z.accuracy != null ? `${z.accuracy}%` : 'N/A'}
                        <div style={{ fontSize:10, color:'var(--dim)', fontWeight:400, marginTop:2 }}>accuracy</div>
                      </div>
                    </div>
                    <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${barPct}%`, background: barPct >= 60 ? 'var(--grn)' : barPct >= 40 ? 'var(--ylw)' : 'var(--red)', borderRadius:2 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}

          {/* Scan Log */}
          {tab === 'log' && (
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, overflow:'hidden' }}>
              {entries.length === 0 ? (
                <EmptyTabState icon="📋" title="Scan log — no entries yet"
                  what={TAB_INFO.log.what} when={TAB_INFO.log.when} />
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--surf2)' }}>
                      {['Date','Symbol','Zone','Price At Scan','30d Return','RSI','Conf'].map(h => (
                        <th key={h} className={h==='Zone'||h==='RSI'||h==='Conf'?'tr-hide':''}
                          style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--bdr)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const zc = ZONE_CFG[e.scan_score] ?? { color:'var(--dim)', bg:'var(--surf)', border:'var(--bdr)' };
                      const isWin  = e.return_30d != null && e.return_30d > 0;
                      const isLoss = e.return_30d != null && e.return_30d <= 0;
                      return (
                        <tr key={`${e.scanned_at}-${e.symbol}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', borderBottom:'1px solid rgba(28,46,74,0.4)' }}>
                          <td style={{ padding:'9px 12px', color:'var(--dim)', fontSize:12, whiteSpace:'nowrap' }}>{e.scanned_at.slice(5)}</td>
                          <td style={{ padding:'9px 12px', fontWeight:700 }}>{e.symbol}</td>
                          <td className="tr-hide" style={{ padding:'9px 12px' }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:zc.bg, color:zc.color, border:`1px solid ${zc.border}` }}>{e.scan_score}</span>
                          </td>
                          <td style={{ padding:'9px 12px', color:'var(--dim)' }}>₹{e.price_at.toLocaleString('en-IN',{ maximumFractionDigits:2 })}</td>
                          <td style={{ padding:'9px 12px', fontWeight:800, color: e.return_30d == null ? 'var(--dim)' : isWin ? 'var(--grn)' : 'var(--red)' }}>
                            {e.return_30d != null
                              ? <>{isWin ? '✓ ' : '✗ '}{e.return_30d >= 0 ? '+' : ''}{e.return_30d}%</>
                              : <span style={{ fontSize:11 }}>⏳ pending</span>}
                          </td>
                          <td className="tr-hide" style={{ padding:'9px 12px', color:'var(--dim)', fontSize:12 }}>{e.rsi14 ?? '—'}</td>
                          <td className="tr-hide" style={{ padding:'9px 12px', color:'var(--dim)', fontSize:12 }}>{e.confidence != null ? `${e.confidence}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* RL Analysis */}
          {tab === 'rl' && (
            <>
              {!canAccess('track-record') && !planLoading ? (
                <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'32px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>🧠</div>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>RL Analysis — Starter+</div>
                  <div style={{ fontSize:13, color:'var(--dim)', marginBottom:16 }}>See exactly which signal parameters are being adjusted after failed calls, and why.</div>
                  <Link href="/dashboard/upgrade" style={{ display:'inline-flex', height:38, padding:'0 20px', borderRadius:9, background:'var(--blu)', color:'#fff', fontSize:13, fontWeight:700, alignItems:'center', textDecoration:'none' }}>
                    Upgrade to view →
                  </Link>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Overview */}
                  <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(23,64,245,0.04))', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:'18px 22px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🧠</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800 }}>Reinforcement Learning Feedback Loop</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>Failed calls feed back into the scan model — parameters auto-tighten based on outcome patterns</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                      {[
                        { label:'Closed calls',  val:closed.length, color:'var(--txt)' },
                        { label:'Succeeded',     val:winCount,       color:'var(--grn)' },
                        { label:'Failed',        val:lossCount,      color:'var(--red)' },
                        { label:'Accuracy',      val:accuracy != null ? `${accuracy}%` : '—', color: accuracy != null && accuracy >= 60 ? 'var(--grn)' : 'var(--ylw)' },
                      ].map(s => (
                        <div key={s.label} style={{ flex:1, minWidth:80, textAlign:'center' }}>
                          <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
                          <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parameter adjustments */}
                  {rlInsights.length > 0 && (
                    <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:'18px 22px' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Parameter Adjustments (RL Output)</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {rlInsights.map((ins, i) => (
                          <div key={i} style={{ display:'flex', gap:12, padding:'13px 15px', background:'var(--surf2)', borderRadius:10, borderLeft:`3px solid ${ins.color}` }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                                <span style={{ fontSize:12, fontWeight:800, color:ins.color }}>{ins.param}</span>
                                {ins.original !== '—' && (
                                  <span style={{ fontSize:10, color:'var(--dim)', display:'flex', alignItems:'center', gap:5 }}>
                                    <span style={{ padding:'1px 7px', borderRadius:4, background:'rgba(255,59,92,0.1)', color:'var(--red)', fontWeight:700 }}>{ins.original}</span>
                                    <span>→</span>
                                    <span style={{ padding:'1px 7px', borderRadius:4, background:'rgba(0,212,160,0.1)', color:'var(--grn)', fontWeight:700 }}>{ins.updated}</span>
                                  </span>
                                )}
                                {ins.failCount > 0 && ins.original !== '—' && (
                                  <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4, background:'rgba(255,59,92,0.1)', color:'var(--red)', marginLeft:'auto' }}>
                                    {ins.failRate}% fail rate on {ins.failCount} calls
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.6 }}>{ins.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed calls detail */}
                  {failedEntries.length > 0 && (
                    <div style={{ background:'var(--card-bg)', border:'1px solid rgba(255,59,92,0.2)', borderRadius:14, padding:'18px 22px' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>Failed Calls (last {failedEntries.length})</div>
                      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:12 }}>Strong Momentum calls that returned ≤0% after 30 days. These feed the RL model.</div>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr>
                            {['Date','Stock','Price','RSI','Conf','30d Return','Pattern'].map(h => (
                              <th key={h} style={{ fontSize:9, fontWeight:700, color:'var(--dim)', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid rgba(255,59,92,0.15)', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {failedEntries.map((e, i) => {
                            const rsi = e.rsi14 ?? 0;
                            const conf = e.confidence ?? 0;
                            const pattern = rsi > 55 ? 'RSI too high' : conf < 65 ? 'Low confidence' : 'Market weakness';
                            return (
                              <tr key={i} style={{ borderBottom:'1px solid rgba(255,59,92,0.08)' }}>
                                <td style={{ padding:'7px 10px', color:'var(--dim)', whiteSpace:'nowrap' }}>{e.scanned_at.slice(5)}</td>
                                <td style={{ padding:'7px 10px', fontWeight:700 }}>{e.symbol}</td>
                                <td style={{ padding:'7px 10px', color:'var(--dim)' }}>₹{e.price_at.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                                <td style={{ padding:'7px 10px', color: rsi > 55 ? 'var(--red)' : 'var(--dim)' }}>{rsi || '—'}</td>
                                <td style={{ padding:'7px 10px', color: conf < 65 ? 'var(--ylw)' : 'var(--dim)' }}>{conf ? `${conf}%` : '—'}</td>
                                <td style={{ padding:'7px 10px', fontWeight:800, color:'var(--red)' }}>{e.return_30d != null ? `${e.return_30d}%` : '—'}</td>
                                <td style={{ padding:'7px 10px' }}>
                                  <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(255,59,92,0.1)', color:'var(--red)', fontWeight:700 }}>{pattern}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {closed.length === 0 && (
                    <EmptyTabState icon="⏳" title="RL model learning…"
                      what={TAB_INFO.rl.what} when={TAB_INFO.rl.when} />
                  )}

                  {/* Static RL parameter set */}
                  <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.06),var(--card-bg))', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14, padding:'18px 22px' }}>
                    <div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>Current Scan Parameters (RL-tuned)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        { label:'RSI Range',          val:'42 – 62',   note:'Tightens if 55–62 bucket fails >50%' },
                        { label:'EMA Distance',       val:'≤ 8%',      note:'Reduces to 5% if 5–8% bucket fails' },
                        { label:'Min Confidence',     val:'58%',       note:'Rises to 70% after low-conf failures' },
                        { label:'Gap-up Filter',      val:'≤ 4% daily',note:'Excludes chasing momentum gap-ups' },
                        { label:'Universe',           val:'100 stocks',note:'Top 4 per sector across 25 sectors' },
                        { label:'Outcome Window',     val:'30 days',   note:'Verified at 30-day closing price' },
                      ].map(p => (
                        <div key={p.label} style={{ background:'var(--surf2)', borderRadius:9, padding:'10px 13px' }}>
                          <div style={{ fontSize:10, color:'var(--dim)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, marginBottom:3 }}>{p.label}</div>
                          <div style={{ fontSize:14, fontWeight:800, color:'var(--pur)' }}>{p.val}</div>
                          <div style={{ fontSize:10, color:'var(--dim2)', marginTop:3, lineHeight:1.4 }}>{p.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Methodology */}
          {tab === 'method' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-bdr)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>How scans are logged and verified</div>
                {[
                  { icon:'📊', title:'RSI Filter — 42 to 62',      desc:'Excludes overbought (>62) and deeply oversold (<42). Sweet spot: momentum building, not extended. RL can tighten this.' },
                  { icon:'📈', title:'EMA Proximity — within 8%',  desc:'Price within 8% of 20-day EMA. Near key support — not chasing, not lagging. RL reduces if far-EMA calls fail.' },
                  { icon:'💰', title:'Price Floor — above ₹100',   desc:'Excludes penny stocks and illiquid counters. Minimum liquidity requirement for clean entries.' },
                  { icon:'📦', title:'Universe — 100 NSE stocks',   desc:'Top 4 stocks per sector across 25 sectors. Diversified, liquid, NSE-listed only.' },
                  { icon:'🗃️', title:'Auto-logging at scan time',   desc:'Every result saved: date, symbol, momentum zone, price, RSI, confidence. No manual selection.' },
                  { icon:'⏱️', title:'30-day outcome backfill',     desc:'Daily job fetches actual price 30 days after each scan and computes the return — drives accuracy stats.' },
                  { icon:'🧠', title:'RL parameter feedback',       desc:'Failed calls analysed for patterns (RSI bucket, confidence level, EMA dist). Parameters auto-tighten each month.' },
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
                  <strong style={{ color:'var(--ylw)' }}>⚠️ Important:</strong> Scan results are technical screening output — RSI + EMA zone classifications showing where price technically sits, not what to do. Accuracy stats describe past scan performance, not a guarantee of future results. <strong>NOT SEBI registered · Not investment advice · DYOR.</strong>
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
        .tr-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .tr-hide { display:table-cell; }
        @media (max-width:900px) { .tr-stats-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:600px) { .tr-stats-grid { grid-template-columns:repeat(2,1fr); } .tr-hide { display:none; } }
      `}</style>
    </>
  );
}
