'use client';

// Supabase table SQL (run once in Supabase SQL editor):
//
// CREATE TABLE IF NOT EXISTS public.tracker_positions (
//   id uuid primary key,
//   user_id uuid references auth.users not null,
//   type text not null,    -- 'forex' | 'commodity'
//   data jsonb not null,
//   created_at timestamptz default now()
// );
// ALTER TABLE public.tracker_positions ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "users_own_tracker" ON public.tracker_positions
//   FOR ALL USING (auth.uid() = user_id);

import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from './portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useTrackerPositions<T extends { id: string }>(
  type: 'forex' | 'commodity',
  lsKey: string,
) {
  const { session } = usePortfolio();
  const [positions, setPositions] = useState<T[]>([]);
  const [loading, setLoading]     = useState(true);

  const token  = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const hdrs = token
    ? { apikey: SUPA_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : null;

  // Load positions — Supabase if logged in, localStorage otherwise
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (hdrs) {
        const r = await fetch(
          `${SUPA_URL}/rest/v1/tracker_positions?type=eq.${type}&select=id,data&order=created_at.asc`,
          { headers: hdrs }
        );
        const rows = r.ok ? await r.json() as Array<{ id: string; data: T }> : [];
        setPositions(rows.map(row => ({ ...row.data, id: row.id })));
      } else {
        try {
          const raw = localStorage.getItem(lsKey);
          setPositions(raw ? JSON.parse(raw) as T[] : []);
        } catch { setPositions([]); }
      }
    } finally { setLoading(false); }
  }, [token, type, lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);

  async function addPosition(pos: T): Promise<T> {
    const newPos = { ...pos, id: pos.id || crypto.randomUUID() };
    if (hdrs && userId) {
      await fetch(`${SUPA_URL}/rest/v1/tracker_positions`, {
        method: 'POST',
        headers: { ...hdrs, Prefer: 'return=minimal' },
        body: JSON.stringify({ id: newPos.id, user_id: userId, type, data: newPos }),
      });
    } else {
      const updated = [...positions, newPos];
      localStorage.setItem(lsKey, JSON.stringify(updated));
    }
    setPositions(prev => [...prev, newPos]);
    return newPos;
  }

  async function deletePosition(id: string) {
    if (hdrs) {
      await fetch(`${SUPA_URL}/rest/v1/tracker_positions?id=eq.${id}`, {
        method: 'DELETE', headers: hdrs,
      });
    } else {
      const updated = positions.filter(p => p.id !== id);
      localStorage.setItem(lsKey, JSON.stringify(updated));
    }
    setPositions(prev => prev.filter(p => p.id !== id));
  }

  return { positions, loading, addPosition, deletePosition, reload };
}
