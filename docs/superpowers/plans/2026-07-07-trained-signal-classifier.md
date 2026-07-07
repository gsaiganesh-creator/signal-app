# Trained Signal Classifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rule-based bullish/bearish vote-count in `apps/api/core/technical.py`'s `get_technical_analysis()` with a real trained classifier, validated in shadow mode before it ever affects what a user sees.

**Architecture:** A one-time historical backtest-label generator bootstraps training data (since `scan_log` has no matured outcomes yet). A `HistGradientBoostingClassifier` trains on that data with a built-in sanity gate against degenerate output. The trained model is loaded into `get_technical_analysis()` and runs alongside the existing rules, purely additive (`ml_bias`/`ml_confidence` keys). A new daily Python job logs both the rule-based and model predictions to a new `ml_shadow_log` table for every stock in the universe — independent of frontend traffic — for a 4-week validation window before any cutover decision.

**Tech Stack:** Python (`apps/api`), `scikit-learn`, `pandas`, `yfinance`, `ta` (already in use), Supabase (`ml_shadow_log` table), APScheduler (already in use via `core/scheduler.py`).

**Reference:** `docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md`

---

### Task 1: Add ML dependencies

**Files:**
- Modify: `apps/api/requirements.txt`

- [ ] **Step 1: Add scikit-learn, joblib, and pyarrow**

Append to `apps/api/requirements.txt`:

```
scikit-learn>=1.4.0
joblib>=1.3.0
pyarrow>=15.0.0
```

(`pyarrow` is required by `pandas.to_parquet`/`read_parquet`, used in Task 2 — not currently a dependency anywhere in this codebase.)

- [ ] **Step 2: Install locally and verify**

Run: `cd apps/api && pip install -r requirements.txt`
Expected: installs without errors; `python3 -c "import sklearn, joblib, pyarrow; print('ok')"` prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/requirements.txt
git commit -m "Add scikit-learn/joblib/pyarrow for the trained signal classifier"
```

---

### Task 2: Historical backtest label generator

**Files:**
- Create: `apps/api/ml/__init__.py`
- Create: `apps/api/ml/backtest_labels.py`

- [ ] **Step 1: Create the package marker and a zero-dependency feature-list module**

```bash
touch apps/api/ml/__init__.py
```

`FEATURE_COLUMNS` needs to be importable from `core/technical.py` (Task 4) without pulling in
`core.paper_trading_scan` transitively — `paper_trading_scan.py` already imports
`core.technical` today, so if `technical.py` imported it back (even indirectly, through a module
that imports `backtest_labels.py`), that's a circular import
(`technical.py → backtest_labels.py → paper_trading_scan.py → technical.py`) that will break at
process startup. Keeping the constant in its own leaf module avoids this entirely.

Create `apps/api/ml/features.py`:

```python
"""Feature column list shared between backtest_labels.py, train.py, and
core/technical.py. Kept dependency-free (no imports beyond stdlib/nothing)
so core/technical.py can import it without any risk of a circular import —
core/paper_trading_scan.py already imports core.technical, so this module
must never import core.paper_trading_scan or anything that does."""

FEATURE_COLUMNS = [
    "rsi14", "ema5_dist", "ema20_dist", "ema50_dist", "ema200_dist",
    "macd_hist", "bb_pct", "vol_ratio", "pct_from_52h",
]
```

- [ ] **Step 2: Write `apps/api/ml/backtest_labels.py`**

```python
"""Historical backtest label generator — bootstraps training data for the
trained signal classifier (docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md)
since scan_log has no matured outcomes yet (oldest row is 11 days old as of
this writing; 30-day forward returns can't exist yet). Walks 3 years of
yfinance history per symbol, computes the same feature set
core/technical.py's get_technical_analysis() computes, and labels each row
with the actual known forward 30-trading-day return."""
import logging
from pathlib import Path

import pandas as pd
import ta
import yfinance as yf

from core.paper_trading_scan import NSE_UNIVERSE
from ml.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

OUTPUT_PATH = Path(__file__).parent / "training_data.parquet"
FORWARD_DAYS = 30
WARMUP_DAYS = 252  # matches the 52-week rolling window, the longest lookback used


def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    close = df["Close"]
    high = df["High"]
    volume = df["Volume"]

    ema5 = ta.trend.EMAIndicator(close, window=5).ema_indicator()
    ema20 = ta.trend.EMAIndicator(close, window=20).ema_indicator()
    ema50 = ta.trend.EMAIndicator(close, window=50).ema_indicator()
    ema200 = ta.trend.EMAIndicator(close, window=200).ema_indicator()
    rsi = ta.momentum.RSIIndicator(close, window=14).rsi()
    macd_obj = ta.trend.MACD(close)
    macd_hist = macd_obj.macd() - macd_obj.macd_signal()
    bb = ta.volatility.BollingerBands(close, window=20)
    bb_upper = bb.bollinger_hband()
    bb_lower = bb.bollinger_lband()
    bb_range = bb_upper - bb_lower
    bb_pct = ((close - bb_lower) / bb_range).where(bb_range != 0, 0.5)
    vol_ratio = volume / volume.rolling(20).mean()
    w52_high = high.rolling(252).max()
    pct_from_52h = (close - w52_high) / w52_high * 100

    fwd_return_30d = close.shift(-FORWARD_DAYS) / close - 1

    feat = pd.DataFrame({
        "rsi14": rsi,
        "ema5_dist": close / ema5 - 1,
        "ema20_dist": close / ema20 - 1,
        "ema50_dist": close / ema50 - 1,
        "ema200_dist": close / ema200 - 1,
        "macd_hist": macd_hist,
        "bb_pct": bb_pct,
        "vol_ratio": vol_ratio,
        "pct_from_52h": pct_from_52h,
        "fwd_return_30d": fwd_return_30d,
    })
    feat["date"] = df.index.tz_localize(None)
    return feat


def generate() -> pd.DataFrame:
    rows = []
    for sym in NSE_UNIVERSE:
        ysym = f"{sym}.NS"
        try:
            df = yf.Ticker(ysym).history(period="3y", auto_adjust=True)
        except Exception as e:
            logger.error("backtest_labels: fetch failed for %s: %s", ysym, e)
            continue
        if df.empty or len(df) < WARMUP_DAYS + FORWARD_DAYS:
            logger.warning("backtest_labels: not enough history for %s (%d rows)", ysym, len(df))
            continue

        feat = _compute_features(df)
        feat["symbol"] = sym
        # Drop warm-up rows (indicators undefined) and the tail rows with no
        # known future return yet.
        feat = feat.iloc[WARMUP_DAYS:-FORWARD_DAYS]
        feat = feat.dropna(subset=FEATURE_COLUMNS + ["fwd_return_30d"])
        rows.append(feat)
        logger.info("backtest_labels: %s -> %d usable rows", sym, len(feat))

    if not rows:
        raise RuntimeError("backtest_labels: no usable data generated for any symbol")

    full = pd.concat(rows, ignore_index=True)
    full["label"] = (full["fwd_return_30d"] > 0).astype(int)
    full.to_parquet(OUTPUT_PATH, index=False)
    logger.info("backtest_labels: wrote %d rows to %s", len(full), OUTPUT_PATH)
    return full


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate()
```

- [ ] **Step 3: Run it and verify output**

Run: `cd apps/api && python3 -m ml.backtest_labels`
Expected: log lines for all 30 symbols in `NSE_UNIVERSE` showing usable row counts (a handful of symbols may warn "not enough history" if recently listed — that's fine, they're skipped), ending with `backtest_labels: wrote N rows to .../training_data.parquet` where N is at least 10,000 (30 stocks × ~750 trading days per 3 years, minus warm-up/tail trimming and any skipped symbols).

- [ ] **Step 4: Spot-check one row against the live API**

Run:
```bash
python3 -c "
import pandas as pd
df = pd.read_parquet('apps/api/ml/training_data.parquet')
print(df[df['symbol']=='RELIANCE'].tail(1)[['date','rsi14','ema20_dist','label']])
"
```
Expected: prints one row with a plausible RSI (0-100 range) and `ema20_dist` (a small decimal like `0.02` for +2% above EMA20, not something wildly out of range like `50`). This is a sanity check that the feature math produces reasonable values, not a byte-for-byte match against the live API (the live API's window is "now," this row is historical).

- [ ] **Step 5: Check the label distribution isn't wildly skewed**

Run:
```bash
python3 -c "
import pandas as pd
df = pd.read_parquet('apps/api/ml/training_data.parquet')
print(df['label'].value_counts(normalize=True))
"
```
Expected: both classes present in roughly the same order of magnitude (e.g. 55/45 or 60/40 is fine and expected for a market that trended up over the 3-year window — a split like 95/5 would mean the label is nearly constant and Task 3's training step won't have much to learn from; if that happens, stop and reconsider before training rather than proceeding with data that can't teach the model anything).

- [ ] **Step 6: Commit**

```bash
git add apps/api/ml/__init__.py apps/api/ml/features.py apps/api/ml/backtest_labels.py .gitignore
git commit -m "Add historical backtest label generator for the signal classifier"
```

(Do **not** commit `training_data.parquet` itself — it's a large generated artifact, regenerable by rerunning the script. The repo root `.gitignore` has no parquet rule yet — add one in the same commit:

```
# ML training artifacts (regenerable, not source)
apps/api/ml/training_data.parquet
```

append this to `.gitignore`.)

---

### Task 3: Train the classifier

**Files:**
- Create: `apps/api/ml/train.py`

- [ ] **Step 1: Write `apps/api/ml/train.py`**

```python
"""Trains the signal classifier
(docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md) on
backtest_labels.py's output. Run manually: python3 -m ml.train"""
import logging
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score

from ml.backtest_labels import OUTPUT_PATH
from ml.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "model.joblib"
TRAIN_CUTOFF = "2026-01-01"  # train on data before this date, validate after
SANE_BAND = (0.30, 0.70)  # predicted-positive rate must land here to save the model


def train() -> None:
    df = pd.read_parquet(OUTPUT_PATH)
    df["date"] = pd.to_datetime(df["date"])

    train_df = df[df["date"] < TRAIN_CUTOFF]
    val_df = df[df["date"] >= TRAIN_CUTOFF]
    if train_df.empty or val_df.empty:
        raise RuntimeError(
            f"train/val split produced an empty set (train={len(train_df)}, "
            f"val={len(val_df)}) — check TRAIN_CUTOFF against the data's actual "
            f"date range: {df['date'].min()} to {df['date'].max()}"
        )

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["label"]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df["label"]

    model = HistGradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    val_proba = model.predict_proba(X_val)[:, 1]
    val_pred = (val_proba >= 0.5).astype(int)
    predicted_positive_rate = float(val_pred.mean())
    val_accuracy = accuracy_score(y_val, val_pred)

    logger.info(
        "train: %d train rows, %d val rows, val_accuracy=%.3f, predicted_positive_rate=%.3f",
        len(train_df), len(val_df), val_accuracy, predicted_positive_rate,
    )

    if not (SANE_BAND[0] <= predicted_positive_rate <= SANE_BAND[1]):
        logger.error(
            "train: REFUSING to save model — predicted_positive_rate=%.3f outside "
            "sane band %s (likely degenerate, always predicting one class — this "
            "check exists because of exactly this failure mode in an earlier "
            "project's stacked classifier)",
            predicted_positive_rate, SANE_BAND,
        )
        sys.exit(1)

    joblib.dump(model, MODEL_PATH)
    logger.info("train: saved model to %s", MODEL_PATH)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train()
```

- [ ] **Step 2: Run it and verify**

Run: `cd apps/api && python3 -m ml.train`
Expected: one log line with `val_accuracy` and `predicted_positive_rate` (the latter should be roughly between 0.3 and 0.7 — if the script exits with status 1 and the "REFUSING to save" error, stop here and report the printed metrics rather than proceeding; do not weaken `SANE_BAND` to force a pass), followed by `train: saved model to .../model.joblib`.

Run: `ls -la apps/api/ml/model.joblib`
Expected: file exists, non-zero size.

- [ ] **Step 3: Commit**

```bash
git add apps/api/ml/train.py apps/api/ml/model.joblib
git commit -m "Train signal classifier on backtest-generated historical labels"
```

(`model.joblib` **is** committed — small sklearn tabular model, no reason to keep it out of version control, matches the spec.)

---

### Task 4: Wire the model into `get_technical_analysis()`

**Files:**
- Modify: `apps/api/core/technical.py`

- [ ] **Step 1: Add model loading at module level**

At the top of `apps/api/core/technical.py`, after the existing imports (`import yfinance as yf`, `import pandas as pd`, `import ta`):

```python
import logging
from pathlib import Path

import joblib

from ml.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

_MODEL_PATH = Path(__file__).parent.parent / "ml" / "model.joblib"
try:
    _MODEL = joblib.load(_MODEL_PATH)
except FileNotFoundError:
    _MODEL = None
    logger.warning("technical: no trained model found at %s — ml_bias/ml_confidence will be null", _MODEL_PATH)
```

- [ ] **Step 2: Compute `bb_pct` and `pct_from_52h` as named variables**

`get_technical_analysis()` currently computes these two inline inside the final `return {...}` dict rather than as variables — needed as variables to feed the model. Find this block (around line 144-159 of the current file):

```python
            "bb_upper": round(float(bb_upper.iloc[-1]), 2),
            "bb_lower": round(float(bb_lower.iloc[-1]), 2),
            "bb_pct": round((curr_price - float(bb_lower.iloc[-1])) / (float(bb_upper.iloc[-1]) - float(bb_lower.iloc[-1])), 3)
                if float(bb_upper.iloc[-1]) != float(bb_lower.iloc[-1]) else 0.5,
```

and, immediately **before** the `return {` line, add:

```python
        bb_pct_val = (
            round((curr_price - float(bb_lower.iloc[-1])) / (float(bb_upper.iloc[-1]) - float(bb_lower.iloc[-1])), 3)
            if float(bb_upper.iloc[-1]) != float(bb_lower.iloc[-1]) else 0.5
        )
        pct_from_52h_val = round((curr_price - w52_high) / w52_high * 100, 2)
```

Then replace the two inline computations inside the `return {...}` dict with references to these variables:

```python
            "bb_pct": bb_pct_val,
```

and

```python
            "pct_from_52h": pct_from_52h_val,
```

(This is a pure refactor — same values, now computed once and reused instead of duplicated. `pct_from_52h_val` reuses `w52_high`, already computed earlier in the function.)

- [ ] **Step 3: Add the ML inference block and two new dict keys**

Immediately before the `return {` line (after the two variables added in Step 2):

```python
        ml_bias = None
        ml_confidence = None
        if _MODEL is not None and curr_ema200 is not None:
            macd_hist_val = float(macd_line.iloc[-1]) - float(macd_sig.iloc[-1])
            feature_values = {
                "rsi14": curr_rsi,
                "ema5_dist": curr_price / curr_ema5 - 1,
                "ema20_dist": curr_price / curr_ema20 - 1,
                "ema50_dist": curr_price / curr_ema50 - 1,
                "ema200_dist": curr_price / curr_ema200 - 1,
                "macd_hist": macd_hist_val,
                "bb_pct": bb_pct_val,
                "vol_ratio": vol_ratio,
                "pct_from_52h": pct_from_52h_val,
            }
            # Built from FEATURE_COLUMNS rather than a hardcoded list order —
            # if that constant's order ever changes, this stays correct
            # automatically instead of silently feeding the model misaligned
            # features (a real failure mode, not a hypothetical one).
            features = [[feature_values[c] for c in FEATURE_COLUMNS]]
            proba = float(_MODEL.predict_proba(features)[0][1])
            ml_confidence = round(proba, 3)
            ml_bias = "BULLISH" if proba >= 0.55 else ("BEARISH" if proba <= 0.45 else "NEUTRAL")
```

Then add two keys to the `return {...}` dict, after the existing `"signals": signals,` line:

```python
            "signals": signals,
            "ml_bias": ml_bias,
            "ml_confidence": ml_confidence,
```

- [ ] **Step 4: Verify locally**

Run:
```bash
cd apps/api && python3 -c "
from core.technical import get_technical_analysis
data = get_technical_analysis('RELIANCE.NS')
print({k: data[k] for k in ('bias', 'ml_bias', 'ml_confidence')})
"
```
Expected: prints a dict with `ml_bias` as one of `BULLISH`/`BEARISH`/`NEUTRAL` (not `None` — confirms the model loaded and ran) and `ml_confidence` as a float between 0 and 1.

- [ ] **Step 5: Commit**

```bash
git add apps/api/core/technical.py
git commit -m "Run trained classifier alongside rule-based bias in get_technical_analysis"
```

---

### Task 5: `ml_shadow_log` Supabase table

**Files:**
- Create: `supabase/ml_shadow_log.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ml_shadow_log — shadow-mode validation for the trained signal classifier
-- (docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md).
-- Separate from scan_log deliberately: scan_log is written by the frontend's
-- logScansAsync, driven by the swing-screener's pre-filtered candidates (a
-- different system, no `bias` field). This table gets one row per symbol per
-- day for the FULL NSE_UNIVERSE, written by a Python job independent of
-- frontend traffic.
CREATE TABLE IF NOT EXISTS public.ml_shadow_log (
  id            uuid primary key default gen_random_uuid(),
  scanned_at    date not null,
  symbol        text not null,
  bias          text not null,
  ml_bias       text not null,
  ml_confidence numeric not null,
  price_at      numeric not null,
  price_30d     numeric,
  return_30d    numeric,
  created_at    timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.ml_shadow_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_ml_shadow_log"  ON public.ml_shadow_log FOR SELECT USING (true);
CREATE POLICY "anon_insert_ml_shadow_log"  ON public.ml_shadow_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_ml_shadow_log"  ON public.ml_shadow_log FOR UPDATE USING (true);
```

- [ ] **Step 2: Run it in the Supabase SQL editor**

This is a manual step — paste `supabase/ml_shadow_log.sql`'s contents into the Supabase project's SQL editor and run it (matches how every other table in this project has been created, per `supabase/schema.sql`/`supabase/rls_apply.sql`).

- [ ] **Step 3: Verify the table exists**

Run (substituting your actual Supabase URL/service-role key from `apps/web/.env.local`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/ml_shadow_log?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `200` (an empty table still returns 200 with `[]`, not 404).

- [ ] **Step 4: Commit**

```bash
git add supabase/ml_shadow_log.sql
git commit -m "Add ml_shadow_log table for shadow-mode classifier validation"
```

---

### Task 6: Daily shadow-log job

**Files:**
- Create: `apps/api/core/shadow_log.py`
- Modify: `apps/api/core/scheduler.py`
- Modify: `apps/api/routers/jobs.py`

- [ ] **Step 1: Write `apps/api/core/shadow_log.py`**

```python
"""Daily job: runs the full NSE_UNIVERSE through get_technical_analysis()
and logs both the rule-based bias and the trained model's ml_bias/
ml_confidence to ml_shadow_log, for shadow-mode validation before cutover
(docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md)."""
import logging
from datetime import datetime, timezone

from core.paper_trading_scan import NSE_UNIVERSE
from core.supabase_rest import rest_post
from core.technical import get_technical_analysis

logger = logging.getLogger(__name__)


def run_shadow_log() -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    logged = 0
    skipped = 0
    for sym in NSE_UNIVERSE:
        data = get_technical_analysis(f"{sym}.NS")
        if data is None or data.get("ml_bias") is None:
            skipped += 1
            continue
        try:
            rest_post("ml_shadow_log", {
                "scanned_at": today,
                "symbol": sym,
                "bias": data["bias"],
                "ml_bias": data["ml_bias"],
                "ml_confidence": data["ml_confidence"],
                "price_at": data["price"],
            }, prefer="resolution=merge-duplicates")
            logged += 1
        except Exception as e:
            logger.error("shadow_log: insert failed for %s: %s", sym, e)

    summary = {"logged": logged, "skipped": skipped}
    logger.info("shadow_log: %s", summary)
    return summary
```

- [ ] **Step 2: Register the scheduled job**

In `apps/api/core/scheduler.py`, add the import near the other `core.*` imports:

```python
from core.shadow_log import run_shadow_log
```

Add the wrapper function near `_paper_trading_scan_job`:

```python
def _shadow_log_job():
    if not _is_market_day():
        return
    try:
        run_shadow_log()
    except Exception as e:
        logger.error("scheduler: shadow log failed: %s", e)
```

Add the job registration inside `start_scheduler()`, after the `paper_trading_scan` job block:

```python
    # 9:35 AM IST (skips NSE holidays), Mon–Fri — trained classifier shadow-mode logging
    scheduler.add_job(
        _shadow_log_job,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=35, timezone=IST),
        id="ml_shadow_log",
        name="ML Shadow Log",
        replace_existing=True,
    )
```

Update the final log line in `start_scheduler()` to include the new job name:

```python
    logger.info(
        "scheduler: started (morning_scan, intraday_check, eod_cleanup, "
        "sentiment_scan, sentiment_backfill, scan_log_backfill, price_alerts_check, "
        "paper_trading_scan, ml_shadow_log)"
    )
```

- [ ] **Step 3: Register the manual trigger**

In `apps/api/routers/jobs.py`, add the import:

```python
from core.shadow_log import run_shadow_log
```

Add to the `_JOBS` dict:

```python
    "ml-shadow-log": run_shadow_log,
```

- [ ] **Step 4: Verify locally**

Run:
```bash
cd apps/api && python3 -c "
from core.shadow_log import run_shadow_log
print(run_shadow_log())
"
```
Expected: `{'logged': N, 'skipped': M}` where N is close to 30 (the full `NSE_UNIVERSE` size) and M is small/zero.

Run:
```bash
curl -s "$SUPABASE_URL/rest/v1/ml_shadow_log?select=symbol,bias,ml_bias,ml_confidence&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: up to 5 rows with populated `bias`, `ml_bias`, `ml_confidence` values.

- [ ] **Step 5: Commit**

```bash
git add apps/api/core/shadow_log.py apps/api/core/scheduler.py apps/api/routers/jobs.py
git commit -m "Add daily shadow-mode logging job for the trained classifier"
```

---

### Task 7: `ml_shadow_log` backfill

**Files:**
- Create: `apps/api/core/ml_shadow_log_backfill.py`
- Modify: `apps/api/core/scheduler.py`
- Modify: `apps/api/routers/jobs.py`

- [ ] **Step 1: Write `apps/api/core/ml_shadow_log_backfill.py`**

```python
"""Backfill for ml_shadow_log — fills price_30d/return_30d once 30 days have
passed, mirroring scan_log_backfill.py's pattern exactly
(docs/superpowers/specs/2026-07-07-trained-signal-classifier-design.md)."""
import logging
import time
from datetime import datetime, timedelta, timezone

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch

logger = logging.getLogger(__name__)


def run_ml_shadow_log_backfill() -> dict:
    today = datetime.now(timezone.utc).date()
    d30ago = (today - timedelta(days=30)).isoformat()

    need30 = rest_get("ml_shadow_log", [
        ("scanned_at", f"lte.{d30ago}"),
        ("price_30d", "is.null"),
        ("select", "id,symbol,price_at"),
        ("limit", "100"),
    ])

    updated = 0
    for row in need30:
        price = fetch_price(row["symbol"], "NSE")
        time.sleep(0.2)
        if price is None or not row["price_at"]:
            continue
        try:
            ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
            rest_patch("ml_shadow_log", {"id": f"eq.{row['id']}"}, {"price_30d": price, "return_30d": ret})
            updated += 1
        except Exception as e:
            logger.error("ml_shadow_log_backfill: patch failed for %s: %s", row["symbol"], e)

    summary = {"updated_30d": updated}
    logger.info("ml_shadow_log_backfill: %s", summary)
    return summary
```

- [ ] **Step 2: Register the scheduled job**

In `apps/api/core/scheduler.py`, add the import:

```python
from core.ml_shadow_log_backfill import run_ml_shadow_log_backfill
```

Add the job registration inside `start_scheduler()`, after the `ml_shadow_log` job block added in Task 6:

```python
    # 9:40 AM IST, daily — ml_shadow_log 30d outcome backfill
    scheduler.add_job(
        run_ml_shadow_log_backfill,
        CronTrigger(hour=9, minute=40, timezone=IST),
        id="ml_shadow_log_backfill",
        name="ML Shadow Log Backfill",
        replace_existing=True,
    )
```

Update the final log line again:

```python
    logger.info(
        "scheduler: started (morning_scan, intraday_check, eod_cleanup, "
        "sentiment_scan, sentiment_backfill, scan_log_backfill, price_alerts_check, "
        "paper_trading_scan, ml_shadow_log, ml_shadow_log_backfill)"
    )
```

- [ ] **Step 3: Register the manual trigger**

In `apps/api/routers/jobs.py`, add the import:

```python
from core.ml_shadow_log_backfill import run_ml_shadow_log_backfill
```

Add to the `_JOBS` dict:

```python
    "ml-shadow-log-backfill": run_ml_shadow_log_backfill,
```

- [ ] **Step 4: Verify locally**

Run:
```bash
cd apps/api && python3 -c "
from core.ml_shadow_log_backfill import run_ml_shadow_log_backfill
print(run_ml_shadow_log_backfill())
"
```
Expected: `{'updated_30d': 0}` (correct — no rows are 30 days old yet on first run; this becomes non-zero starting 30 days after Task 6's job first runs in production).

- [ ] **Step 5: Commit**

```bash
git add apps/api/core/ml_shadow_log_backfill.py apps/api/core/scheduler.py apps/api/routers/jobs.py
git commit -m "Add ml_shadow_log 30-day outcome backfill job"
```

---

### Task 8: Update deployment docs and deploy

**Files:**
- Modify: `docs/deployment-schedules.md`

- [ ] **Step 1: Add the two new jobs to the schedule table**

In `docs/deployment-schedules.md`'s job table, add two rows after the existing `price_alerts_check` row:

```markdown
| `ml_shadow_log` | 9:35 AM (skips NSE holidays), Mon–Fri | Runs the trained classifier + rule-based bias for every NSE_UNIVERSE stock, logs both to `ml_shadow_log` for shadow-mode validation |
| `ml_shadow_log_backfill` | 9:40 AM, daily | Fills `ml_shadow_log.price_30d`/`return_30d` once 30 days have passed |
```

Add the two new curl examples to the "Manual triggers" section:

```bash
curl -X POST "https://api.signalgenie.ai/api/jobs/ml-shadow-log?secret=<CRON_SECRET>"
curl -X POST "https://api.signalgenie.ai/api/jobs/ml-shadow-log-backfill?secret=<CRON_SECRET>"
```

- [ ] **Step 2: Commit and push**

```bash
git add docs/deployment-schedules.md
git commit -m "Document ml_shadow_log jobs in deployment schedule"
git push
```

- [ ] **Step 3: Deploy `apps/api` (Signal_BackEnd) on Dokploy**

Trigger a normal Dokploy redeploy for Signal_BackEnd (no build-arg landmine here like Signal_FrontEnd had — `apps/api` doesn't read any config baked in at build time for this feature). After it's up, verify the scheduler log line includes the two new job names:

```bash
ssh signal-vps "sudo docker logs \$(sudo docker ps -q -f name=signal-signalbackend) --since 2m 2>&1 | grep 'scheduler: started'"
```

Expected: the log line lists `ml_shadow_log` and `ml_shadow_log_backfill` among the running jobs.

- [ ] **Step 4: Trigger both jobs manually once to confirm end-to-end**

```bash
curl -X POST "https://api.signalgenie.ai/api/jobs/ml-shadow-log?secret=<CRON_SECRET>"
curl -X POST "https://api.signalgenie.ai/api/jobs/ml-shadow-log-backfill?secret=<CRON_SECRET>"
```

Expected: both return `{"job": "...", "result": {...}}` with the same shapes verified locally in Tasks 6 and 7. Then re-run the `ml_shadow_log` row check from Task 6 Step 4 against production Supabase to confirm real rows landed.

---

## Shadow window (no code — a calendar note)

Once Task 8 is deployed and running daily, let it accumulate for **4 weeks** per the spec before making any cutover decision. There is no task here to "cut over" — that's a judgment call made by querying `ml_shadow_log`'s accumulated `bias`/`ml_bias`/`return_30d` data at the end of the window, not a scheduled piece of work.
