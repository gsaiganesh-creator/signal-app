# US Stock ML Parity — Design

## Context

The India stock "ML" system is not actually a trained model — it's rule-based technical
analysis (EMA5/20/50/200, SMA200, RSI(14), MACD, Bollinger Bands, ATR-based entry/target/stop
zones, and a multi-signal bias vote) computed by `apps/api/core/technical.py`'s
`get_technical_analysis()`, applied against a fixed 303-stock monitored universe
(`apps/api/config/universe.json`, 25 sectors) and exposed via the Python FastAPI backend
(`apps/api`), which the Next.js frontend reaches through an unconditional rewrite:
`/api/ml/:path*` → `${ML_API_URL}/api/:path*` (see `next.config.ts`).

US stocks currently have no equivalent. What exists today:

- `/api/us/analysis` (Next.js, `apps/web/app/api/us/analysis/route.ts`) — a much simpler 3-rule
  signal (RSI<38→BUY, RSI>70→SELL, else MACD-bullish→BUY, else HOLD), computed only for symbols
  the logged-in user's US Portfolio holdings or RSU/ESPP grants contain (reactive, capped at 20
  symbols/request, no fixed universe).
- No US equivalent of `universe.json` — no monitored watchlist independent of user holdings.
- `routers/signals.py`'s `get_signal(ticker)` hardcodes a `.NS` suffix on every ticker, so even
  though the underlying `get_technical_analysis()` function is already symbol-agnostic (works
  identically on `AAPL` as on `RELIANCE.NS`), the real backend cannot currently serve a US ticker
  at all.

This spec brings US stocks to parity: same signal-computation engine, a defined ~100-stock
monitored universe, and a scan mechanism mirroring India's — deliberately excluding the live
intraday WATCHING→TRIGGERED→push-alert lifecycle (`daily_signals` table's status machine,
`price_checker.py`/`notifier.py`), since that's a distinct feature (real-time price alerts) built
around NSE market hours, not part of what was asked here (the monitored-universe + signal
computation itself). That lifecycle can be a separate future spec if wanted.

## Scope

1. `apps/api/config/us_universe.json` — new file, ~100 S&P 100-style US large caps.
2. `apps/api/core/us_scan.py` — new module, swing-scan logic mirroring `swing_scan.py`.
3. `routers/signals.py` — `get_signal(ticker)` stops force-appending `.NS`; new `GET
   /signals-us` list endpoint.
4. `apps/api/core/scheduler.py` — new scheduled job for the US morning scan.
5. `apps/web/app/dashboard/us-signals/page.tsx` — new, deliberately simple page (table view of
   scan output), not a port of the full-featured 1699-line India `/dashboard/signals` page.

## 1. `us_universe.json`

Same shape as `universe.json`: `{ "sectors": { "SectorName": [{"symbol": "AAPL", "name": "Apple
Inc"}, ...] } }`. Built from the `US_SECTORS` dict already in
`apps/web/app/api/us/analysis/route.ts` (already sector-categorized, ~80 unique symbols after
deduping the `BRKB`/`BRK-B`/`BRK` alias down to the correct Yahoo ticker `BRK-B`), expanded with
well-known, verifiably real S&P 100 constituents to reach ~100 and fill genuinely missing
sectors — notably **Communication Services** (absent entirely from the current dict: add NFLX,
DIS, CMCSA, VZ, T, TMUS), plus rounding out thin sectors (Utilities, Real Estate, Materials).
No speculative/uncertain tickers — every addition is a large, stable, unambiguous public company.

## 2. `us_scan.py`

```python
_UNIVERSE = Path(__file__).parent.parent / "config" / "us_universe.json"

def run_us_swing_scan(max_picks: int = 10) -> list[dict]:
    """
    Same setup as run_swing_scan: RSI 42–62, price near EMA20, day change <3%.
    Price floor is $20 (not a literal ₹100→$100 copy — this is a curated
    large-cap universe, unlikely to contain penny stocks; $20 just filters
    any unusually low-priced name without being an arbitrary high bar).
    """
    # ... identical structure to run_swing_scan: load us_universe.json,
    # yf.download() in batches of 40, same RSI/EMA/score logic, same
    # result shape (symbol, name, sector, cmp, chg, rsi, ema20, ema_dist_pct,
    # entry_low, entry_high, target, sl, signal, confidence, score).

def run_us_morning_scan(max_picks: int = 20) -> None:
    """Runs run_us_swing_scan and upserts to Supabase us_daily_signals."""
    # Mirrors run_morning_scan, but writes to a NEW table us_daily_signals
    # (not daily_signals) — deliberately no status/WATCHING/TRIGGERED column,
    # since the intraday alert lifecycle is out of scope for this spec.
    # Columns: symbol, name, sector, cmp, chg, rsi, ema20, ema_dist_pct,
    # entry_low, entry_high, target, sl, signal, confidence, score, scanned_at (date).
    # Upsert on (symbol, scanned_at), same merge-duplicates pattern as upsert_signals().
```

### Supabase migration (run once)

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

## 3. `routers/signals.py` changes

```python
import json
from pathlib import Path

_US_UNIVERSE_SYMBOLS = {
    s["symbol"]
    for items in json.loads((Path(__file__).parent.parent / "config" / "us_universe.json").read_text())["sectors"].values()
    for s in items
}

@router.get("/us")  # must be declared BEFORE /{ticker} below — Starlette matches
                     # routes in declaration order, so a static "/us" path needs to
                     # come first or it would be swallowed by the dynamic {ticker}
                     # route (which would otherwise treat "us" as a literal ticker).
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
    # ... rest unchanged (cache lookup, get_technical_analysis(sym), 404 if None)
```

`get_signal`'s new membership check means a bare `AAPL` (in `us_universe.json`) is treated as a
US ticker as-is, while any other bare symbol not in that set keeps today's NSE-default behavior
(`.NS` appended) — no behavior change for existing India callers. The new list endpoint is
reachable at `GET /signals/us` (i.e. `/api/ml/signals/us` from the Next.js frontend, through the
existing `/api/ml/:path*` rewrite).

## 4. Scheduler

```python
# 7:30 PM IST — after US market open in both EST (7:00 PM IST) and EDT (6:00 PM IST) rows,
# avoiding DST-transition edge cases for v1. Runs daily (US-holiday-awareness deferred —
# worst case is a scan running on a US market holiday, which just reproduces the prior
# day's numbers harmlessly, same as India's Mon-Fri-only job would on an unlisted holiday).
scheduler.add_job(
    _us_morning_scan_job,
    CronTrigger(day_of_week="mon-fri", hour=19, minute=30, timezone=IST),
    id="us_morning_scan",
    name="US Morning TA Scan",
    replace_existing=True,
)
```

`_us_morning_scan_job()` mirrors `_morning_scan_job()` (try/except around
`run_us_morning_scan()`, logs on failure) — no `_is_market_day()` gate for v1 (that function is
NSE-holiday-specific; a US-holiday calendar is a follow-up, not blocking this spec).

## 5. Frontend — `/dashboard/us-signals`

New page, intentionally simple for v1: fetches `GET /api/ml/signals/us?limit=20` (same rewrite
mechanism already proxying `/api/ml/*` to the Python backend), renders a sortable table (Symbol,
Sector, Price, Change%, RSI, Signal, Confidence) — same visual language as the existing
dashboard pages (`card` style, `--surf2` rows), but does **not** port India's page's AI
narrative generation, peer-compare, or watchlist-add-from-scan features. Those are additive
enhancements accumulated on the India page over time, not required for ML parity itself, and
can be layered on in a later pass once this ships.

Nav: add to `DashboardNavContext.tsx`'s `home` tab (next to the existing `Signals` entry) as
`{ href: '/dashboard/us-signals', label: 'US Signals' }`, and to `MobileBottomNav.tsx`'s
Markets section — matching the hierarchy-consistency lesson from earlier this session (new
pages must be wired into the real, live nav source, not left unreachable).

## Error Handling

- `run_us_swing_scan`: same try/except-per-batch pattern as `run_swing_scan` — a failed
  `yf.download()` batch is skipped, doesn't crash the whole scan.
- `get_signal`: unchanged 404 behavior when `get_technical_analysis()` returns `None` (e.g. a
  delisted or invalid ticker).
- Frontend `/dashboard/us-signals`: same graceful-empty-state pattern as other dashboard pages —
  loading spinner, then "no data" message if the fetch fails or returns empty, never a crash.

## Testing

No automated test infra exists in either the Python or Next.js side of this repo (consistent
with the rest of the project). Verify by:

- Running `run_us_swing_scan()` locally (Python REPL or a quick script) against the real
  universe, confirming it returns plausible picks with the expected fields populated.
- Curling the new `/signals/us` endpoint directly against the local FastAPI dev server, checking
  the response shape matches `list_signals`'s shape (minus India-specific fields).
- Curling `/signals/AAPL` directly, confirming it no longer 404s (real bug today, since the
  route currently only recognizes `.NS`-appended tickers) and returns real technicals.
- Loading `/dashboard/us-signals` locally, confirming the table renders with live data.

## Out of scope (future)

- Live intraday WATCHING→TRIGGERED→push-alert lifecycle for US signals (the `daily_signals`
  status machine, `price_checker.py`/`notifier.py` equivalents) — a distinct feature.
- US market holiday calendar (`_is_market_day()` equivalent) — v1 just runs on all weekdays.
- Porting India signals page's AI narrative/peer-compare/watchlist-add features to US signals.
- Actually deploying this to the VPS — blocked on the separate, already-tracked `ML_API_URL`
  build-time env var issue. This spec's code should be ready and correct for whenever that's
  resolved, but cannot go live before then regardless.
