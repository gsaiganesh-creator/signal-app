# Python Backend Scheduler Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 4 dashboard cron jobs (sentiment-scan, sentiment-scan-backfill, scan-log-backfill, push-check-alerts) from Next.js routes into `apps/api`'s existing (never-deployed) FastAPI + APScheduler service, deploy that service for real, and delete the Next.js versions so each job exists in exactly one place.

**Architecture:** `apps/api/core/scheduler.py` already runs a `BackgroundScheduler` with 3 dormant jobs (untouched by this work). Add 4 new jobs to the same scheduler instance, each a plain Python function backed by a new generic Supabase REST helper and a shared yfinance price-fetch helper. Add a manual-trigger router for testing. Deploy the service on Dokploy as "Signal_BackEnd" with a new public route (`api.signalgenie.ai`), then delete the now-redundant Next.js routes.

**Tech Stack:** FastAPI, APScheduler (`BackgroundScheduler`, `CronTrigger`), `httpx` (Supabase REST + xAI Grok calls), `yfinance` (price lookups, matching the existing `core/technical.py` pattern), `pywebpush` (new dependency, for browser push notifications).

**Reference spec:** `docs/superpowers/specs/2026-07-05-python-backend-scheduler-design.md`

**Note on testing:** Neither `apps/web` nor `apps/api` has a test framework configured (no pytest, no test files anywhere in `apps/api`). Every existing route/job in this codebase is verified by running it and checking real output (Supabase rows, curl responses). This plan follows that convention.

---

### Task 1: Add `pywebpush` dependency

**Files:**
- Modify: `apps/api/requirements.txt`

- [ ] **Step 1: Add the dependency**

Current file:
```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
yfinance>=0.2.50
pandas>=2.0.0
numpy>=1.26.0
ta>=0.11.0
vaderSentiment>=3.3.2
python-dotenv>=1.0.0
requests>=2.31.0
apscheduler>=3.10.0
httpx>=0.27.0
pytz>=2024.1
```

Add one line at the end:
```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
yfinance>=0.2.50
pandas>=2.0.0
numpy>=1.26.0
ta>=0.11.0
vaderSentiment>=3.3.2
python-dotenv>=1.0.0
requests>=2.31.0
apscheduler>=3.10.0
httpx>=0.27.0
pytz>=2024.1
pywebpush>=2.0.0
```

- [ ] **Step 2: Install locally to verify it resolves**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && python3 -m venv .venv 2>/dev/null; source .venv/bin/activate && pip install -r requirements.txt
```

Expected: installs successfully, no dependency conflicts. Keep this venv active for the rest of this plan's local verification steps.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/requirements.txt
git commit -m "$(cat <<'EOF'
Add pywebpush dependency for browser push notifications

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Shared price-fetch helper

**Files:**
- Create: `apps/api/core/price_utils.py`

- [ ] **Step 1: Write the module**

```python
"""Shared price-fetch helper for cron jobs — mirrors the yfinance pattern
already used in core/technical.py."""
import logging

import yfinance as yf

logger = logging.getLogger(__name__)


def yahoo_symbol(symbol: str, exchange: str) -> str:
    if exchange == "BSE":
        return f"{symbol}.BO"
    if exchange in ("NYSE", "NASDAQ"):
        return symbol
    return f"{symbol}.NS"


def fetch_price(symbol: str, exchange: str) -> float | None:
    try:
        tk = yf.Ticker(yahoo_symbol(symbol, exchange))
        hist = tk.history(period="1d")
        if hist.empty:
            return None
        return float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.error("price_utils: fetch failed for %s: %s", symbol, e)
        return None
```

- [ ] **Step 2: Verify it works against a real ticker**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate && python3 -c "
from core.price_utils import fetch_price
print(fetch_price('RELIANCE', 'NSE'))
"
```

Expected: prints a float (current RELIANCE price), not `None`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/price_utils.py
git commit -m "$(cat <<'EOF'
Add shared yfinance price-fetch helper for cron jobs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Generic Supabase REST helper

**Files:**
- Create: `apps/api/core/supabase_rest.py`

**Context:** `apps/api` already has `core/supabase_client.py`, but it's a small set of functions specific to the dormant signal-lifecycle feature (`daily_signals`, `push_tokens`). Don't touch that file — this is a separate, generic helper for the new dashboard-cron jobs, using different env var reads only in the sense that both read `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (same names, that part is already consistent).

- [ ] **Step 1: Write the module**

```python
"""Generic Supabase REST helpers for the dashboard cron jobs (sentiment scan,
scan log backfill, price alerts). Separate from core/supabase_client.py,
which is dedicated to the dormant signal-lifecycle feature."""
import os

import httpx

_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_HEADERS = {
    "apikey": _KEY,
    "Authorization": f"Bearer {_KEY}",
    "Content-Type": "application/json",
}


def rest_get(path: str, params: dict | list[tuple[str, str]] | None = None) -> list[dict]:
    with httpx.Client(timeout=15.0) as client:
        r = client.get(f"{_URL}/rest/v1/{path}", headers=_HEADERS, params=params or {})
        r.raise_for_status()
        return r.json()


def rest_post(path: str, json_body: dict, prefer: str = "return=minimal") -> None:
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            f"{_URL}/rest/v1/{path}",
            headers={**_HEADERS, "Prefer": prefer},
            json=json_body,
        )
        r.raise_for_status()


def rest_patch(path: str, params: dict, json_body: dict, prefer: str = "return=minimal") -> None:
    with httpx.Client(timeout=15.0) as client:
        r = client.patch(
            f"{_URL}/rest/v1/{path}",
            headers={**_HEADERS, "Prefer": prefer},
            params=params,
            json=json_body,
        )
        r.raise_for_status()
```

- [ ] **Step 2: Verify it can read real data**

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars set locally first:

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" ../web/.env.local | cut -d= -f2-)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../web/.env.local | cut -d= -f2-)
python3 -c "
from core.supabase_rest import rest_get
rows = rest_get('holdings', {'select': 'symbol,exchange', 'limit': '3'})
print(rows)
"
```

Expected: prints a list of up to 3 dicts like `[{'symbol': 'ABB', 'exchange': 'NSE'}, ...]`

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/supabase_rest.py
git commit -m "$(cat <<'EOF'
Add generic Supabase REST helper for dashboard cron jobs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Sentiment scan + backfill jobs

**Files:**
- Create: `apps/api/core/sentiment_scan.py`

**Context:** Ports the logic from the now-deleted-later `apps/web/app/api/cron/sentiment-scan/route.ts` and `apps/web/app/api/cron/sentiment-scan/backfill/route.ts`. No more `BATCH_SIZE`/`remaining` self-batching — this runs as a background job with no HTTP timeout, so it processes the whole pending list in one call. Still checks "already scanned today" for idempotency on manual re-triggers.

- [ ] **Step 1: Write the module**

```python
"""Sentiment scan — daily AI sentiment take per holdings/watchlist symbol via
Grok (xAI), plus a backfill job that fills in 7d/30d outcome prices for
accuracy tracking. Ported from the Next.js routes that implemented this
before the move to this Python scheduler."""
import json
import logging
import os
import time
from datetime import date, datetime, timedelta, timezone

import httpx

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch, rest_post

logger = logging.getLogger(__name__)

_XAI_KEY = os.getenv("XAI_API_KEY", "")
_MAX_SYMBOLS = 200


def _grok_sentiment(symbol: str, exchange: str) -> dict | None:
    prompt = (
        f"You're a stock market sentiment analyst. In one short sentence (max 120 chars), "
        f"give current retail/market sentiment for {symbol} ({exchange} listed stock). "
        f'Reply as JSON: {{"label":"bullish"|"bearish"|"neutral","blurb":"..."}}'
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {_XAI_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "grok-4.3",
                    "max_tokens": 80,
                    "messages": [
                        {"role": "system", "content": "You are a stock sentiment engine. Return only valid JSON, no markdown."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            r.raise_for_status()
            raw = r.json()["choices"][0]["message"]["content"]
            clean = raw.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean)
            if parsed.get("label") not in ("bullish", "bearish", "neutral"):
                return None
            return {"label": parsed["label"], "blurb": str(parsed.get("blurb", ""))[:160]}
    except Exception as e:
        logger.error("sentiment_scan: grok call failed for %s: %s", symbol, e)
        return None


def run_sentiment_scan() -> dict:
    holdings = rest_get("holdings", {"select": "symbol,exchange"})
    watchlist = rest_get("watchlist", {"select": "symbol,exchange"})

    counts: dict[str, dict] = {}
    for row in holdings + watchlist:
        sym = row["symbol"]
        if sym in counts:
            counts[sym]["count"] += 1
        else:
            counts[sym] = {"symbol": sym, "exchange": row["exchange"], "count": 1}

    ranked = sorted(counts.values(), key=lambda r: -r["count"])[:_MAX_SYMBOLS]

    today = date.today().isoformat()
    done_rows = rest_get("sentiment_scan_log", {"scanned_at": f"eq.{today}", "select": "symbol"})
    done_today = {r["symbol"] for r in done_rows}

    pending = [r for r in ranked if r["symbol"] not in done_today]

    scanned = failed = logged = 0
    for row in pending:
        symbol, exchange = row["symbol"], row["exchange"]
        result = _grok_sentiment(symbol, exchange)
        if result:
            try:
                rest_post(
                    "sentiment_scores",
                    {
                        "symbol": symbol, "exchange": exchange,
                        "label": result["label"], "blurb": result["blurb"],
                        "scanned_at": datetime.now(timezone.utc).isoformat(),
                    },
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                scanned += 1
            except Exception as e:
                logger.error("sentiment_scan: upsert failed for %s: %s", symbol, e)
                failed += 1

            price = fetch_price(symbol, exchange)
            if price is not None:
                try:
                    rest_post(
                        "sentiment_scan_log",
                        {
                            "scanned_at": today, "symbol": symbol, "exchange": exchange,
                            "label": result["label"], "price_at": price,
                        },
                        prefer="resolution=merge-duplicates,return=minimal",
                    )
                    logged += 1
                except Exception as e:
                    logger.error("sentiment_scan: log insert failed for %s: %s", symbol, e)
        else:
            failed += 1
        time.sleep(0.2)

    summary = {"candidates": len(ranked), "processed": len(pending), "scanned": scanned, "failed": failed, "logged": logged}
    logger.info("sentiment_scan: %s", summary)
    return summary


def run_sentiment_backfill() -> dict:
    today = date.today()
    d7ago = (today - timedelta(days=7)).isoformat()
    d30ago = (today - timedelta(days=30)).isoformat()

    need7 = rest_get("sentiment_scan_log", [
        ("scanned_at", f"lte.{d7ago}"),
        ("price_7d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "200"),
    ])
    need30 = rest_get("sentiment_scan_log", [
        ("scanned_at", f"lte.{d30ago}"),
        ("price_30d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "200"),
    ])

    price_cache: dict[str, float | None] = {}
    for row in need7 + need30:
        key = f"{row['symbol']}:{row['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(row["symbol"], row["exchange"])
            time.sleep(0.2)

    updated7 = updated30 = 0
    for row in need7:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("sentiment_scan_log", {"id": f"eq.{row['id']}"}, {"price_7d": price, "return_7d": ret})
            updated7 += 1
        except Exception as e:
            logger.error("sentiment_backfill: 7d patch failed for %s: %s", row["symbol"], e)

    for row in need30:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("sentiment_scan_log", {"id": f"eq.{row['id']}"}, {"price_30d": price, "return_30d": ret})
            updated30 += 1
        except Exception as e:
            logger.error("sentiment_backfill: 30d patch failed for %s: %s", row["symbol"], e)

    summary = {"updated_7d": updated7, "updated_30d": updated30}
    logger.info("sentiment_backfill: %s", summary)
    return summary
```

- [ ] **Step 2: Verify `run_sentiment_scan` end-to-end**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" ../web/.env.local | cut -d= -f2-)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../web/.env.local | cut -d= -f2-)
export XAI_API_KEY=$(grep "^XAI_API_KEY=" ../web/.env.local | cut -d= -f2-)
python3 -c "
from core.sentiment_scan import run_sentiment_scan
print(run_sentiment_scan())
"
```

Expected: a dict like `{'candidates': 200, 'processed': <N>, 'scanned': <N>, 'failed': 0, 'logged': <N>}` — `processed` should be small or 0 if today's symbols were already scanned earlier (by the old TS cron); that's correct idempotent behavior, not a bug.

- [ ] **Step 3: Verify `run_sentiment_backfill` runs without error**

```bash
python3 -c "
from core.sentiment_scan import run_sentiment_backfill
print(run_sentiment_backfill())
"
```

Expected: a dict like `{'updated_7d': <N>, 'updated_30d': <N>}` — likely 0s if no rows are old enough yet, that's correct.

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/sentiment_scan.py
git commit -m "$(cat <<'EOF'
Port sentiment scan + backfill jobs to Python scheduler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Scan log backfill job

**Files:**
- Create: `apps/api/core/scan_log_backfill.py`

**Context:** Ports `apps/web/app/api/scan-log/backfill/route.ts` (30d/60d outcome backfill for the ML technical-scan track record).

- [ ] **Step 1: Write the module**

```python
"""Scan log backfill — fills in 30d/60d outcome prices for the ML technical
scan track record (scan_log table). Ported from the Next.js route that
implemented this before the move to this Python scheduler."""
import logging
from datetime import date, timedelta

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch

logger = logging.getLogger(__name__)


def run_scan_log_backfill() -> dict:
    today = date.today()
    d30ago = (today - timedelta(days=30)).isoformat()
    d60ago = (today - timedelta(days=60)).isoformat()
    d65ago = (today - timedelta(days=65)).isoformat()

    need30 = rest_get("scan_log", [
        ("scanned_at", f"lte.{d30ago}"),
        ("price_30d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "100"),
    ])
    need60 = rest_get("scan_log", [
        ("scanned_at", f"lte.{d60ago}"),
        ("scanned_at", f"gte.{d65ago}"),
        ("price_60d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "100"),
    ])

    price_cache: dict[str, float | None] = {}
    for row in need30 + need60:
        key = f"{row['symbol']}:{row['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(row["symbol"], row["exchange"])

    updated30 = updated60 = 0
    for row in need30:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("scan_log", {"id": f"eq.{row['id']}"}, {"price_30d": price, "return_30d": ret})
            updated30 += 1
        except Exception as e:
            logger.error("scan_log_backfill: 30d patch failed for %s: %s", row["symbol"], e)

    for row in need60:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("scan_log", {"id": f"eq.{row['id']}"}, {"price_60d": price, "return_60d": ret})
            updated60 += 1
        except Exception as e:
            logger.error("scan_log_backfill: 60d patch failed for %s: %s", row["symbol"], e)

    summary = {"updated_30d": updated30, "updated_60d": updated60}
    logger.info("scan_log_backfill: %s", summary)
    return summary
```

- [ ] **Step 2: Verify it runs without error**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
python3 -c "
from core.scan_log_backfill import run_scan_log_backfill
print(run_scan_log_backfill())
"
```

Expected: `{'updated_30d': <N>, 'updated_60d': <N>}` — check against real data with:
```bash
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" ../web/.env.local | cut -d= -f2-)
KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" ../web/.env.local | cut -d= -f2-)
curl -s "$URL/rest/v1/scan_log?select=symbol,price_30d&price_30d=not.is.null&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: if any rows are ≥30 days old, they should now show a non-null `price_30d`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/scan_log_backfill.py
git commit -m "$(cat <<'EOF'
Port scan-log backfill job to Python scheduler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Price alerts check job

**Files:**
- Create: `apps/api/core/price_alerts.py`

**Context:** Ports `apps/web/app/api/push/check-alerts/route.ts`. Uses `pywebpush` (added in Task 1) instead of the Node `web-push` library. Same `price_alerts` and `push_subscriptions` tables, same VAPID keys, same notification payload shape.

- [ ] **Step 1: Write the module**

```python
"""Price alerts check — fires web push notifications when a user's price
alert target is hit. Ported from the Next.js route that implemented this
before the move to this Python scheduler."""
import json
import logging
import os
from datetime import datetime, timezone

from pywebpush import WebPushException, webpush

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch

logger = logging.getLogger(__name__)

_VAPID_PRIVATE = os.getenv("VAPID_PRIVATE_KEY", "")
_VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:support@signalgenie.ai")


def run_price_alerts_check() -> dict:
    alerts = rest_get("price_alerts", {"triggered": "eq.false", "select": "*"})
    if not alerts:
        return {"checked": 0, "triggered": 0, "sent": 0}

    price_cache: dict[str, float | None] = {}
    for a in alerts:
        key = f"{a['symbol']}:{a['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(a["symbol"], a["exchange"])

    triggered = []
    for a in alerts:
        price = price_cache.get(f"{a['symbol']}:{a['exchange']}")
        if price is None:
            continue
        hit = price >= a["target_price"] if a["condition"] == "above" else price <= a["target_price"]
        if hit:
            triggered.append({**a, "current_price": price})

    if not triggered:
        return {"checked": len(alerts), "triggered": 0, "sent": 0}

    for a in triggered:
        try:
            rest_patch("price_alerts", {"id": f"eq.{a['id']}"}, {
                "triggered": True,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "triggered_price": a["current_price"],
            })
        except Exception as e:
            logger.error("price_alerts: mark-triggered failed for %s: %s", a["symbol"], e)

    user_ids = sorted({a["user_id"] for a in triggered})
    sub_filter = "(" + ",".join(f'"{u}"' for u in user_ids) + ")"
    subs = rest_get("push_subscriptions", {"user_id": f"in.{sub_filter}", "select": "*"})

    sent = 0
    for a in triggered:
        user_subs = [s for s in subs if s["user_id"] == a["user_id"]]
        direction = "above" if a["condition"] == "above" else "below"
        payload = json.dumps({
            "title": f"🔔 {a['symbol']} Alert Triggered",
            "body": f"{a['symbol']} is now ₹{a['current_price']:,.2f} — {direction} your ₹{a['target_price']} target.",
            "url": "/dashboard/watchlist",
            "tag": f"alert-{a['id']}",
        })
        for sub in user_subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                    },
                    data=payload,
                    vapid_private_key=_VAPID_PRIVATE,
                    vapid_claims={"sub": _VAPID_EMAIL},
                )
                sent += 1
            except WebPushException as e:
                logger.warning("price_alerts: push send failed for %s: %s", a["symbol"], e)

    summary = {"checked": len(alerts), "triggered": len(triggered), "sent": sent}
    logger.info("price_alerts: %s", summary)
    return summary
```

- [ ] **Step 2: Verify it runs without error**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
python3 -c "
from core.price_alerts import run_price_alerts_check
print(run_price_alerts_check())
"
```

Expected: `{'checked': <N>, 'triggered': <N>, 'sent': <N>}` — `checked` will be 0 if `price_alerts` has no untriggered rows yet, which is fine (no live alerts have been set from the watchlist page as of this writing).

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/price_alerts.py
git commit -m "$(cat <<'EOF'
Port price-alerts-check job to Python scheduler (pywebpush)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Manual-trigger router

**Files:**
- Create: `apps/api/routers/jobs.py`
- Modify: `apps/api/main.py`

- [ ] **Step 1: Write the router**

```python
from fastapi import APIRouter

from core.price_alerts import run_price_alerts_check
from core.scan_log_backfill import run_scan_log_backfill
from core.sentiment_scan import run_sentiment_backfill, run_sentiment_scan

router = APIRouter(prefix="/jobs", tags=["jobs"])

_JOBS = {
    "sentiment-scan": run_sentiment_scan,
    "sentiment-backfill": run_sentiment_backfill,
    "scan-log-backfill": run_scan_log_backfill,
    "price-alerts-check": run_price_alerts_check,
}


@router.post("/{name}")
def trigger_job(name: str):
    fn = _JOBS.get(name)
    if fn is None:
        return {"error": f"unknown job '{name}'", "available": list(_JOBS.keys())}
    result = fn()
    return {"job": name, "result": result}
```

- [ ] **Step 2: Wire it into `main.py`**

Current relevant lines (`apps/api/main.py:8` and `:30-32`):
```python
from routers import signals, sentiment, market
from core.scheduler import start_scheduler
```
```python
app.include_router(signals.router, prefix="/api")
app.include_router(sentiment.router, prefix="/api")
app.include_router(market.router, prefix="/api")
```

Change to:
```python
from routers import jobs, signals, sentiment, market
from core.scheduler import start_scheduler
```
```python
app.include_router(signals.router, prefix="/api")
app.include_router(sentiment.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
```

- [ ] **Step 3: Verify the app starts and the router is registered**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" ../web/.env.local | cut -d= -f2-)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../web/.env.local | cut -d= -f2-)
export XAI_API_KEY=$(grep "^XAI_API_KEY=" ../web/.env.local | cut -d= -f2-)
uvicorn main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/
curl -s -X POST http://localhost:8000/api/jobs/scan-log-backfill
kill %1
```

Expected: first curl returns `{"status":"ok","service":"SIGNAL API"}`; second returns `{"job":"scan-log-backfill","result":{"updated_30d":...,"updated_60d":...}}`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/routers/jobs.py apps/api/main.py
git commit -m "$(cat <<'EOF'
Add manual job-trigger router for testing/ops visibility

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Wire the 4 new jobs into the scheduler

**Files:**
- Modify: `apps/api/core/scheduler.py`

- [ ] **Step 1: Add imports**

Current top of file (`apps/api/core/scheduler.py:1-10`):
```python
import logging
from datetime import date

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")
```

Change to:
```python
import logging
from datetime import date

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from core.price_alerts import run_price_alerts_check
from core.scan_log_backfill import run_scan_log_backfill
from core.sentiment_scan import run_sentiment_backfill, run_sentiment_scan

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")
```

- [ ] **Step 2: Add the 4 new jobs before `scheduler.start()`**

Current end of `start_scheduler()` (`apps/api/core/scheduler.py:91-102`):
```python
    # 3:35 PM IST — expire remaining WATCHING signals
    scheduler.add_job(
        _eod_cleanup_job,
        CronTrigger(day_of_week="mon-fri", hour=15, minute=35, timezone=IST),
        id="eod_cleanup",
        name="EOD Cleanup",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("scheduler: started (morning_scan, intraday_check, eod_cleanup)")
    return scheduler
```

Change to:
```python
    # 3:35 PM IST — expire remaining WATCHING signals
    scheduler.add_job(
        _eod_cleanup_job,
        CronTrigger(day_of_week="mon-fri", hour=15, minute=35, timezone=IST),
        id="eod_cleanup",
        name="EOD Cleanup",
        replace_existing=True,
    )

    # 7:30 AM IST — sentiment scan for holdings+watchlist symbols, Mon–Fri
    scheduler.add_job(
        run_sentiment_scan,
        CronTrigger(day_of_week="mon-fri", hour=7, minute=30, timezone=IST),
        id="sentiment_scan",
        name="Sentiment Scan",
        replace_existing=True,
    )

    # 9:30 AM IST — sentiment 7d/30d outcome backfill, daily
    scheduler.add_job(
        run_sentiment_backfill,
        CronTrigger(hour=9, minute=30, timezone=IST),
        id="sentiment_backfill",
        name="Sentiment Backfill",
        replace_existing=True,
    )

    # 5:30 PM IST — ML scan 30d/60d outcome backfill, daily
    scheduler.add_job(
        run_scan_log_backfill,
        CronTrigger(hour=17, minute=30, timezone=IST),
        id="scan_log_backfill",
        name="Scan Log Backfill",
        replace_existing=True,
    )

    # Every 15 min, 8:30 AM–3:45 PM IST — price alert check, Mon–Fri
    scheduler.add_job(
        run_price_alerts_check,
        CronTrigger(day_of_week="mon-fri", hour="8-15", minute="*/15", timezone=IST),
        id="price_alerts_check",
        name="Price Alerts Check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "scheduler: started (morning_scan, intraday_check, eod_cleanup, "
        "sentiment_scan, sentiment_backfill, scan_log_backfill, price_alerts_check)"
    )
    return scheduler
```

- [ ] **Step 3: Verify the app starts with all 7 jobs registered**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" ../web/.env.local | cut -d= -f2-)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../web/.env.local | cut -d= -f2-)
export XAI_API_KEY=$(grep "^XAI_API_KEY=" ../web/.env.local | cut -d= -f2-)
python3 -c "
from main import app
print('app loaded ok')
"
```

Expected: `app loaded ok`, no import errors. (Loading `main` triggers module-level imports but not `startup()` — that only runs under uvicorn. This step just confirms nothing fails to import.)

Then start it for real and check the startup log line:
```bash
uvicorn main:app --port 8000 > /tmp/api.log 2>&1 &
sleep 3
grep "scheduler: started" /tmp/api.log
kill %1
```

Expected: a log line containing all 7 job names (`morning_scan, intraday_check, eod_cleanup, sentiment_scan, sentiment_backfill, scan_log_backfill, price_alerts_check`).

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/scheduler.py
git commit -m "$(cat <<'EOF'
Wire 4 dashboard cron jobs into the APScheduler instance

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Deploy Signal_BackEnd on Dokploy

**Files:** None (Dokploy UI + Dokploy env vars — manual step, user performs this)

- [ ] **Step 1: Add env vars to Signal_BackEnd in Dokploy**

Dokploy UI (https://dok.texcrux.com) → Signal_BackEnd app → Environment:
```
SUPABASE_URL=<same value as apps/web's NEXT_PUBLIC_SUPABASE_URL>
SUPABASE_SERVICE_KEY=<same value as apps/web's SUPABASE_SERVICE_ROLE_KEY>
XAI_API_KEY=<same value as apps/web's XAI_API_KEY>
VAPID_PUBLIC_KEY=<same value as apps/web's NEXT_PUBLIC_VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=<same value as apps/web's VAPID_PRIVATE_KEY>
VAPID_EMAIL=<same value as apps/web's VAPID_EMAIL>
FRONTEND_URL=https://signalgenie.ai
```

- [ ] **Step 2: Push this plan's commits and deploy**

```bash
cd "/Users/gsaiganesh/signal-app" && git push origin main
```

Then in Dokploy UI → Signal_BackEnd → click **Deploy** (first-time manual deploy — it has 0 containers so far, unlike Signal_FrontEnd this won't auto-deploy via webhook until this first deploy happens).

- [ ] **Step 3: Add a public route**

Dokploy UI → Signal_BackEnd → Domains tab → add domain `api.signalgenie.ai`, port `8000`.

Then in whatever DNS provider manages `signalgenie.ai` (likely Cloudflare, given the `524` timeout seen earlier on the main domain): when creating the `api.signalgenie.ai` DNS record, set it to **DNS only** (grey cloud), not proxied. This avoids the same ~100s proxy timeout that broke the original single-request sentiment scan — `sentiment-scan` can take several minutes when manually triggered via HTTP in Task 9 Step 6. The actual scheduled runs don't need this at all (APScheduler calls the Python function directly, no HTTP involved) — this only matters for convenient manual/testing triggers over HTTPS.

- [ ] **Step 4: Verify the health check**

```bash
curl -s https://api.signalgenie.ai/
```

Expected: `{"status":"ok","service":"SIGNAL API"}`

- [ ] **Step 5: Verify the scheduler started with all 7 jobs (via SSH)**

```bash
ssh -i ~/.ssh/texcrux debian@51.254.131.140 "CID=\$(sudo -n docker ps --filter name=signal-signalbackend -q | head -1); sudo -n docker logs \$CID --since 5m 2>&1 | grep 'scheduler: started'"
```

Expected: the log line listing all 7 job names.

- [ ] **Step 6: Manually trigger each new job once and verify Supabase**

```bash
curl -s -X POST https://api.signalgenie.ai/api/jobs/sentiment-scan
curl -s -X POST https://api.signalgenie.ai/api/jobs/sentiment-backfill
curl -s -X POST https://api.signalgenie.ai/api/jobs/scan-log-backfill
curl -s -X POST https://api.signalgenie.ai/api/jobs/price-alerts-check
```

Expected: each returns `{"job": "...", "result": {...}}` with no errors. Since this hits a real public route (not inside the container), and this job can take minutes for a full sentiment scan, expect the `sentiment-scan` call specifically to take several minutes — this is fine now, since there's no Cloudflare-style timeout on a direct HTTPS call to `api.signalgenie.ai` the way there was on `signalgenie.ai`'s cron routes. (If `api.signalgenie.ai` turns out to also sit behind the same Cloudflare timeout, this call may need to be triggered via `docker exec` directly instead — check this in practice; if it times out, that's a real finding to report before continuing to Task 10.)

---

### Task 10: Delete the redundant Next.js routes

**Files:**
- Delete: `apps/web/app/api/cron/sentiment-scan/route.ts`
- Delete: `apps/web/app/api/cron/sentiment-scan/backfill/route.ts`
- Delete: `apps/web/app/api/scan-log/backfill/route.ts`
- Delete: `apps/web/app/api/push/check-alerts/route.ts`
- Modify: `apps/web/vercel.json`

**Depends on:** Task 9 confirming the Python versions actually work in production. Don't delete until that's verified — these are the only working implementation until Signal_BackEnd is confirmed live.

- [ ] **Step 1: Delete the 4 route files**

```bash
cd "/Users/gsaiganesh/signal-app"
rm -rf apps/web/app/api/cron
rm -rf apps/web/app/api/scan-log/backfill
rm -rf apps/web/app/api/push/check-alerts
```

- [ ] **Step 2: Remove their entries from `vercel.json`**

Current file:
```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "crons": [
    { "path": "/api/scan-log/backfill", "schedule": "0 12 * * *" },
    { "path": "/api/paper-trading/auto-scan", "schedule": "0 4 * * 1-5" },
    { "path": "/api/push/check-alerts", "schedule": "0 4 * * 1-5" },
    { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" },
    { "path": "/api/cron/sentiment-scan/backfill", "schedule": "0 3 * * *" }
  ]
}
```

Change to:
```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "crons": [
    { "path": "/api/paper-trading/auto-scan", "schedule": "0 4 * * 1-5" }
  ]
}
```

(`paper-trading/auto-scan` stays — it's untouched by this migration, not one of the 4 jobs being ported.)

- [ ] **Step 3: Verify the app still builds**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npm run build
```

Expected: build succeeds, no errors about missing routes (nothing else in the codebase should reference these 4 deleted routes — confirm with a quick grep):

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && grep -rn "api/cron/sentiment-scan\|api/scan-log/backfill\|api/push/check-alerts" app/ components/ lib/ --include="*.tsx" --include="*.ts" | grep -v "app/api/cron\|app/api/scan-log\|app/api/push"
```

Expected: no output (nothing else in the frontend calls these routes directly — the feed page reads `sentiment_scores`/`sentiment_scan_log` tables directly via Supabase REST, not through these cron routes).

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add -A apps/web/app/api/cron apps/web/app/api/scan-log apps/web/app/api/push apps/web/vercel.json
git commit -m "$(cat <<'EOF'
Delete Next.js cron routes now ported to Python scheduler

sentiment-scan, sentiment-scan/backfill, scan-log/backfill, and
push/check-alerts now run from apps/api's APScheduler instance
(Signal_BackEnd) instead. Removes the dual implementation and the
Cloudflare-timeout batching workaround that was only needed because
these ran as inbound HTTP requests.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push origin main
```

- [ ] **Step 5: Verify the frontend redeploy succeeds and the feed page still works**

Wait for Dokploy's webhook-triggered redeploy of Signal_FrontEnd (same pattern as earlier in this project — poll `git rev-parse --short HEAD` on the VPS clone until it matches the new commit), then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://signalgenie.ai/
curl -s -o /dev/null -w "%{http_code}\n" https://signalgenie.ai/dashboard/feed
```

Expected: `200` for the homepage; `307` for `/dashboard/feed` if not logged in (auth redirect — same as before, not a break). Log in and visually confirm sentiment badges still render.

---

### Task 11: Update the deployment schedules doc

**Files:**
- Modify: `docs/deployment-schedules.md`

**Context:** This doc (written earlier today) currently describes the Dokploy-Schedules-hitting-Next.js-routes approach, which this migration replaces entirely. Update it to reflect reality so there's no future confusion between the two approaches.

- [ ] **Step 1: Rewrite the doc**

Replace the entire file contents with:

```markdown
# Scheduled Jobs — signalgenie.ai

All scheduled jobs run inside **Signal_BackEnd** (`apps/api`), via a single
`APScheduler` `BackgroundScheduler` instance in `core/scheduler.py`. There is
no Dokploy "Schedules" UI configuration for any of these — they're plain
Python `cron`-style jobs registered at FastAPI startup, version-controlled
in this repo.

(Earlier today this ran differently — as Next.js routes on Signal_FrontEnd,
triggered via Dokploy Schedules shell commands. That approach hit
Cloudflare's ~100s proxy timeout on the 200-symbol sentiment scan and
required an awkward self-batching workaround. Migrated to Python on
2026-07-05 specifically to remove that constraint — see
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
| `price_alerts_check` | every 15 min, 8:30 AM–3:45 PM, Mon–Fri | Checks `price_alerts` targets, sends web push via `pywebpush` |

## Dormant feature note

`morning_scan`/`intraday_check`/`eod_cleanup` implement a WATCHING → TRIGGERED
→ EXPIRED signal lifecycle against `daily_signals`/`push_tokens`/
`signal_alerts` (Expo push, likely intended for a future mobile app —
`apps/signal-mobile` exists in this monorepo). Those tables have zero rows —
this was never wired up end-to-end. Left untouched by the 2026-07-05
migration; whether to build it out, retarget it, or remove it is a separate,
undecided question.

## Manual triggers (testing/ops)

```bash
curl -X POST https://api.signalgenie.ai/api/jobs/sentiment-scan
curl -X POST https://api.signalgenie.ai/api/jobs/sentiment-backfill
curl -X POST https://api.signalgenie.ai/api/jobs/scan-log-backfill
curl -X POST https://api.signalgenie.ai/api/jobs/price-alerts-check
```

## Adding a new job

1. Write the job function in `apps/api/core/<name>.py`
2. Add it to `_JOBS` in `apps/api/routers/jobs.py` (manual trigger)
3. Add a `scheduler.add_job(...)` call in `apps/api/core/scheduler.py`
4. Update the table above in the same commit
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add docs/deployment-schedules.md
git commit -m "$(cat <<'EOF'
Update deployment-schedules doc for the Python scheduler migration

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push origin main
```
