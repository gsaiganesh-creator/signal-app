# Consolidate Dashboard Crons into Python Backend Scheduler — Design

Date: 2026-07-05

## Context

The sentiment-scan feature (see `2026-07-04-ai-sentiment-feed-design.md`) was originally built as Next.js API routes on `apps/web`, scheduled via Dokploy's "Schedules" feature (a shell command run inside the frontend container, hitting `localhost`). This works, but surfaced real friction:

- This VPS deployment sits behind Cloudflare (~100s proxy timeout), which killed the original single-request 200-symbol scan mid-run (confirmed in prod: `524` timeout, only 90/200 completed). Required a `BATCH_SIZE`-capped, self-resuming redesign just to survive the timeout.
- Scheduling lives in Dokploy's web UI (not version-controlled, easy to silently drift, awkward to audit).
- The two pre-existing dashboard crons (`scan-log/backfill`, `push/check-alerts`) had never actually been scheduled anywhere in production — they only existed in the now-dead `vercel.json` from before this app moved off Vercel to a VPS (Dokploy).

Separately, `apps/api` (a FastAPI Python service, "Signal_BackEnd" in Dokploy) already exists in this monorepo with a working `APScheduler`-based scheduler (`core/scheduler.py`) — but it has **never been deployed** (0 containers, ever) and its 3 existing jobs (`morning_scan`, `intraday_check`, `eod_cleanup`) reference tables (`daily_signals`, `push_tokens`, `signal_alerts`) that exist in Supabase but have **zero rows** — a dormant, never-wired-up signal-lifecycle feature (WATCHING → TRIGGERED → EXPIRED, Expo push for a mobile app), unrelated to the dashboard's actual data model (`holdings`, `watchlist`, `scan_log`, `push_subscriptions`).

Decision: deploy `apps/api` for real, and move all 4 dashboard cron jobs into its scheduler — one Python process, one file, running on its own timers, no HTTP-timeout workaround needed since nothing is an inbound request anymore.

## Goals

- One version-controlled scheduler (`core/scheduler.py`) for all dashboard cron jobs
- Remove the Cloudflare-timeout workaround entirely — jobs run to completion in one go
- No dual implementation — each job's logic exists in exactly one place (Python), the Next.js versions are deleted
- Leave the dormant signal-lifecycle feature (`daily_signals`/`push_tokens`/`morning_scan`/`intraday_check`/`eod_cleanup`) completely untouched — it's a separate, undecided feature, not in scope
- Keep `/api/sentiment-log` (read-only stats endpoint the feed page UI calls) in Next.js — unrelated to scheduling

## Non-goals

- Not rewriting or retargeting the dormant `daily_signals`/`push_tokens` jobs to use dashboard tables — they stay exactly as coded, dormant, for a decision to be made later
- Not building the mobile app's signal-lifecycle feature
- Not changing anything about how the feed page, track-record page, or watchlist page fetch data — only the *scheduling* of background jobs moves

## Architecture

```
Dokploy "Signal_BackEnd" (apps/api) — deployed for the first time, gets a
public Traefik route (api.signalgenie.ai) for health checks + manual job
triggers.

FastAPI app startup → start_scheduler() (existing, unchanged call site)
  core/scheduler.py — ONE BackgroundScheduler instance, 7 jobs total:
    [dormant, untouched]  morning_scan, intraday_check, eod_cleanup
    [new]                 sentiment_scan       — 7:30 AM IST, Mon–Fri
    [new]                 sentiment_backfill   — 9:30 AM IST, daily
    [new]                 scan_log_backfill    — 5:30 PM IST, daily
    [new]                 price_alerts_check   — every 15 min, 8:30 AM–3:45 PM IST, Mon–Fri

Each new job is a plain Python function (core/sentiment_scan.py,
core/scan_log_backfill.py, core/price_alerts.py) that:
  1. Reads pending work from Supabase (via core/supabase_rest.py — new
     generic REST helper, separate from the old core/supabase_client.py
     which stays dedicated to the dormant feature)
  2. Calls Grok (httpx → api.x.ai) or fetches prices (yfinance, matching
     the existing pattern in core/technical.py)
  3. Writes results back to Supabase

routers/jobs.py (new) — POST /api/jobs/{name} manually triggers any of the
4 new job functions directly, for testing/ops visibility (mirrors the
curl-based manual triggering used throughout today's session).

apps/web: the 4 Next.js routes that implemented this logic
(app/api/cron/sentiment-scan/, app/api/cron/sentiment-scan/backfill/,
app/api/scan-log/backfill/, app/api/push/check-alerts/) are DELETED.
Their vercel.json entries are removed too (that file is fully dead now —
this deployment never used Vercel Cron). Any Dokploy Schedules created
for Signal_FrontEnd today are deleted — the frontend no longer runs any
scheduled jobs.
```

## File structure

**New in `apps/api`:**
- `core/supabase_rest.py` — `rest_get(path, params)`, `rest_post(path, json, prefer)`, `rest_patch(path, params, json)`. Generic httpx wrapper using `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`. Shared by all 4 new job modules.
- `core/sentiment_scan.py` — `run_sentiment_scan()`, `run_sentiment_backfill()`
- `core/scan_log_backfill.py` — `run_scan_log_backfill()`
- `core/price_alerts.py` — `run_price_alerts_check()`
- `routers/jobs.py` — manual-trigger FastAPI router

**Modified in `apps/api`:**
- `core/scheduler.py` — add 4 `scheduler.add_job(...)` calls for the new functions, alongside the existing 3 (no changes to those 3)
- `requirements.txt` — add `pywebpush`
- `main.py` — `app.include_router(jobs.router, prefix="/api")`

**Deleted in `apps/web`:**
- `app/api/cron/sentiment-scan/route.ts`
- `app/api/cron/sentiment-scan/backfill/route.ts`
- `app/api/scan-log/backfill/route.ts`
- `app/api/push/check-alerts/route.ts`
- Corresponding entries in `vercel.json`

**Untouched:**
- `app/api/sentiment-log/route.ts` (read-only stats for the feed page)
- Everything else in `apps/web`
- `apps/api/core/scheduler.py`'s 3 existing jobs, `core/swing_scan.py`, `core/price_checker.py`, `core/notifier.py`, `core/supabase_client.py`

## Scheduling, error handling, idempotency

| Job | Schedule (IST) | Notes |
|---|---|---|
| `sentiment_scan` | 7:30 AM, Mon–Fri | Loops all pending symbols (holdings+watchlist, capped 200) in one run — no more artificial per-call batching, since this isn't an inbound HTTP request and nothing times it out |
| `sentiment_backfill` | 9:30 AM, daily | Fills `sentiment_scan_log.price_7d`/`price_30d` outcomes |
| `scan_log_backfill` | 5:30 PM, daily | Fills `scan_log.price_30d`/`price_60d` outcomes (same timing as the original TS route) |
| `price_alerts_check` | every 15 min, 8:30 AM–3:45 PM, Mon–Fri | Checks `holdings`/`watchlist` price targets in `push_subscriptions`-linked alerts, sends via `pywebpush` |

- Each job wrapped in try/except + `logger.error(...)`, matching the existing dormant jobs' pattern — one job failing never crashes the scheduler or blocks other jobs (APScheduler isolates per-job).
- `sentiment_scan` still checks "already scanned today" (via `sentiment_scan_log`) before calling Grok for a symbol — carried over from the TS version, prevents duplicate work on a manual re-trigger or restart mid-day.
- `price_alerts_check` and `scan_log_backfill` port their existing TS logic 1:1 (same Yahoo-price-based comparison, same Supabase filters) — just in Python, using `yfinance` instead of raw Yahoo chart API calls to match this codebase's existing convention (`core/technical.py`).

## Env vars (Signal_BackEnd, Dokploy)

```
SUPABASE_URL, SUPABASE_SERVICE_KEY     — apps/api's existing naming; same secret values as
                                          the frontend's NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
XAI_API_KEY                            — same value as frontend
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
VAPID_EMAIL                            — same values as frontend's existing push setup
FRONTEND_URL=https://signalgenie.ai    — fixes main.py's stale CORS default (currently points
                                          at an old Vercel URL that no longer exists)
```

## Deployment

1. Add the env vars above to Signal_BackEnd in Dokploy
2. Deploy Signal_BackEnd for the first time (build from `apps/api/Dockerfile`, which already works as-is — `EXPOSE 8000`, `uvicorn main:app`)
3. Add a Traefik route: `api.signalgenie.ai` → Signal_BackEnd, port 8000 (mirrors the existing `signal-signalfrontend-1o9uuy` dynamic config pattern)
4. Verify `GET https://api.signalgenie.ai/` returns `{"status":"ok","service":"SIGNAL API"}`
5. Verify the scheduler started (check container logs for `scheduler: started (...)` — update that log line to list all 7 job names, not just the original 3)
6. Manually trigger each new job once via `POST /api/jobs/{name}` and verify Supabase rows land correctly
7. Delete the 4 Next.js routes + `vercel.json` entries from `apps/web`, delete any Dokploy Schedules created for Signal_FrontEnd today
8. Let the real schedule run overnight, verify next-day

## Out of scope / explicitly deferred

- Deciding the fate of `daily_signals`/`push_tokens`/`signal_alerts` and the mobile-app signal-lifecycle feature
- Building or wiring the mobile app itself
- Any change to the feed page, track-record page, or other dashboard UI
