-- ============================================================
-- SIGNAL — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ─── 1. PROFILES (extends auth.users) ───────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free',  -- free | starter | pro | elite
  broker      text,                          -- mstock | zerodha | upstox | null
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── 2. PORTFOLIOS ──────────────────────────────────────────
create table if not exists public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'My Portfolio',
  broker      text,   -- source: mstock | zerodha | manual | csv
  created_at  timestamptz not null default now()
);

-- ─── 3. HOLDINGS ────────────────────────────────────────────
create table if not exists public.holdings (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   uuid not null references public.portfolios(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  symbol         text not null,
  exchange       text not null default 'NSE',
  qty            numeric(14,6) not null check (qty > 0),
  avg_price      numeric(12, 2) not null check (avg_price > 0),
  ml_class       text,   -- Momentum | Swingable | LongTerm | ExitNow | Watch
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── 4. WATCHLISTS ──────────────────────────────────────────
create table if not exists public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  symbol      text not null,
  exchange    text not null default 'NSE',
  added_at    timestamptz not null default now(),
  unique (user_id, symbol)
);

-- ─── 5. STRATEGIES (Algo Builder) ───────────────────────────
create table if not exists public.strategies (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  strategy_type   text not null,              -- momentum | trend | mean_reversion | breakout
  universe        text[] not null default '{"NIFTY 50"}',
  indicators      text[] not null default '{}',
  stop_loss_pct   numeric(5, 2) not null default 2.5,
  target_pct      numeric(5, 2) not null default 6.0,
  config          jsonb not null default '{}',  -- extra params
  created_at      timestamptz not null default now()
);

-- ─── 6. PAPER TRADES (sessions) ─────────────────────────────
create table if not exists public.paper_trades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  strategy_id      uuid references public.strategies(id) on delete set null,
  strategy_name    text not null,
  virtual_capital  numeric(14, 2) not null default 100000,
  current_value    numeric(14, 2) not null default 100000,
  status           text not null default 'running',  -- running | completed | stopped
  start_date       date not null default current_date,
  end_date         date,
  created_at       timestamptz not null default now()
);

-- ─── 7. PAPER TRADE LOGS (individual signals) ───────────────
create table if not exists public.paper_trade_logs (
  id               uuid primary key default gen_random_uuid(),
  paper_trade_id   uuid not null references public.paper_trades(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  symbol           text not null,
  signal           text not null,   -- BUY | SELL | HOLD
  entry_price      numeric(12, 2),
  exit_price       numeric(12, 2),
  qty              integer,
  pl               numeric(12, 2),
  status           text not null default 'open',  -- open | win | sl | hold
  fired_at         timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.portfolios      enable row level security;
alter table public.holdings        enable row level security;
alter table public.watchlists      enable row level security;
alter table public.strategies      enable row level security;
alter table public.paper_trades    enable row level security;
alter table public.paper_trade_logs enable row level security;

-- profiles: own row only
create policy "profiles: own"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- portfolios: own rows
create policy "portfolios: own"
  on public.portfolios for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- holdings: own rows
create policy "holdings: own"
  on public.holdings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- watchlists: own rows
create policy "watchlists: own"
  on public.watchlists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- strategies: own rows
create policy "strategies: own"
  on public.strategies for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- paper_trades: own rows
create policy "paper_trades: own"
  on public.paper_trades for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- paper_trade_logs: own rows
create policy "paper_trade_logs: own"
  on public.paper_trade_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- drop + recreate so re-running this file is safe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- UPDATED_AT helper (optional — keeps updated_at fresh)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger holdings_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

-- ─── 8. EQUITY GRANTS (RSU / ESPP) ──────────────────────────
create table if not exists public.equity_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('RSU', 'ESPP')),
  symbol      text not null,
  company     text not null default '',
  employer    text not null default '',
  shares      numeric(14, 4) not null check (shares > 0),
  grant_price numeric(12, 4) not null check (grant_price >= 0),
  vest_date   date,
  brokerage   text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.equity_grants enable row level security;

create policy "equity_grants: own"
  on public.equity_grants for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger equity_grants_updated_at
  before update on public.equity_grants
  for each row execute function public.set_updated_at();
