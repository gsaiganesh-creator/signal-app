# Scheduled Jobs — signalgenie.ai

All scheduled jobs run inside **Signal_BackEnd** (`apps/api`), via a single
`APScheduler` `BackgroundScheduler` instance in `core/scheduler.py`. There is
no Dokploy "Schedules" UI configuration for any of these — they're plain
Python `cron`-style jobs registered at FastAPI startup, version-controlled
in this repo.

(Earlier on 2026-07-05 this ran differently — as Next.js routes on
Signal_FrontEnd, triggered via Dokploy Schedules shell commands. That
approach hit Cloudflare's ~100s proxy timeout on the 200-symbol sentiment
scan and required an awkward self-batching workaround. Migrated to Python
the same day specifically to remove that constraint — see
`docs/superpowers/specs/2026-07-05-python-backend-scheduler-design.md`.)

## Jobs (all times IST, `core/scheduler.py`)

| Job | Schedule | What it does |
|---|---|---|
| `morning_scan` | 9:15 AM, Mon–Fri | Dormant — signal-lifecycle feature, not currently used (see below) |
| `intraday_check` | every 5 min, 9:20 AM–3:30 PM, Mon–Fri | Dormant — same feature |
| `eod_cleanup` | 3:35 PM, Mon–Fri | Dormant — same feature |
| `sentiment_scan` | 7:30 AM, Mon–Fri | AI sentiment take (Grok) per holdings/watchlist symbol → `sentiment_scores` + `sentiment_scan_log` |
| `sentiment_backfill` | 9:30 AM, daily | Fills `sentiment_scan_log.price_7d`/`price_30d` outcomes |
| `scan_log_backfill` | 5:30 PM, daily | Fills `scan_log.price_30d`/`price_60d` outcomes (ML technical-scan track record) |
| `price_alerts_check` | every 15 min, 8:00 AM–3:45 PM (skips NSE holidays), Mon–Fri | Checks `price_alerts` targets, sends web push via `pywebpush` |

## Dormant feature note

`morning_scan`/`intraday_check`/`eod_cleanup` implement a WATCHING → TRIGGERED
→ EXPIRED signal lifecycle against `daily_signals`/`push_tokens`/
`signal_alerts` (Expo push, likely intended for a future mobile app —
`apps/signal-mobile` exists in this monorepo). Those tables had zero rows as
of the 2026-07-05 migration — never wired up end-to-end. Left untouched by
that migration; whether to build it out, retarget it, or remove it is a
separate, undecided question.

**Note:** as of 2026-07-05, `core/notifier.py` (part of this dormant feature)
also gained web-push support (reading `push_subscriptions`, sending via
`pywebpush`) — the same capability `price_alerts_check` implements
independently for the *active* dashboard feature. Two parallel
implementations of "send a web push" now exist in this codebase (one wired
to the dormant signal-lifecycle system, one wired to the live
`price_alerts`/watchlist system). Not a conflict today, but worth
reconciling before either grows further.

## Manual triggers (testing/ops)

Gated by `CRON_SECRET` (same value as Signal_FrontEnd's) via a `?secret=`
query param:

```bash
curl -X POST "https://api.signalgenie.ai/api/jobs/sentiment-scan?secret=<CRON_SECRET>"
curl -X POST "https://api.signalgenie.ai/api/jobs/sentiment-backfill?secret=<CRON_SECRET>"
curl -X POST "https://api.signalgenie.ai/api/jobs/scan-log-backfill?secret=<CRON_SECRET>"
curl -X POST "https://api.signalgenie.ai/api/jobs/price-alerts-check?secret=<CRON_SECRET>"
```

(If `api.signalgenie.ai` isn't set up yet as a Dokploy domain, trigger the
same jobs via `docker exec` into the `signal-signalbackend-*` container and
call the Python functions directly — no secret needed that way, since it's
not going through the HTTP layer at all.)

## Known external dependency

`sentiment_scan` calls Grok (xAI) per symbol. If it stops working, check
whether the xAI account has hit its credit/spending limit
(console.x.ai) before assuming a code bug — this has happened before and is
unrelated to anything in this repo.

## Adding a new job

1. Write the job function in `apps/api/core/<name>.py`
2. Add it to `_JOBS` in `apps/api/routers/jobs.py` (manual trigger)
3. Add a `scheduler.add_job(...)` call in `apps/api/core/scheduler.py` — wrap
   it in a small `_<name>_job()` function that checks `_is_market_day()`
   first if it's a live-market job (see `price_alerts_check` for the pattern)
4. Update the table above in the same commit
