'use client';
import { useState, useEffect } from 'react';
import { createClient } from './supabase/client';
import type { Plan } from './supabase/types';

const FOUNDERS = ['gsaiganesh@gmail.com', 'bskumar.obiee@gmail.com'];

export type PlanFeature =
  | 'signals-unlimited'
  | 'us-portfolio-multi'
  | 'algo-builder'
  | 'backtest'
  | 'equity-comp'
  | 'paper-trading-full'
  | 'track-record';

const PLAN_GATES: Record<PlanFeature, Plan[]> = {
  'signals-unlimited':    ['starter', 'pro', 'elite'],
  'us-portfolio-multi':  ['pro', 'elite'],
  'algo-builder':        ['pro', 'elite'],
  'backtest':            ['pro', 'elite'],
  'equity-comp':         ['pro', 'elite'],
  'paper-trading-full':  ['starter', 'pro', 'elite'],
  'track-record':        ['starter', 'pro', 'elite'],
};

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }

      // Founders bypass DB — always elite
      if (FOUNDERS.includes(session.user.email ?? '')) {
        setPlan('elite');
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', session.user.id)
        .single();

      if (data) {
        const expired = data.plan_expires_at
          ? new Date(data.plan_expires_at) < new Date()
          : false;
        setPlan(expired ? 'free' : (data.plan as Plan));
      }
      setLoading(false);
    });
  }, []);

  function canAccess(feature: PlanFeature): boolean {
    if (plan === 'elite') return true;
    return PLAN_GATES[feature].includes(plan);
  }

  return {
    plan,
    loading,
    isFounder: plan === 'elite' && FOUNDERS.some(() => true), // resolved via email check above
    isPro: plan === 'pro' || plan === 'elite',
    isStarter: plan === 'starter' || plan === 'pro' || plan === 'elite',
    canAccess,
  };
}
