# US Stock ML Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring US stocks to parity with India's rule-based technical-analysis engine — same signal computation, a defined ~100-stock monitored universe, and a scan mechanism mirroring India's `universe.json`/`swing_scan.py`.

**Architecture:** Reuse `apps/api/core/technical.py`'s existing symbol-agnostic `get_technical_analysis()` unchanged. Add a new US universe config + scan module in the Python backend, extend the existing `signals.py` router (fix the `.NS`-forcing bug, add a US list endpoint), add a scheduled scan job, and add a new (deliberately simple) Next.js page to display results.

**Tech Stack:** Python (FastAPI, yfinance, httpx — existing `apps/api` stack, no new dependencies), Next.js/TypeScript (existing `apps/web` stack), Supabase (new table).

**Spec:** `docs/superpowers/specs/2026-07-06-us-stock-ml-parity-design.md`

---

## Task 1: `us_universe.json` — the monitored US stock list

**Files:**
- Create: `apps/api/config/us_universe.json`

- [ ] **Step 1: Write the universe file**

```json
{
  "sectors": {
    "Technology": [
      {"symbol": "AAPL",  "name": "Apple Inc"},
      {"symbol": "MSFT",  "name": "Microsoft Corp"},
      {"symbol": "NVDA",  "name": "NVIDIA Corp"},
      {"symbol": "GOOGL", "name": "Alphabet Inc Class A"},
      {"symbol": "GOOG",  "name": "Alphabet Inc Class C"},
      {"symbol": "META",  "name": "Meta Platforms Inc"},
      {"symbol": "AMD",   "name": "Advanced Micro Devices"},
      {"symbol": "INTC",  "name": "Intel Corp"},
      {"symbol": "CRM",   "name": "Salesforce Inc"},
      {"symbol": "ORCL",  "name": "Oracle Corp"},
      {"symbol": "ADBE",  "name": "Adobe Inc"},
      {"symbol": "AVGO",  "name": "Broadcom Inc"},
      {"symbol": "QCOM",  "name": "Qualcomm Inc"},
      {"symbol": "TXN",   "name": "Texas Instruments"},
      {"symbol": "MU",    "name": "Micron Technology"},
      {"symbol": "CSCO",  "name": "Cisco Systems"},
      {"symbol": "IBM",   "name": "International Business Machines"}
    ],
    "Communication_Services": [
      {"symbol": "NFLX",  "name": "Netflix Inc"},
      {"symbol": "DIS",   "name": "Walt Disney Co"},
      {"symbol": "CMCSA", "name": "Comcast Corp"},
      {"symbol": "VZ",    "name": "Verizon Communications"},
      {"symbol": "T",     "name": "AT&T Inc"},
      {"symbol": "TMUS",  "name": "T-Mobile US"}
    ],
    "Consumer_Discretionary": [
      {"symbol": "AMZN",  "name": "Amazon.com Inc"},
      {"symbol": "TSLA",  "name": "Tesla Inc"},
      {"symbol": "HD",    "name": "Home Depot"},
      {"symbol": "MCD",   "name": "McDonald's Corp"},
      {"symbol": "NKE",   "name": "Nike Inc"},
      {"symbol": "SBUX",  "name": "Starbucks Corp"},
      {"symbol": "TGT",   "name": "Target Corp"},
      {"symbol": "COST",  "name": "Costco Wholesale"},
      {"symbol": "LOW",   "name": "Lowe's Companies"},
      {"symbol": "BKNG",  "name": "Booking Holdings"},
      {"symbol": "CMG",   "name": "Chipotle Mexican Grill"},
      {"symbol": "ORLY",  "name": "O'Reilly Automotive"}
    ],
    "Financials": [
      {"symbol": "JPM",   "name": "JPMorgan Chase"},
      {"symbol": "BAC",   "name": "Bank of America"},
      {"symbol": "V",     "name": "Visa Inc"},
      {"symbol": "MA",    "name": "Mastercard Inc"},
      {"symbol": "GS",    "name": "Goldman Sachs"},
      {"symbol": "MS",    "name": "Morgan Stanley"},
      {"symbol": "WFC",   "name": "Wells Fargo"},
      {"symbol": "C",     "name": "Citigroup Inc"},
      {"symbol": "BLK",   "name": "BlackRock Inc"},
      {"symbol": "SCHW",  "name": "Charles Schwab"},
      {"symbol": "AXP",   "name": "American Express"},
      {"symbol": "SPGI",  "name": "S&P Global Inc"},
      {"symbol": "PYPL",  "name": "PayPal Holdings"}
    ],
    "Healthcare": [
      {"symbol": "JNJ",   "name": "Johnson & Johnson"},
      {"symbol": "UNH",   "name": "UnitedHealth Group"},
      {"symbol": "PFE",   "name": "Pfizer Inc"},
      {"symbol": "ABBV",  "name": "AbbVie Inc"},
      {"symbol": "LLY",   "name": "Eli Lilly and Co"},
      {"symbol": "MRK",   "name": "Merck & Co"},
      {"symbol": "BMY",   "name": "Bristol-Myers Squibb"},
      {"symbol": "AMGN",  "name": "Amgen Inc"},
      {"symbol": "ABT",   "name": "Abbott Laboratories"},
      {"symbol": "MDT",   "name": "Medtronic plc"},
      {"symbol": "CVS",   "name": "CVS Health Corp"},
      {"symbol": "TMO",   "name": "Thermo Fisher Scientific"},
      {"symbol": "DHR",   "name": "Danaher Corp"}
    ],
    "Energy": [
      {"symbol": "XOM",   "name": "Exxon Mobil Corp"},
      {"symbol": "CVX",   "name": "Chevron Corp"},
      {"symbol": "COP",   "name": "ConocoPhillips"},
      {"symbol": "SLB",   "name": "Schlumberger NV"},
      {"symbol": "PSX",   "name": "Phillips 66"}
    ],
    "Materials": [
      {"symbol": "LIN",   "name": "Linde plc"},
      {"symbol": "APD",   "name": "Air Products and Chemicals"},
      {"symbol": "FCX",   "name": "Freeport-McMoRan"},
      {"symbol": "NEM",   "name": "Newmont Corp"},
      {"symbol": "SHW",   "name": "Sherwin-Williams"},
      {"symbol": "ECL",   "name": "Ecolab Inc"}
    ],
    "Industrials": [
      {"symbol": "CAT",   "name": "Caterpillar Inc"},
      {"symbol": "HON",   "name": "Honeywell International"},
      {"symbol": "GE",    "name": "General Electric"},
      {"symbol": "UPS",   "name": "United Parcel Service"},
      {"symbol": "BA",    "name": "Boeing Co"},
      {"symbol": "DE",    "name": "Deere & Co"},
      {"symbol": "MMM",   "name": "3M Co"},
      {"symbol": "RTX",   "name": "RTX Corp"},
      {"symbol": "LMT",   "name": "Lockheed Martin"},
      {"symbol": "NOC",   "name": "Northrop Grumman"},
      {"symbol": "GD",    "name": "General Dynamics"}
    ],
    "Utilities": [
      {"symbol": "NEE",   "name": "NextEra Energy"},
      {"symbol": "DUK",   "name": "Duke Energy"},
      {"symbol": "SO",    "name": "Southern Co"},
      {"symbol": "D",     "name": "Dominion Energy"},
      {"symbol": "EXC",   "name": "Exelon Corp"}
    ],
    "Real_Estate": [
      {"symbol": "PLD",   "name": "Prologis Inc"},
      {"symbol": "AMT",   "name": "American Tower Corp"},
      {"symbol": "EQIX",  "name": "Equinix Inc"},
      {"symbol": "SPG",   "name": "Simon Property Group"},
      {"symbol": "O",     "name": "Realty Income Corp"}
    ],
    "Consumer_Staples": [
      {"symbol": "PG",    "name": "Procter & Gamble"},
      {"symbol": "KO",    "name": "Coca-Cola Co"},
      {"symbol": "PEP",   "name": "PepsiCo Inc"},
      {"symbol": "WMT",   "name": "Walmart Inc"},
      {"symbol": "PM",    "name": "Philip Morris International"},
      {"symbol": "MO",    "name": "Altria Group"}
    ],
    "Diversified": [
      {"symbol": "BRK-B", "name": "Berkshire Hathaway Class B"}
    ],
    "ETF": [
      {"symbol": "SPY",   "name": "SPDR S&P 500 ETF"},
      {"symbol": "QQQ",   "name": "Invesco QQQ Trust"},
      {"symbol": "IVV",   "name": "iShares Core S&P 500 ETF"},
      {"symbol": "VOO",   "name": "Vanguard S&P 500 ETF"},
      {"symbol": "VTI",   "name": "Vanguard Total Stock Market ETF"},
      {"symbol": "ARKK",  "name": "ARK Innovation ETF"}
    ]
  }
}
```

- [ ] **Step 2: Verify it's valid JSON and count symbols**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && python3 -c "
import json
d = json.load(open('config/us_universe.json'))
total = sum(len(v) for v in d['sectors'].values())
print(f'{len(d[\"sectors\"])} sectors, {total} symbols')
"
```

Expected: `12 sectors, 106 symbols` (or close — exact count doesn't matter, ~100 is the target, not
an exact number).

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/config/us_universe.json
git commit -m "feat: add us_universe.json — ~100-stock US monitored universe

Mirrors universe.json's shape. Built from the sector-categorized list
already in apps/web's /api/us/analysis route, expanded to fill
genuinely missing sectors (Communication Services was absent
entirely) and round out thin ones (Utilities, Real Estate,
Materials)."
```

---

## Task 2: `us_scan.py` — the US swing-scan module

**Files:**
- Create: `apps/api/core/us_scan.py`

- [ ] **Step 1: Write the module**

```python
"""
US swing scan — mirrors core/swing_scan.py's logic and structure, applied
to the US monitored universe (config/us_universe.json) instead of India's.
"""
import json
import time
from pathlib import Path

import yfinance as yf

_UNIVERSE = Path(__file__).parent.parent / "config" / "us_universe.json"


def _calc_rsi(closes, period: int = 14):
    delta = closes.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def run_us_swing_scan(max_picks: int = 10) -> list[dict]:
    """
    RSI 42-62, price near EMA20, price > $20 (a curated large-cap universe
    won't have penny stocks — this just filters any unusually low-priced
    name, not a literal currency-mismatched copy of India's >Rs100 filter).
    Returns picks sorted by score descending.
    """
    universe = json.loads(_UNIVERSE.read_text())
    stocks: list[dict] = []
    for sector, items in universe["sectors"].items():
        for s in items:
            s = dict(s)
            s["sector"] = sector
            stocks.append(s)

    symbols = [s["symbol"] for s in stocks]
    name_map = {s["symbol"]: s["name"] for s in stocks}
    sector_map = {s["symbol"]: s["sector"] for s in stocks}

    results = []
    batch_size = 40
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i : i + batch_size]
        try:
            raw = yf.download(batch, period="1mo", interval="1d", progress=False, auto_adjust=True)
            if raw.empty:
                continue
            closes = raw["Close"] if hasattr(raw.columns, "levels") else raw
            for sym in batch:
                try:
                    if sym not in closes.columns:
                        continue
                    s_close = closes[sym].dropna()
                    if len(s_close) < 21:
                        continue
                    cmp = float(s_close.iloc[-1])
                    prev = float(s_close.iloc[-2])
                    if cmp < 20:
                        continue
                    intraday_chg = (cmp - prev) / prev * 100
                    if intraday_chg > 3.0:
                        continue
                    rsi = float(_calc_rsi(s_close).iloc[-1])
                    if not (42 <= rsi <= 62):
                        continue
                    ema10 = float(s_close.ewm(span=10).mean().iloc[-1])
                    ema20 = float(s_close.ewm(span=20).mean().iloc[-1])
                    ema_dist = (cmp - ema20) / ema20 * 100
                    if ema_dist > 8:
                        continue
                    support = max(ema10, ema20) if cmp > max(ema10, ema20) else min(ema10, ema20)
                    entry_low = round(min(cmp, support) * 0.99, 2)
                    entry_high = round(cmp * 1.005, 2)
                    sl = round(support * 0.95, 2)
                    target = round(cmp * 1.10, 2)
                    score = (10 - abs(rsi - 52)) + (5 - abs(ema_dist))
                    results.append({
                        "symbol": sym,
                        "name": name_map.get(sym, sym),
                        "sector": sector_map.get(sym, ""),
                        "cmp": round(cmp, 2),
                        "chg": round(intraday_chg, 2),
                        "rsi": round(rsi, 1),
                        "ema20": round(ema20, 2),
                        "ema_dist_pct": round(ema_dist, 1),
                        "entry_low": entry_low,
                        "entry_high": entry_high,
                        "target": target,
                        "sl": sl,
                        "signal": "BUY",
                        "confidence": min(100, int(50 + score * 3)),
                        "score": round(score, 2),
                    })
                except Exception:
                    pass
        except Exception:
            pass
        time.sleep(0.3)

    results.sort(key=lambda x: -x["score"])
    return results[:max_picks]


def run_us_morning_scan(max_picks: int = 20) -> None:
    """Runs the US swing scan and saves candidates to Supabase us_daily_signals."""
    import logging
    from datetime import date
    from core.supabase_client import upsert_us_signals

    logger = logging.getLogger(__name__)
    logger.info("us_morning_scan: starting full US TA scan")

    picks = run_us_swing_scan(max_picks=max_picks)
    if not picks:
        logger.warning("us_morning_scan: no candidates found")
        return

    today = date.today().isoformat()
    rows = [
        {
            "scanned_at": today,
            "symbol": p["symbol"],
            "name": p["name"],
            "sector": p["sector"],
            "cmp": p["cmp"],
            "chg": p["chg"],
            "rsi": p["rsi"],
            "ema20": p["ema20"],
            "ema_dist_pct": p["ema_dist_pct"],
            "entry_low": p["entry_low"],
            "entry_high": p["entry_high"],
            "target": p["target"],
            "sl": p["sl"],
            "signal": p["signal"],
            "confidence": p["confidence"],
            "score": p["score"],
        }
        for p in picks
    ]

    upsert_us_signals(rows)
    logger.info("us_morning_scan: saved %d candidates to Supabase", len(rows))
```

- [ ] **Step 2: Verify the module imports cleanly**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate && python3 -c "
from core.us_scan import run_us_swing_scan
print('import OK')
"
```

Expected: `import OK` (this only checks the import succeeds — `upsert_us_signals` doesn't exist
yet, but it's imported lazily inside `run_us_morning_scan`, so the module-level import above
won't fail on that; it'll be added in Task 3).

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/us_scan.py
git commit -m "feat: add us_scan.py — US swing-scan mirroring swing_scan.py

Same RSI 42-62 / near-EMA20 / day-change setup logic, applied to
us_universe.json. Price floor adjusted from India's >Rs100 to >\$20
(curated large-cap universe, not a literal currency copy)."
```

---

## Task 3: Supabase table + `upsert_us_signals`

**Files:**
- Modify: `apps/api/core/supabase_client.py`

- [ ] **Step 1: Run this SQL once in Supabase (manual step, not part of the codebase)**

```sql
CREATE TABLE IF NOT EXISTS public.us_daily_signals (
  id           uuid primary key default gen_random_uuid(),
  scanned_at   date not null,
  symbol       text not null,
  name         text not null,
  sector       text not null,
  cmp          numeric not null,
  chg          numeric,
  rsi          numeric,
  ema20        numeric,
  ema_dist_pct numeric,
  entry_low    numeric,
  entry_high   numeric,
  target       numeric,
  sl           numeric,
  signal       text not null,
  confidence   integer,
  score        numeric,
  created_at   timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.us_daily_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_us_daily_signals" ON public.us_daily_signals FOR SELECT USING (true);
CREATE POLICY "service_write_us_daily_signals" ON public.us_daily_signals FOR ALL USING (true);
```

- [ ] **Step 2: Add `upsert_us_signals` to `supabase_client.py`**

In `apps/api/core/supabase_client.py`, right after the existing `upsert_signals` function
(ends at line 36 with `).raise_for_status()`), add:

```python
def upsert_us_signals(rows: list[dict]) -> None:
    if not rows:
        return
    with httpx.Client() as client:
        client.post(
            _rest("us_daily_signals"),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=rows,
        ).raise_for_status()
```

- [ ] **Step 3: Verify it imports cleanly**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate && python3 -c "
from core.supabase_client import upsert_us_signals
print('import OK')
"
```

Expected: `import OK`

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/supabase_client.py
git commit -m "feat: add upsert_us_signals for the new us_daily_signals table

Mirrors upsert_signals exactly — same merge-duplicates upsert
pattern, separate table (no WATCHING/TRIGGERED status column, that
lifecycle is out of scope for this feature)."
```

---

## Task 4: `signals.py` — fix `.NS` forcing, add `/signals/us`

**Files:**
- Modify: `apps/api/routers/signals.py`

- [ ] **Step 1: Rewrite the file**

Replace the full contents of `apps/api/routers/signals.py` with:

```python
import json
from pathlib import Path

from fastapi import APIRouter, Query, HTTPException
from core.swing_scan import run_swing_scan
from core.technical import get_technical_analysis
from core import cache

router = APIRouter(prefix="/signals", tags=["signals"])

_SCAN_TTL = 3600    # 1 hour — scan is heavy
_TICKER_TTL = 900   # 15 min per ticker

_US_UNIVERSE_PATH = Path(__file__).parent.parent / "config" / "us_universe.json"
_US_UNIVERSE_SYMBOLS = {
    s["symbol"]
    for items in json.loads(_US_UNIVERSE_PATH.read_text())["sectors"].values()
    for s in items
}


@router.get("")
def list_signals(limit: int = Query(default=10, ge=1, le=50)):
    cached = cache.get("swing_scan", _SCAN_TTL)
    if cached is not None:
        return {"signals": cached[:limit], "count": len(cached[:limit]), "cached": True}

    picks = run_swing_scan(max_picks=20)
    cache.set("swing_scan", picks)
    return {"signals": picks[:limit], "count": len(picks[:limit]), "cached": False}


@router.get("/us")  # MUST be declared before /{ticker} — Starlette matches routes in
                     # declaration order, so this static path needs to come first or
                     # it would be swallowed by the dynamic {ticker} route below
                     # (which would otherwise treat "us" as a literal ticker symbol).
def list_us_signals(limit: int = Query(default=10, ge=1, le=50)):
    cached = cache.get("us_swing_scan", _SCAN_TTL)
    if cached is not None:
        return {"signals": cached[:limit], "count": len(cached[:limit]), "cached": True}

    from core.us_scan import run_us_swing_scan
    picks = run_us_swing_scan(max_picks=20)
    cache.set("us_swing_scan", picks)
    return {"signals": picks[:limit], "count": len(picks[:limit]), "cached": False}


@router.get("/{ticker}")
def get_signal(ticker: str):
    sym = ticker.upper()
    if sym not in _US_UNIVERSE_SYMBOLS and not sym.endswith(".NS"):
        sym += ".NS"

    key = f"ticker_{sym}"
    cached = cache.get(key, _TICKER_TTL)
    if cached is not None:
        return {**cached, "cached": True}

    data = get_technical_analysis(sym)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data for {sym}")

    cache.set(key, data)
    return {**data, "cached": False}
```

- [ ] **Step 2: Start the local FastAPI server and verify both the fix and the new endpoint**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate && uvicorn main:app --reload --port 8000 &
sleep 3
curl -s "http://localhost:8000/api/signals/AAPL" | python3 -m json.tool | head -20
curl -s "http://localhost:8000/api/signals/RELIANCE" | python3 -m json.tool | head -10
curl -s "http://localhost:8000/api/signals/us?limit=5" | python3 -m json.tool
```

Expected:
- `/api/signals/AAPL` returns real technicals (price, rsi, ema20, bias, etc.) — this is the bug
  fix, previously this would have 404'd trying to fetch `AAPL.NS` from Yahoo.
- `/api/signals/RELIANCE` still works and resolves to `RELIANCE.NS` (unchanged India behavior —
  confirms the fix didn't break existing callers).
- `/api/signals/us?limit=5` returns `{"signals": [...], "count": <=5, "cached": false}` — may
  return an empty `signals` array if nothing currently matches the RSI 42-62 setup criteria
  (that's a valid scan outcome, not a bug) — check the response completes without an error.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/routers/signals.py
git commit -m "fix: get_signal no longer forces .NS on US tickers; add GET /signals/us

Root cause of US tickers 404ing on the real backend: every symbol got
.NS appended unconditionally. Now checks membership in
us_universe.json first. Also adds the US swing-scan list endpoint,
mirroring the existing India one."
```

---

## Task 5: Scheduler — US morning scan job

**Files:**
- Modify: `apps/api/core/scheduler.py`

- [ ] **Step 1: Add the job function**

In `apps/api/core/scheduler.py`, right after `_morning_scan_job` (ends at line 48 with the
`except` block), add:

```python
def _us_morning_scan_job():
    logger.info("scheduler: starting US morning scan")
    try:
        from core.us_scan import run_us_morning_scan
        run_us_morning_scan()
    except Exception as e:
        logger.error("scheduler: US morning scan failed: %s", e)
```

(No `_is_market_day()` gate — that function checks NSE holidays specifically, not US ones; a
US-holiday calendar is out of scope for this pass, per the spec.)

- [ ] **Step 2: Register the job**

In `start_scheduler()`, right after the existing `morning_scan` job registration (the block
ending at line 100 with `)`), add:

```python
    # 7:30 PM IST — US morning scan (after US market open in both EST/EDT rows,
    # avoiding DST-transition edge cases). Mon-Fri.
    scheduler.add_job(
        _us_morning_scan_job,
        CronTrigger(day_of_week="mon-fri", hour=19, minute=30, timezone=IST),
        id="us_morning_scan",
        name="US Morning TA Scan",
        replace_existing=True,
    )
```

- [ ] **Step 3: Verify the scheduler module still imports cleanly**

```bash
cd "/Users/gsaiganesh/signal-app/apps/api" && source .venv/bin/activate && python3 -c "
from core.scheduler import start_scheduler
print('import OK')
"
```

Expected: `import OK`

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/api/core/scheduler.py
git commit -m "feat: schedule daily US morning scan at 7:30 PM IST

Mirrors the existing India morning_scan job. Runs Mon-Fri with no
US-holiday gate for this first pass (worst case: a harmless re-scan
on a US market holiday)."
```

---

## Task 6: Frontend — `/dashboard/us-signals` page

**Files:**
- Create: `apps/web/app/dashboard/us-signals/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
'use client';
import { useEffect, useState } from 'react';

interface UsSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number; ema_dist_pct: number;
  entry_low: number; entry_high: number; target: number; sl: number;
  signal: string; confidence: number; score: number;
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 16,
  padding: '18px 20px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'var(--card-shadow)',
};

export default function UsSignalsPage() {
  const [signals, setSignals] = useState<UsSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch('/api/ml/signals/us?limit=20')
      .then(r => r.json())
      .then((d: { signals?: UsSignal[] }) => setSignals(d.signals ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>🇺🇸 US Signals</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>
          Technical scan across ~100 US large-cap stocks · RSI 42-62 near-EMA setups
        </div>
      </div>

      <div style={card}>
        {loading && <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '24px 0' }}>⏳ loading…</div>}
        {!loading && error && (
          <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '24px 0' }}>
            Couldn&apos;t load US signals right now.
          </div>
        )}
        {!loading && !error && signals.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '24px 0' }}>
            No US stocks currently match the scan setup — check back later.
          </div>
        )}
        {!loading && !error && signals.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Symbol', 'Sector', 'Price', 'Chg %', 'RSI', 'vs EMA20', 'Confidence'].map(h => (
                    <th key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--bdr)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.map(s => (
                  <tr key={s.symbol} style={{ borderBottom: '1px solid rgba(28,46,74,0.4)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700 }}>{s.symbol}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)' }}>{s.name}</div>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--dim)' }}>{s.sector}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>${s.cmp.toFixed(2)}</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: s.chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {s.chg >= 0 ? '+' : ''}{s.chg.toFixed(2)}%
                    </td>
                    <td style={{ padding: '10px' }}>{s.rsi.toFixed(1)}</td>
                    <td style={{ padding: '10px', color: s.ema_dist_pct >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {s.ema_dist_pct >= 0 ? '+' : ''}{s.ema_dist_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{s.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 16 }}>
        ⚠️ Not SEC registered · Not investment advice · Algorithmic scan output only · DYOR
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/dashboard/us-signals/page.tsx
git commit -m "feat: add /dashboard/us-signals page

Deliberately simple table view for v1 — does not port India's
signals page's AI narrative/peer-compare/watchlist-add features,
those are separate future enhancements, not required for ML parity."
```

---

## Task 7: Wire the new page into navigation

**Files:**
- Modify: `apps/web/components/DashboardNavContext.tsx:9-15`
- Modify: `apps/web/components/MobileBottomNav.tsx:20-33`

- [ ] **Step 1: Add to the desktop nav's Home tab**

In `apps/web/components/DashboardNavContext.tsx`, find:

```typescript
  {
    key: 'home', label: 'Home',
    links: [
      { href: '/dashboard',             label: 'Dashboard'   },
      { href: '/dashboard/signals',     label: 'Signals'     },
      { href: '/dashboard/portfolio',   label: 'Portfolio'   },
      { href: '/dashboard/watchlist',   label: 'Watchlist'   },
      { href: '/dashboard/equity-comp', label: 'ESPP & RSU'  },
      { href: '/dashboard/etf-mf',      label: 'ETF & MF'    },
    ],
  },
```

Replace with:

```typescript
  {
    key: 'home', label: 'Home',
    links: [
      { href: '/dashboard',             label: 'Dashboard'   },
      { href: '/dashboard/signals',     label: 'Signals'     },
      { href: '/dashboard/us-signals',  label: 'US Signals'  },
      { href: '/dashboard/portfolio',   label: 'Portfolio'   },
      { href: '/dashboard/watchlist',   label: 'Watchlist'   },
      { href: '/dashboard/equity-comp', label: 'ESPP & RSU'  },
      { href: '/dashboard/etf-mf',      label: 'ETF & MF'    },
    ],
  },
```

- [ ] **Step 2: Add to the mobile More drawer's Markets section**

In `apps/web/components/MobileBottomNav.tsx`, find:

```typescript
      { href: '/dashboard/watchlist',    icon: '👁', label: 'Watchlist'      },
      { href: '/stocks/compare',        icon: '⚖️', label: 'Compare'        },
```

Replace with:

```typescript
      { href: '/dashboard/watchlist',    icon: '👁', label: 'Watchlist'      },
      { href: '/dashboard/us-signals',   icon: '🇺🇸', label: 'US Signals'    },
      { href: '/stocks/compare',        icon: '⚖️', label: 'Compare'        },
```

- [ ] **Step 3: Typecheck and build**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npx tsc --noEmit && npx next build 2>&1 | tail -20
```

Expected: no errors, and `npx next build`'s route list includes `/dashboard/us-signals`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/components/DashboardNavContext.tsx apps/web/components/MobileBottomNav.tsx
git commit -m "feat: add US Signals to desktop Home tab and mobile Markets drawer

Wired into the real, live nav sources (verified this session those
are DashboardNavContext.tsx / MobileBottomNav.tsx, not the dead
DashboardSidebar.tsx removed earlier) — new pages must be reachable,
not just built."
```

---

## Self-Review Notes

**Spec coverage:**
- `us_universe.json` (~100 stocks, sector-organized, fills Communication Services gap) → Task 1.
- `us_scan.py` mirroring `swing_scan.py`, adjusted price floor → Task 2.
- Supabase `us_daily_signals` table + `upsert_us_signals` → Task 3.
- `get_signal` `.NS`-forcing fix + `GET /signals/us` (declared before `/{ticker}` to avoid route
  collision — the ambiguity caught in the spec's own self-review) → Task 4.
- Scheduled US morning scan job at 7:30 PM IST → Task 5.
- `/dashboard/us-signals` simple table page → Task 6.
- Nav wiring into the real (not dead) nav sources → Task 7.
- Out-of-scope items (intraday alert lifecycle, US holiday calendar, India-page feature parity,
  actual VPS deployment) — correctly absent from all tasks.

**Type consistency check:** `UsSignal` interface fields in Task 6's frontend (`symbol, name,
sector, cmp, chg, rsi, ema20, ema_dist_pct, entry_low, entry_high, target, sl, signal,
confidence, score`) match exactly the dict keys `run_us_swing_scan` produces in Task 2 and the
`us_daily_signals` table columns in Task 3 — same names throughout, no drift.

**Placeholder scan:** none found — every task has complete, runnable code and exact verification
commands.

**Dependency note:** Tasks 1→2→3→4→5 must run in that order (each imports/references what the
prior task created). Task 6 depends only on Task 4 (the `/signals/us` endpoint existing) for its
manual verification step to show real data, but can be written/typechecked independently. Task 7
depends on Task 6 (the page must exist before linking to it).
