'use client';
// First-login spotlight tour — highlights Home/Signals/Portfolio nav items
// with a short explanation, auto-triggers once per user then never again.
//
// Run once in Supabase before using:
//   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false;

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useNavCtx } from '@/components/DashboardNavContext';

interface Step {
  target: string | null; // data-tour value, or null for a centered welcome/closing card
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: '👋 Welcome to SignalGenie',
    body: 'Quick 3-step tour of the essentials — takes 20 seconds. You can skip anytime.',
  },
  {
    target: 'nav-home',
    title: '🏠 Home',
    body: 'Your net worth, market brief, and quick links to everything else — this is home base.',
  },
  {
    target: 'nav-signals',
    title: '📈 Signals',
    body: 'An algorithmic technical screener — RSI, EMA, MACD run against stocks to flag momentum, swing setups, or weakness. It’s a study tool, not investment advice — always DYOR.',
  },
  {
    target: 'nav-portfolio',
    title: '💼 Portfolio',
    body: 'Track your holdings with live P&L. Each stock gets a technical read — Trending, Pullback, Consolidating, Declining, or Stagnant — based on real indicators, not guesswork.',
  },
  {
    target: null,
    title: '🎉 That’s it',
    body: 'Everything else (Forex, Commodities, Watchlist, Algo Builder, and more) lives under the other tabs — or the More menu on mobile. Not SEBI registered · Not investment advice · DYOR.',
  },
];

function findVisibleTarget(tourKey: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${tourKey}"]`);
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function OnboardingTour() {
  const [step, setStep] = useState<number>(-1); // -1 = not started / finished
  const [rect, setRect] = useState<DOMRect | null>(null);
  const { setActiveTab } = useNavCtx();
  const doneRef = useRef(false);

  // Check whether this user needs the tour, once, on mount.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('has_seen_tour')
        .eq('id', session.user.id)
        .single();
      if (data && data.has_seen_tour === false) {
        setActiveTab('home'); // Signals/Portfolio live under Home's sub-nav on desktop
        setStep(0);
      }
    }).catch(() => {});
  }, [setActiveTab]);

  // Recompute the spotlighted element's position whenever the step changes
  // (give the DOM a tick to settle after any tab switch).
  useEffect(() => {
    if (step < 0) return;
    const s = STEPS[step];
    if (!s.target) { setRect(null); return; }
    const raf = requestAnimationFrame(() => {
      const el = findVisibleTarget(s.target!);
      setRect(el ? el.getBoundingClientRect() : null);
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  async function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setStep(-1);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('profiles').update({ has_seen_tour: true }).eq('id', session.user.id);
      }
    } catch { /* non-critical — worst case the tour shows again next login */ }
  }

  if (step < 0) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const PAD = 8;
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: Math.min(rect.bottom + 12, window.innerHeight - 200),
        left: Math.min(Math.max(rect.left, 12), window.innerWidth - 320),
        zIndex: 1001,
      }
    : {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001,
      };

  return (
    <>
      {/* Dimmed overlay with a spotlight cutout via box-shadow */}
      <div
        onClick={finish}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: rect ? 'transparent' : 'rgba(0,0,0,0.55)' }}
      >
        {rect && (
          <div style={{
            position: 'fixed',
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            border: '2px solid var(--bluL)',
            pointerEvents: 'none',
            transition: 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
          }} />
        )}
      </div>

      {/* Tooltip / welcome card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...tooltipStyle,
          width: 300, background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 14,
          padding: '18px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6, marginBottom: 16 }}>{s.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={finish}
            style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Skip
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === step ? 'var(--bluL)' : 'var(--bdr)' }} />
            ))}
          </div>
          <button onClick={() => (isLast ? finish() : setStep(st => st + 1))}
            style={{ background: 'var(--blu)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
