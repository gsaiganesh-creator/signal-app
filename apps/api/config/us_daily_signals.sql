-- Run once in Supabase Dashboard → SQL Editor.
-- Backs core/us_scan.py's run_us_morning_scan() / upsert_us_signals().
CREATE TABLE IF NOT EXISTS public.us_daily_signals (
  id           uuid primary key default gen_random_uuid(),
  scanned_at   date not null,
  symbol       text not null,
  name         text not null,
  sector       text not null,
  cmp          numeric not null,
  chg          numeric,
  rsi          numeric,
  ema20        numeric,
  ema_dist_pct numeric,
  entry_low    numeric,
  entry_high   numeric,
  target       numeric,
  sl           numeric,
  signal       text not null,
  confidence   integer,
  score        numeric,
  created_at   timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.us_daily_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_us_daily_signals" ON public.us_daily_signals;
CREATE POLICY "public_read_us_daily_signals" ON public.us_daily_signals FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_write_us_daily_signals" ON public.us_daily_signals;
CREATE POLICY "service_write_us_daily_signals" ON public.us_daily_signals FOR ALL USING (true);
