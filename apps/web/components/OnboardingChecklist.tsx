'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

interface Step {
  id: string; label: string; sub: string;
  done: boolean; href: string | null; cta: string;
}

export function OnboardingChecklist() {
  const { portfolios, holdings } = usePortfolio();
  const [dismissed, setDismissed]       = useState(true);  // true avoids flash on hydration
  const [visitedSignals, setVisited]    = useState(false);
  const [visitedPaper, setVisitedPaper] = useState(false);
  const [visitedTrack, setVisitedTrack] = useState(false);
  const [minimised, setMinimised]       = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem('signal_dismissed_checklist') === '1');
    setVisited(localStorage.getItem('signal_visited_signals') === '1');
    setVisitedPaper(localStorage.getItem('signal_visited_paper') === '1');
    setVisitedTrack(localStorage.getItem('signal_visited_track') === '1');
    setMinimised(localStorage.getItem('signal_checklist_min') === '1');
  }, []);

  const steps: Step[] = [
    { id:'signup',    label:'Create your account',      sub:'You\'re in.',                            done:true,                  href:null,                         cta:'' },
    { id:'portfolio', label:'Create a portfolio',        sub:'Name it e.g. "Zerodha Long Term"',       done:portfolios.length > 0, href:'/dashboard/portfolio',       cta:'Create →' },
    { id:'holdings',  label:'Add your first stock',      sub:'Upload CSV/Excel from your broker',      done:holdings.length > 0,   href:'/dashboard/portfolio',       cta:'Upload →' },
    { id:'signals',   label:'Check live ML signals',     sub:'RSI + EMA scan across 100 NSE stocks',  done:visitedSignals,        href:'/dashboard/signals',         cta:'View →' },
    { id:'paper',     label:'Try paper trading',         sub:'Practice without real money',            done:visitedPaper,          href:'/dashboard/paper-trading',   cta:'Open →' },
    { id:'track',     label:'Review track record',       sub:'Every past signal call — public proof',  done:visitedTrack,          href:'/dashboard/track-record',    cta:'See →' },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone   = doneCount === steps.length;
  const pct       = Math.round((doneCount / steps.length) * 100);

  function dismiss() {
    localStorage.setItem('signal_dismissed_checklist', '1');
    setDismissed(true);
  }

  function toggleMin() {
    const next = !minimised;
    setMinimised(next);
    localStorage.setItem('signal_checklist_min', next ? '1' : '0');
  }

  if (dismissed || allDone) return null;

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(23,64,245,0.06),rgba(0,212,160,0.03))', border:'1px solid rgba(23,64,245,0.2)', borderRadius:16, padding:minimised ? '14px 18px' : '18px 20px', marginBottom:24 }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: minimised ? 0 : 14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:minimised ? 0 : 4 }}>
            Get started with SIGNAL
            <span style={{ marginLeft:8, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(23,64,245,0.12)', color:'var(--bluL)' }}>
              {doneCount}/{steps.length} done
            </span>
          </div>
          {!minimised && (
            <div style={{ fontSize:11, color:'var(--dim)' }}>Complete setup to unlock the full platform.</div>
          )}
        </div>
        {/* Progress pill */}
        <div style={{ width:80, height:6, background:'var(--surf2)', borderRadius:3, flexShrink:0, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--blu),var(--grn))', borderRadius:3, transition:'width 0.4s' }}/>
        </div>
        <button onClick={toggleMin} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--bdr)', background:'transparent', color:'var(--dim)', cursor:'pointer', fontSize:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {minimised ? '＋' : '−'}
        </button>
        <button onClick={dismiss} style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--bdr)', background:'transparent', color:'var(--dim)', cursor:'pointer', fontSize:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          ✕
        </button>
      </div>

      {!minimised && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {steps.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background: s.done ? 'rgba(0,212,160,0.06)' : 'var(--surf)', border:`1px solid ${s.done ? 'rgba(0,212,160,0.15)' : 'var(--bdr)'}` }}>
              {/* Done icon */}
              <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: s.done ? 'var(--grn)' : 'var(--surf2)', border: s.done ? 'none' : '1px solid var(--bdr)' }}>
                {s.done
                  ? <span style={{ fontSize:12, color:'#000', fontWeight:900 }}>✓</span>
                  : <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--bdr)', display:'block' }}/>
                }
              </div>
              {/* Label */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight: s.done ? 600 : 700, color: s.done ? 'var(--dim)' : 'var(--txt)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</div>
                {!s.done && <div style={{ fontSize:11, color:'var(--dim)', marginTop:1 }}>{s.sub}</div>}
              </div>
              {/* CTA */}
              {!s.done && s.href && (
                <Link href={s.href} style={{ height:30, padding:'0 14px', borderRadius:8, background:'var(--blu)', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', textDecoration:'none', flexShrink:0 }}>
                  {s.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
