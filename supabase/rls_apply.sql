-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (drop-if-exists before recreate)

-- Enable RLS (idempotent)
alter table public.profiles        enable row level security;
alter table public.portfolios      enable row level security;
alter table public.holdings        enable row level security;
alter table public.watchlists      enable row level security;
alter table public.strategies      enable row level security;

-- Drop + recreate policies (idempotent)
drop policy if exists "profiles: own"       on public.profiles;
drop policy if exists "portfolios: own"     on public.portfolios;
drop policy if exists "holdings: own"       on public.holdings;
drop policy if exists "watchlists: own"     on public.watchlists;
drop policy if exists "strategies: own"     on public.strategies;

create policy "profiles: own"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

create policy "portfolios: own"
  on public.portfolios for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "holdings: own"
  on public.holdings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watchlists: own"
  on public.watchlists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "strategies: own"
  on public.strategies for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
