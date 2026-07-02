'use client';
import Link from 'next/link';
import { usePlan } from '@/lib/use-plan';
import type { PlanFeature } from '@/lib/use-plan';

const FEATURE_LABELS: Record<PlanFeature, { name: string; tier: string; desc: string }> = {
  'signals-unlimited':       { name: 'Unlimited Scan Results',  tier: 'Starter+', desc: 'Get unlimited ML Technical Scan results daily' },
  'signals-detail':          { name: 'Signal Detail View',      tier: 'Starter+', desc: 'Entry range, targets, stop-loss for each signal' },
  'signals-portfolio':       { name: 'Portfolio Universe Scan', tier: 'Starter+', desc: 'Scan signals only for your holdings' },
  'signals-custom-universe': { name: 'Custom Universe Scan',    tier: 'Pro',      desc: 'Build a custom stock list for scanning' },
  'signals-us':              { name: 'US Market Signals',       tier: 'Elite',    desc: 'NYSE/NASDAQ technical scan — Elite only' },
  'signals-ai-narrative':    { name: 'AI Signal Narrative',     tier: 'Elite',    desc: 'Grok-powered "why now" context per signal' },
  'us-portfolio-multi':      { name: 'Multiple US Portfolios',  tier: 'Pro',      desc: 'Track multiple broker accounts' },
  'algo-builder':            { name: 'Algo Builder',            tier: 'Pro',      desc: 'Build and save custom trading strategies' },
  'backtest':                { name: 'Backtest Engine',         tier: 'Pro',      desc: 'Run strategies against historical data' },
  'equity-comp':             { name: 'ESPP & RSU Tracker',     tier: 'Pro',      desc: 'Track equity compensation grants and vesting' },
  'paper-trading-full':      { name: 'Paper Trading',          tier: 'Starter+', desc: 'Unlimited virtual trades' },
  'track-record':            { name: 'Track Record',           tier: 'Starter+', desc: 'P&L history and performance analytics' },
  'admin':                   { name: 'Admin Console',          tier: 'Admin',    desc: 'Co-founder admin access only' },
};

export function ProGate({ feature, children }: { feature: PlanFeature; children: React.ReactNode }) {
  const { canAccess, loading } = usePlan();

  if (loading) return (
    <div style={{ height:200, borderRadius:16, background:'var(--card-bg)', border:'1px solid var(--card-bdr)', animation:'pulse 1.5s infinite' }}/>
  );

  if (canAccess(feature)) return <>{children}</>;

  const meta = FEATURE_LABELS[feature];
  return (
    <div style={{ textAlign:'center', padding:'48px 24px', background:'linear-gradient(135deg,rgba(255,184,0,0.07),rgba(255,92,26,0.04))', border:'1px solid rgba(255,184,0,0.22)', borderRadius:16 }}>
      <div style={{ fontSize:32, marginBottom:10 }}>⚡</div>
      <div style={{ fontSize:16, fontWeight:900, marginBottom:6 }}>{meta.name}</div>
      <div style={{ fontSize:13, color:'var(--dim)', marginBottom:6 }}>{meta.desc}</div>
      <div style={{ display:'inline-block', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.25)', marginBottom:20 }}>
        {meta.tier} Plan
      </div>
      <br/>
      <Link href="/dashboard/upgrade"
        style={{ display:'inline-block', padding:'11px 28px', borderRadius:11, background:'linear-gradient(135deg,#FFB800,#FF5C1A)', color:'#000', fontWeight:800, fontSize:13, textDecoration:'none' }}>
        Upgrade Now →
      </Link>
    </div>
  );
}

// Inline badge — use on nav items, sidebar links, etc.
export function PlanBadge({ feature }: { feature: PlanFeature }) {
  const { canAccess, loading } = usePlan();
  if (loading || canAccess(feature)) return null;
  const meta = FEATURE_LABELS[feature];
  return (
    <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:10, background:'rgba(255,184,0,0.12)', color:'var(--ylw)', border:'1px solid rgba(255,184,0,0.22)', whiteSpace:'nowrap' }}>
      {meta.tier}
    </span>
  );
}
