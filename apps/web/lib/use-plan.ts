'use client';
import { useState, useEffect } from 'react';
import { createClient } from './supabase/client';
import type { Plan } from './supabase/types';

export const FOUNDERS = ['gsaiganesh@gmail.com', 'gsai0905@gmail.com', 'bskumar.obiee@gmail.com'];

export type PlanFeature =
  | 'signals-unlimited'
  | 'signals-detail'
  | 'signals-portfolio'
  | 'signals-custom-universe'
  | 'us-portfolio-multi'
  | 'algo-builder'
  | 'backtest'
  | 'equity-comp'
  | 'paper-trading-full'
  | 'track-record'
  | 'admin';

const PLAN_RANK: Record<Plan, number> = {
  free: 0, starter: 1, pro: 2, elite: 3, admin: 4,
};

const PLAN_GATES: Record<PlanFeature, Plan[]> = {
  'signals-unlimited':        ['starter', 'pro', 'elite', 'admin'],
  'signals-detail':           ['starter', 'pro', 'elite', 'admin'],
  'signals-portfolio':        ['starter', 'pro', 'elite', 'admin'],
  'signals-custom-universe':  ['pro', 'elite', 'admin'],
  'us-portfolio-multi':       ['pro', 'elite', 'admin'],
  'algo-builder':             ['pro', 'elite', 'admin'],
  'backtest':                 ['pro', 'elite', 'admin'],
  'equity-comp':              ['pro', 'elite', 'admin'],
  'paper-trading-full':       ['starter', 'pro', 'elite', 'admin'],
  'track-record':             ['starter', 'pro', 'elite', 'admin'],
  'admin':                    ['admin'],
};

export function usePlan() {
  const [plan, setPlan]       = useState<Plan>('free');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }

      const userEmail = (session.user.email ?? session.user.user_metadata?.email ?? '').toLowerCase();
      setEmail(userEmail);

      // Founders always get admin plan
      if (FOUNDERS.map(e => e.toLowerCase()).includes(userEmail)) {
        setPlan('admin');
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
    // admin can access everything
    if (plan === 'admin') return true;
    return PLAN_GATES[feature].includes(plan);
  }

  function meetsMinPlan(min: Plan): boolean {
    return PLAN_RANK[plan] >= PLAN_RANK[min];
  }

  const isFounder  = plan === 'admin';
  const isAdmin    = plan === 'admin';
  const isElite    = plan === 'elite' || plan === 'admin';
  const isPro      = plan === 'pro'   || isElite;
  const isStarter  = plan === 'starter' || isPro;

  return { plan, email, loading, isFounder, isAdmin, isElite, isPro, isStarter, canAccess, meetsMinPlan };
}
