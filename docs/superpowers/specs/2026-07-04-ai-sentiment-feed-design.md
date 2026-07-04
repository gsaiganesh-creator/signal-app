# AI Sentiment Feed — Design

Date: 2026-07-04

## Context

`/dashboard/feed` currently shows a "Coming Q3 2026 · X (Twitter) API integration" placeholder promising a live tweet feed filtered to the user's portfolio. Official X API read access requires the $200/mo Basic tier, which doesn't fit this app's ~$3-5/mo infra budget.

Decision: replace the live-tweet-feed idea with an AI-generated sentiment take per stock, using Grok (`grok-4.3` via xAI's OpenAI-compatible API, no live search — `grok_chat` pattern already proven in the `twitter-agent` project at ~$0.001/call). This is not real-time X sentiment; it's Grok's general read on a stock's current mood. The page is reframed accordingly ("AI Sentiment Scan") rather than sold as a live tweet stream.

Also removed: the Twitter/X OAuth login option from `/sign-in` (unrelated cleanup, done separately, not part of this spec's implementation).

## Goals

- Show sentiment (bullish/bearish/neutral + 1-line reason) for stocks the user holds or watches
- Keep cost predictable and low (~$6/mo worst case)
- No new user-facing complexity — sentiment appears automatically, no manual trigger needed
- Honest framing: never imply live tweets or real-time X search that isn't happening

## Non-goals

- Not adding sentiment to `/stocks/[symbol]` pages (feed page only, for now)
- Not doing per-user sentiment calls — one Grok call per unique symbol per day, shared across all users
- Not integrating the official X/Twitter API
- Not building a manual "refresh sentiment now" button

## Architecture

```
Vercel Cron (0 2 * * 1-5 UTC, 7:30 AM IST weekdays)
  → /api/cron/sentiment-scan  (nodejs runtime, CRON_SECRET-gated)
    1. Query `holdings` + `watchlist` via Supabase service role (bypasses RLS)
    2. Union distinct symbols across all users
    3. Cap at 200 symbols/day; if over cap, prioritize by how many
       users hold/watchlist each symbol (most-common first)
    4. For each symbol (sequential, ~200ms delay between calls):
       call Grok (grok-4.3, xAI OpenAI-compatible client) with a
       sentiment prompt, parse {label, blurb} JSON response
    5. Upsert into `sentiment_scores` table keyed by symbol
       (per-symbol try/catch — one failure doesn't fail the whole run,
       stale row from previous day is left in place)

/dashboard/feed (client component)
  1. Fetch session, then user's `holdings` + `watchlist` symbols
  2. Fetch matching rows from `sentiment_scores` (public read policy)
  3. Render sentiment list; symbols with no row yet show "Not scanned yet"
```

## Data model

New Supabase table, RLS enabled, public read (no PII, symbol-keyed only):

```sql
CREATE TABLE IF NOT EXISTS public.sentiment_scores (
  symbol      text primary key,
  exchange    text not null default 'NSE',
  label       text not null,        -- 'bullish' | 'bearish' | 'neutral'
  blurb       text not null,        -- Grok's 1-line reason, ~120 chars
  scanned_at  timestamptz not null default now()
);
ALTER TABLE public.sentiment_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_sentiment" ON public.sentiment_scores FOR SELECT USING (true);
```

Cron writes via `SUPABASE_SERVICE_ROLE_KEY` (already used by `push/check-alerts`, same pattern). No per-user rows — one row per symbol, overwritten daily on each successful scan.

## Grok prompt

```
You're a stock market sentiment analyst. In one short sentence (max 120 chars),
give current retail/market sentiment for ${symbol} (Indian stock, NSE).
Reply as JSON: {"label":"bullish"|"bearish"|"neutral","blurb":"..."}
```

Client: OpenAI SDK pointed at `https://api.x.ai/v1`, model `grok-4.3`, `max_tokens` ~80, no `/v1/responses` live-search endpoint (keeps cost at ~$0.001/call vs ~$0.028/call for search).

## Feed page UI

Convert `app/dashboard/feed/page.tsx` to a client component (same session-fetch pattern as `app/dashboard/watchlist/page.tsx`).

- Header copy changes from "𝕏 Finance Feed" to "AI Sentiment Scan"; drop X/Twitter branding and the tweet-feed framing entirely
- Empty state (no holdings/watchlist symbols): keep a variant of the current "add stocks first" prompt
- Per-symbol row: symbol, badge (🟢 Bullish / 🔴 Bearish / 🟡 Neutral — project's existing color convention), blurb text, "Updated {scanned_at date}"
- Symbols with no `sentiment_scores` row yet (new to platform, or excluded by the 200/day cap): grey "Not scanned yet" state, not an error
- Footer disclaimer: "Not SEBI advice · AI-generated take, not real-time tweets · DYOR" (per project SEBI compliance rules)

## Error handling

- Cron: per-symbol try/catch, failures skipped and logged, don't abort the batch
- Cron: if `XAI_API_KEY` missing entirely, whole run fails gracefully (page still renders, just shows "Not scanned yet" for everything — no crash)
- Feed page: if `sentiment_scores` fetch fails, show existing-style error state consistent with other dashboard pages (e.g. watchlist's error handling)

## Cost

200 symbols × ~$0.001/call ≈ $0.20/day ≈ $6/mo worst case. In practice lower since symbols overlap across users (dedup by symbol) and few users will hold 200+ distinct stocks combined at current scale.

## Ops / manual steps required

1. Run the `sentiment_scores` SQL above in Supabase SQL editor
2. Add `XAI_API_KEY` to Vercel env vars (same key value as `twitter-agent/.env`)
3. Add cron entry to `vercel.json`:
   ```json
   { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" }
   ```
4. `CRON_SECRET` already exists as a planned env var (per push-alerts cron) — reuse it, don't create a second secret

## Out of scope / explicitly deferred

- Sentiment on stock detail pages
- Manual refresh button
- Official X API integration
- Per-user sentiment personalization
