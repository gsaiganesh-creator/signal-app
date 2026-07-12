# Tabbed StockDetailSheet + Dividends Tab — Design

Date: 2026-07-12

## Context

`StockDetailSheet.tsx` (shared across dashboard, portfolio, us-portfolio, ipo, dividends
pages) is a single long vertically-scrolling modal: Position/P&L → Scan Results → Technicals →
Price Levels → Valuation → Growth & Profitability → Analyst & Earnings → Dividend & Short
Interest → Shareholding → News. Too much to scan at once. Requested: a Kite-style tabbed
layout, plus a real dividends tab (payout history, not just current yield).

## Goals

- Replace the single scroll with 4 tabs: Overview, Technicals, Fundamentals, Dividends.
- Dividends tab shows real payout history (date + amount per past dividend), not just the
  existing yield/payout-ratio/ex-date fields.
- News and the disclaimer/delete button stay always-visible below the tab content, not
  hidden behind a tab.

## Non-goals

- No change to what data is fetched for Overview/Technicals/Fundamentals — same fields,
  same `/api/stock-detail` call, just regrouped into tabs.
- No change to any of the 5 pages that render `<StockDetailSheet>` — same props, same
  call sites, this is purely internal to the component.

## Tab grouping

- **Overview** (default tab): Portfolio Position + P&L banner (only when `holding` prop
  provided) + Scan Results signals + Price Levels.
- **Technicals**: RSI 14, MACD, ATR 14, BB %B, Vol Ratio, EMA 20/50/200.
- **Fundamentals**: Valuation + Growth & Profitability + Analyst & Earnings + Shareholding
  Pattern.
- **Dividends**: existing fields (Div Yield, Payout Ratio, Ex-Div Date, Short Float, Days to
  Cover) at top, new payout history table below.

## New endpoint: `/api/dividend-history`

`/api/dividends` (existing, used by `dashboard/dividends/page.tsx`) is batch-oriented — many
symbols at once — and discards individual payout records after summing them into an annual
total; it never exposes the per-payout list. Rather than change that endpoint's response shape
for one new caller, a new single-symbol endpoint:

```
GET /api/dividend-history?symbol=RELIANCE&exchange=NSE
→ { payouts: [{ date: '2026-03-15', amount: 8.5 }, ...], currency: 'INR' | 'USD' }
```

Reuses the same Yahoo chart `events=dividends&range=3y&interval=1mo` fetch pattern already
proven in `/api/dividends`'s fallback path, but returns the raw per-event list instead of
aggregating it away. Edge runtime, same `Cache-Control` caching approach as the existing route.

## Component changes

- `StockDetailSheet.tsx`: add `activeTab` state (`'overview' | 'technicals' | 'fundamentals' |
  'dividends'`, default `'overview'`), a sticky tab bar (underline-active-tab style, matching
  Kite's stock page) between the header and the scrollable body. Existing section JSX moves
  under matching `activeTab === '...'` conditionals — no data-fetching changes for these three
  tabs, purely a rendering reorganization.
- New file `components/DividendHistoryTable.tsx`: owns its own fetch/loading/error state
  (mirrors how `StockNews` is already split out as its own self-contained component within this
  sheet). Fetches `/api/dividend-history` lazily — only on first time the Dividends tab is
  opened (not on initial sheet mount), via a `useEffect` gated on `activeTab === 'dividends'`
  with a `hasFetchedDividends` ref/state guard so re-opening the tab doesn't refetch. Renders a
  simple table: Date | Amount, sorted newest first, empty state ("No dividend history found")
  if the array is empty.

## Testing

No automated test infra in this codebase (consistent throughout). Verify by running the dev
server and opening the sheet from at least 2 of its 5 call sites (e.g. portfolio page for a
holding with `holding` prop set, dashboard page for one without) — confirming: all 4 tabs
render, switching tabs shows the right content, Dividends tab shows a populated table for a
known dividend-paying stock (e.g. RELIANCE, ITC) and a sane empty state for one that pays none.
