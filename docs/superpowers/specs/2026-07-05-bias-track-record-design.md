# Bias Track Record Pipeline (Phase 1 of ML Roadmap) — Design

## Context

Product niche is ML-driven insight, but today's "signals" (stocks, and the newly-shipped forex/
commodities Bias) are rule-based technical indicators — no trained model exists anywhere in
signal-app. Before any real ML model can be trained or trusted, there must be a labeled track
record proving whether the current rule-based Bias actually predicts anything. This is Phase 1
of a 3-phase roadmap (1: track record → 2: statistical/regression upgrades to existing heuristics
→ 3: lightweight in-JS trained model), agreed sequentially with the user.

**Pre-existing gap discovered during this design:** CLAUDE.md documents a `scan-log/backfill`
route + Vercel Cron that fills `price_30d`/`return_30d` on the stock `scan_log` table. Neither
the route nor the cron entry actually exist in the codebase — `scan_log`'s accuracy stats
(`return_30d`, `closed` row filtering) have never been populated by anything. This spec fixes
that gap in the same pass as building the new forex/commodities equivalent, per user decision.

## Scope

- New `bias_log` table + logging pipeline for forex/commodities Bias (the Supertrend-derived
  bullish/bearish call already shown on both pages' expanded cards).
- A shared, generic backfill mechanism, used to fix the stock `scan_log` gap AND populate the
  new `bias_log` table.
- Explicitly **no UI** in this phase — pure data pipeline. A track-record-style display is a
  separate future phase, once enough 10-day windows have closed to be meaningful (~2 weeks).

## Key correctness constraint

Bias/RSI(14)/EMA-gap are computed by `/api/technical` against the **raw Yahoo symbol price**
(e.g. `GC=F`'s USD futures price, or `USDINR=X`'s direct rate) — not the page's INR-converted
display price for commodities. Forward-return validation must check the same raw series the
indicators were computed from. If validation instead used the INR-converted commodity price, a
"correct" Bias call could look wrong (or vice versa) purely because of an unrelated rupee move —
polluting the accuracy stat with noise the Bias never claimed to predict. Concretely:
`price_at`/`price_5d`/`price_10d` in `bias_log` store the raw Yahoo symbol price (same value
already used to compute RSI/EMA/Supertrend), sourced from each page's existing raw-price state
(`rates[sym]?.price` on forex, `prices[com.sym]?.price` on commodities) — not `getInrPrice()`.

## Data Model

### New table: `bias_log`

```sql
CREATE TABLE IF NOT EXISTS public.bias_log (
  id          uuid primary key default gen_random_uuid(),
  scanned_at  date not null,
  symbol      text not null,          -- raw Yahoo ticker, e.g. 'USDINR=X', 'GC=F'
  asset_class text not null,          -- 'forex' | 'commodity'
  bias        text not null,          -- 'bullish' | 'bearish'
  price_at    numeric not null,       -- raw Yahoo symbol price (NOT the INR-converted display price)
  rsi14       numeric,
  ema_gap_pct numeric,
  price_5d    numeric,
  return_5d   numeric,
  price_10d   numeric,
  return_10d  numeric,
  created_at  timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.bias_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_bias_log"  ON public.bias_log FOR SELECT USING (true);
CREATE POLICY "anon_insert_bias_log"  ON public.bias_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_bias_log"  ON public.bias_log FOR UPDATE USING (true);
```

Mirrors `scan_log`'s existing shape/permissions exactly (same RLS pattern, same anon-key
insert/update approach already in production for `scan_log` — no new auth model needed).

## Architecture

### 1. `/api/bias-log` — POST only (no GET; no UI yet to serve one)

New file `apps/web/app/api/bias-log/route.ts`, structurally mirroring the POST half of
`apps/web/app/api/scan-log/route.ts` (same `SUPA_URL`/`SUPA_KEY` env vars, same
`Prefer: resolution=merge-duplicates` upsert trick, same `scanned_at = today` date derivation):

```typescript
interface BiasEntry {
  symbol: string;
  asset_class: 'forex' | 'commodity';
  bias: 'bullish' | 'bearish';
  price_at: number;
  rsi14?: number | null;
  ema_gap_pct?: number | null;
}
```

Batch upsert, same error handling for a not-yet-created table (`42P01`/`PGRST205` → "table not
created yet" 503), same shape of response (`{ ok: true, inserted, date }`).

### 2. Shared logging helper: `apps/web/lib/log-bias.ts`

```typescript
export interface LoggableBias {
  symbol: string;
  asset_class: 'forex' | 'commodity';
  bias: 'bullish' | 'bearish' | null;
  price: number | null;
  rsi14: number | null;
  ema_gap_pct: number | null;
}

export async function logBiasAsync(entries: LoggableBias[]): Promise<void> {
  const valid = entries.filter((e): e is LoggableBias & { bias: 'bullish' | 'bearish'; price: number } =>
    e.bias != null && e.price != null);
  if (!valid.length) return;
  try {
    await fetch('/api/bias-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: valid.map(e => ({
          symbol: e.symbol, asset_class: e.asset_class, bias: e.bias,
          price_at: e.price, rsi14: e.rsi14, ema_gap_pct: e.ema_gap_pct,
        })),
      }),
    });
  } catch { /* fire-and-forget */ }
}
```

Built shared from the start (unlike the `TechTiles` duplication we had to retroactively fix) —
both pages import this one function.

### 3. Page wiring (forex + commodities)

In `forex/page.tsx`, after the existing `fetchTechnicals` callback resolves (inside the same
`useCallback`, after `setTechnicals(await res.json())`), call:

```typescript
logBiasAsync(LIVE_PAIRS.map(p => ({
  symbol: p.sym, asset_class: 'forex' as const, bias: data[p.sym]?.bias ?? null,
  price: getRate(p.sym), rsi14: data[p.sym]?.rsi14 ?? null, ema_gap_pct: data[p.sym]?.ema_gap_pct ?? null,
})));
```

(`data` = the parsed JSON from the technicals fetch, `getRate` = the existing raw-price accessor
already defined on the page — not the INR-display conversion.)

Same shape in `commodities/page.tsx`, using `prices[c.sym]?.price` (raw USD futures price) in
place of `getRate`, and `asset_class: 'commodity'`.

This runs once per page load/refresh, deduped server-side by the `UNIQUE(scanned_at, symbol)`
upsert — identical fire-and-forget pattern already used by the stock signals page's
`logScansAsync`.

### 4. Generalized backfill: `apps/web/lib/backfill-returns.ts`

```typescript
export interface BackfillWindow { days: number; priceCol: string; returnCol: string; }

export interface BackfillConfig {
  table: string;
  windows: BackfillWindow[];
  resolveYahooSymbol: (row: { symbol: string; exchange?: string }) => string;
}

export async function backfillTable(config: BackfillConfig): Promise<{ updated: number }> {
  // For each window: query rows where scanned_at = today - days AND <priceCol> IS NULL,
  // fetch current Yahoo price for resolveYahooSymbol(row), compute
  // return = (currentPrice - price_at) / price_at * 100, PATCH the row's priceCol/returnCol.
  // Same Yahoo chart/quote fetch pattern already used by /api/prices and /api/technical.
}
```

Stocks (`scan_log`): `resolveYahooSymbol` reattaches `.NS`/`.BO` based on the row's `exchange`
column (same logic as `stock-detail/route.ts`'s existing `ySym` construction), windows
`[{days:30,...},{days:60,...}]`.

Forex/commodities (`bias_log`): `resolveYahooSymbol` returns `row.symbol` as-is (already a raw
Yahoo ticker, no suffix needed), windows `[{days:5,...},{days:10,...}]`.

### 5. Fixed backfill route: `apps/web/app/api/scan-log/backfill/route.ts`

The path CLAUDE.md already documents but which was never built. CRON-protected the same way
`apps/web/app/api/paper-trading/auto-scan/route.ts` already does it (`CRON_SECRET` env var,
checked against `Authorization: Bearer <secret>` header). Calls `backfillTable(...)` twice (once
per config above) and returns a combined `{ scan_log: {updated}, bias_log: {updated} }` summary.

### 6. `vercel.json` cron entry

```json
{ "path": "/api/scan-log/backfill", "schedule": "0 12 * * *" }
```

Matches what CLAUDE.md already (incorrectly) claims exists — this makes the claim true.

## Error Handling

- `/api/bias-log` POST: same graceful "table not created yet" 503 as `scan_log`'s existing
  pattern, for the pre-SQL-migration window.
- `logBiasAsync`: fire-and-forget, swallows all errors — never blocks or breaks page rendering
  (matches `logScansAsync`'s existing behavior).
- `backfillTable`: a failed Yahoo fetch for one row skips that row (leaves `priceCol`/`returnCol`
  null, retried on the next day's cron run) rather than failing the whole batch.

## Testing

No automated test infra exists (consistent with the rest of the app). Verify by:

- Manually POSTing a `bias-log` entry via curl, confirming it lands in Supabase (or confirming
  the 503 "table not created" response before the SQL migration is run).
- Manually triggering `/api/scan-log/backfill` with the correct `CRON_SECRET` header against
  rows seeded with a `scanned_at` exactly 5/10/30/60 days old, confirming `price_Xd`/`return_Xd`
  populate correctly and the return math matches a hand-computed value.
- Confirming the route correctly rejects a request with a missing/wrong `CRON_SECRET` (401/403).

## Out of scope (future phases)

- Any UI showing Bias accuracy (Phase 1 fast-follow, once data exists).
- Phase 2 (statistical/regression upgrade to `decomposeMove` and correlation callouts).
- Phase 3 (lightweight in-JS trained model, weights baked into a TS constant, offline-trained).
