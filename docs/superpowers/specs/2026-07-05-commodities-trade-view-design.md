# Commodities Trade View — Design

## Context

Commodities page (`apps/web/app/dashboard/commodities/page.tsx`) shows live prices for 6
commodities (Gold, Silver, Crude Oil, Natural Gas, Copper, Aluminium) — COMEX/NYMEX futures
price converted to INR via live USD/INR rate (explicitly disclaimed as "NOT MCX official
prices — proxy only", per existing page footer). It also has a manual position tracker with
unit-aware conversion (grams/tola/kg/lots) and P&L, similar in shape to the forex page before
its Trade View addition.

Same as forex, target audience is both physical/hedger users (jewelers, importers, SGB/ETF
holders) and speculators (MCX futures traders). This spec covers the **Trade View** pillar —
technical analysis (RSI/EMA/Bias) for the speculator-leaning audience — mirroring the pattern
already shipped on the forex page (see
`docs/superpowers/specs/2026-07-05-forex-trade-view-design.md` and
`docs/superpowers/plans/2026-07-05-forex-trade-view.md`).

A second pillar (physical/seasonal context — Indian gold demand seasonality, jewelry-comparable
pricing) is explicitly out of scope here, to be a separate future spec.

## Scope

All 6 commodities get Trade View analysis — no special-casing (matches forex's "all 9 pairs,
no majors-only" precedent).

## Key decision: data source

Technical analysis runs on the same COMEX/NYMEX-via-USDINR proxy price already shown on the
page, under the same existing disclaimer. No new data source. This is directionally useful for
global commodity momentum but will not exactly track MCX contract behavior (which can diverge
due to import duty, GST, and local demand/supply). This tradeoff is accepted — sourcing a real
MCX feed is out of scope (likely a paid API, not currently justified).

## Architecture

### 1. Generalize `/api/forex-technical` into a shared `/api/technical` endpoint

`/api/forex-technical` (built for the forex Trade View) has no forex-specific logic — it fetches
a Yahoo chart for a given symbol and computes RSI/EMA-gap/Supertrend-bias. Rather than clone it
into a near-identical `/api/commodity-technical`, rename the route directory
`apps/web/app/api/forex-technical/` → `apps/web/app/api/technical/` (Next.js route path becomes
`/api/technical`), with no other code changes to the route's internals — same `TechResult`
shape, same query param (`symbols`), same guard conditions, same cache header.

Update the forex page's one call site
(`apps/web/app/dashboard/forex/page.tsx`, `fetchTechnicals`) to call `/api/technical` instead of
`/api/forex-technical`. This is the only consumer-side change needed for forex.

### 2. Commodities page — same expandable-row wiring as forex

In `apps/web/app/dashboard/commodities/page.tsx`:

- Add `TechMap` type (identical shape to forex's: `Record<string, { rsi14: number | null;
  ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null }>`).
- Add `technicals` and `expandedPair` state, same as forex.
- Add `fetchTechnicals()` hitting `/api/technical?symbols=<comma-separated COMMODITIES syms>`
  (`GC=F,SI=F,CL=F,NG=F,HG=F,ALI=F`), fetched once alongside the existing `fetchPrices()` call
  (on mount and on Refresh click).
- The "Live Price Cards" grid (`COMMODITIES.map(...)`) becomes click-to-expand, identical
  interaction and tile layout to forex: RSI(14) / vs 50D EMA (colored by sign) / Bias pill
  (🟢 Bullish / 🔴 Bearish / ⚪ —), with `onClick={e => e.stopPropagation()}` on the expanded
  tile wrapper (lesson carried over from the forex code-review fix).

### 3. Compliance / language

Same as forex: "Bias" only, never "Signal"/"Buy"/"Sell". Existing page footer disclaimer
("NOT MCX official prices · DYOR") already covers this; no new disclaimer text needed.

## Error Handling

Identical to forex: `/api/technical` fetch fails entirely → `technicals` state stays `{}`, all
cards show price-only, tiles read `—`. Individual symbol fails within the endpoint → that
symbol's entry is `{ rsi14: null, ema_gap_pct: null, bias: null }` (key always present).

## Testing

No automated test infra exists (consistent with rest of the app). Verify by:

- Spot-checking RSI(14)/EMA(50)/Supertrend output for 2-3 commodities (e.g. Gold, Crude) against
  a reference charting tool for the same date range.
- Confirming graceful degrade: temporarily break the endpoint URL, confirm cards still show
  prices with no crash and `—` in place of technical tiles.
- Confirming the forex page still works end-to-end after the route rename (its one call site
  updated to `/api/technical`) — this is a regression risk specific to this spec since it
  touches a route the forex page depends on.

## Out of scope (future)

- Pillar B (physical/seasonal context): Indian gold demand seasonality, jewelry-comparable
  pricing, wedding-season/Akshaya Tritiya/Diwali context — separate future spec.
- Real MCX data sourcing.
- Charts/sparklines, bias-based sort/reorder, rate alerts.
