-- Paper Trading schema fix (July 2026)
-- Root cause: app/dashboard/paper-trading/page.tsx queries `paper_strategies`
-- (doesn't exist) and expects `paper_trades` to be a per-trade table
-- (symbol/entry_price/exit_price/pl), but schema.sql's `paper_trades` is a
-- per-session table (virtual_capital/current_value/status). Every open,
-- list, and close call has been failing since this page was built.
--
-- This replaces the old paper_trades + paper_trade_logs pair (never
-- populated correctly — every insert against them would have failed the
-- app's actual payload shape) with the two tables the frontend really uses.

drop table if exists public.paper_trade_logs;
drop table if exists public.paper_trades;

-- One row per activated strategy/algo per user
create table public.paper_strategies (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  algo_type    text,
  capital      numeric(14, 2) not null default 100000,
  rsi_low      numeric(5, 2)  not null default 35,
  rsi_high     numeric(5, 2)  not null default 70,
  sl_pct       numeric(5, 2)  not null default 2.5,
  target_pct   numeric(5, 2)  not null default 6,
  trial_days   integer        not null default 30,
  active       boolean        not null default true,
  started_at   timestamptz    not null default now(),
  created_at   timestamptz    not null default now()
);

-- One row per individual virtual trade under a strategy
create table public.paper_trades (
  id           uuid primary key default gen_random_uuid(),
  strategy_id  uuid not null references public.paper_strategies(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  symbol       text not null,
  signal       text not null default 'BUY',   -- BUY | SELL
  entry_price  numeric(12, 2) not null,
  qty          numeric(14, 4) not null,
  entry_at     timestamptz not null default now(),
  exit_price   numeric(12, 2),
  exit_at      timestamptz,
  pl           numeric(14, 2),
  status       text not null default 'OPEN'   -- OPEN | WIN | LOSS
);

alter table public.paper_strategies enable row level security;
alter table public.paper_trades     enable row level security;

create policy "paper_strategies: own"
  on public.paper_strategies for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paper_trades: own"
  on public.paper_trades for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index paper_trades_strategy_id_idx on public.paper_trades(strategy_id);
