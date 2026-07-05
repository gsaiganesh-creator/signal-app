# Forex Trade View (Pillar A) — Design

## Context

Forex page (`apps/web/app/dashboard/forex/page.tsx`) currently shows only live rates vs INR
(9 pairs) and a manual position tracker with P&L. No technical analysis, unlike stock pages
which get RSI/EMA/MACD/Supertrend + fundamentals.

Signal app targets Indian retail users. Two audiences both trade the *same* INR-currency
pairs (USD/EUR/GBP/JPY/AED/SGD/AUD/CAD/CHF vs INR — the only pairs retail Indians can
legally trade per RBI/FEMA on recognized exchanges):

1. **Hedgers** — importers/exporters, NRIs, travelers, remitters with real currency exposure.
2. **Speculators** — want trading-style engagement (charts, signals, bias) within legal pairs.

This spec covers **Pillar A: Trade View** — technical analysis for the speculator-leaning
audience, reusing the existing stock technical engine. Pillar B (Planner View: rate alerts,
converter, remittance cost comparison) is a separate future spec.

## Scope

All 9 existing pairs get Trade View analysis — no majors-only special-casing. Order stays
fixed (current USD→CHF order), no bias-based re-sorting or custom pinning in this iteration.

## Architecture

### 1. Extract shared technical calc functions

`apps/web/app/api/stock-detail/route.ts` currently defines `ema()`, `rsi()`, `bollinger()`,
`atr()`, `supertrend()` as local pure functions operating on price arrays — no stock-specific
dependencies. Extract these into `apps/web/lib/technicals.ts` and import from both
`stock-detail/route.ts` (no behavior change there) and the new forex endpoint. Avoids a second
copy of the same math drifting out of sync.

### 2. New endpoint: `/api/forex-technical`

Edge runtime, mirrors the chart-fetch pattern already used in `stock-detail/route.ts`.

```text
GET /api/forex-technical?symbols=USDINR=X,EURINR=X,...
```

For each symbol:

- Fetch Yahoo chart, `range=3mo&interval=1d` (same endpoint pattern as `/api/prices`, just
  wider range for technicals).
- Compute `rsi14` via `rsi(closes, 14)`.
- Compute `ema50` via `ema(closes, 50)`; derive `ema_gap_pct = (lastClose - ema50) / ema50 * 100`.
- Compute `supertrend(highs, lows, closes)` → direction `'up' | 'down'`.
- `bias`: Supertrend `'up'` → `'bullish'`, `'down'` → `'bearish'`. (RSI/EMA are displayed as
  context only, not blended into `bias` — per decision, Supertrend is the sole bias driver.)

Response shape:

```typescript
Record<string, { rsi14: number | null; ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null }>
```

If a symbol's fetch/calc fails, its entry is set to `{ rsi14: null, ema_gap_pct: null, bias: null }`
(key always present, values null) — frontend degrades gracefully (see Error Handling).

Cache: `public, max-age=300` (technicals don't need the tight cache stock prices do).

### 3. Frontend — expandable rows

In `forex/page.tsx`, the "Live Rates" grid (`LIVE_PAIRS.map(...)`, currently lines ~155-183)
gains click-to-expand behavior:

- Add local state `expandedPair: string | null`.
- Click a pair card → toggle expansion. Expanded card reveals a bordered sub-section below the
  existing rate/change display with 3 tiles: **RSI(14)**, **vs 50D EMA** (%, colored
  green/red by sign), **Bias** pill (🟢 Bullish / 🔴 Bearish / ⚪ — no data).
- Technicals fetched once for all 9 symbols in parallel with the existing `fetchRates()` call
  (new `fetchTechnicals()` hitting `/api/forex-technical`), stored in a sibling state map
  `technicals: Record<string, {...}>`. Not fetched per-row on expand — only 9 symbols total, so
  fetching all upfront is cheap and avoids per-click loading states.
- Refresh button (existing) also re-triggers `fetchTechnicals()`.

### 4. Compliance / language

Use **"Bias"**, never "Signal", "Buy", or "Sell" — same restraint as the stock-page SEBI rule
(screener/technical-output framing, not a recommendation). Existing page footer disclaimer
("NOT financial advice · DYOR") already covers this; no new disclaimer text needed since it's
additive to the same page.

## Error Handling

- `/api/forex-technical` fetch fails entirely (network/API down) → `technicals` state stays
  `{}`, all rows show rate-only, no expand-and-see-blank-tiles state — expand arrow can still
  show but tiles read `—` for missing values (same pattern as existing `chg == null` handling).
- Individual symbol fails within the endpoint → that symbol's entry is all-null (see above),
  same degrade-per-row behavior.

## Testing

No automated test infra exists for this page today (manual verification pattern, consistent
with rest of forex/commodities pages). Verify by:

- Spot-checking RSI(14)/EMA(50)/Supertrend output for 2-3 pairs (e.g. USD/INR, EUR/INR)
  against a reference charting tool (TradingView) for the same date range.
- Confirming graceful degrade: temporarily break the endpoint URL, confirm rows still show
  rates with no crash and `—` in place of technical tiles.

## Out of scope (future)

- Pillar B (Planner View): rate alerts, converter, remittance cost comparator, RBI reference
  rate comparison — separate spec.
- Bias-based sort/reorder, user pinning of favorite pairs.
- Charts/sparklines per pair (mockup Option B/C direction) — this iteration is Option A
  (expandable rows) only.
