# Trained Signal Classifier — Design

Date: 2026-07-07

## Context

The product is marketed as "ML Technical Scan" everywhere it appears (signals page, portfolio
`ml_class` badges, US signals, `/api/ml/*` route naming) — but the actual computation, in
`apps/api/core/technical.py`'s `get_technical_analysis()`, is 100% deterministic rules: a list of
signal triggers (RSI oversold/overbought, EMA5/20/50/200 crossovers, golden/death cross, 200-SMA
position, volume spike), tallied into a bullish-vs-bearish vote count, majority wins, ties are
`NEUTRAL`. No trained model exists anywhere in this codebase. This is a false claim and this spec
is Phase 3 of the previously-agreed 3-phase ML roadmap in `2026-07-05-bias-track-record-design.md`
(Phase 1: track-record pipeline; Phase 2: statistical/regression upgrades; Phase 3: trained model).

That earlier spec's Phase 3 note said "lightweight in-JS trained model, weights baked into a TS
constant, offline-trained" — written when `apps/api` (the Python backend, "Signal_BackEnd") had
never been deployed and its future was uncertain. As of this session, `apps/api` is confirmed
deployed and running in production (Dokploy, Swarm service `signal-signalbackend-bkup7s`) and is
already the real engine behind every signal computation (India via `routers/signals.py`, and per
`2026-07-06-us-stock-ml-parity-design.md`, the same engine is intended for US parity). Given that,
**this spec supersedes the "in-JS/TS constant" direction**: the model is trained and served in
Python, inside `apps/api`, reusing the exact feature computation `get_technical_analysis()`
already does — no second implementation of RSI/EMA/MACD/BB math in TypeScript, and no ceiling
forcing the model down to something simple enough to hardcode as a JS constant.

**Separately discovered dead code (not fixed by this spec, noted for a future cleanup pass):**
`apps/web/app/api/ml/signals/[ticker]/route.ts` is an orphaned, unreachable Next.js edge route —
`next.config.ts`'s `/api/ml/:path*` rewrite to `ML_API_URL` always wins over it in production, so
its own `calcRsi`/`calcEma`/`deriveSignal` logic never actually runs. Confirmed empirically: a
live request returns the Python backend's response shape (`ema5`, `sma200`, `support_1`, `bias`,
etc.), not this file's shape (`{signal, rsi, current_price, change_pct}`).

## Goals

- Train a real classifier that predicts `P(positive 30-day forward return)` per stock, using the
  same feature set `get_technical_analysis()` already computes.
- Bootstrap training data via historical backtest-label generation (yfinance history), since
  `scan_log` (the live track-record table from Phase 1) has zero rows with `return_30d`/
  `return_60d` filled yet — 220 rows total, oldest from 2026-06-27, nothing has reached the
  30-day backfill mark.
- Validate the model in shadow mode against the existing rule-based `bias` before it's ever
  allowed to affect what a user sees.
- Confidence score (`ml_confidence` = `predict_proba`) as a side effect — replaces the current
  crude RSI-distance-from-50 heuristic once cut over.

## Non-goals / out of scope

- Swing-picks engine (Claude Sonnet + Grok reasoning) — different paradigm, separate future spec.
- Sentiment scan — already correctly labeled "AI sentiment / Grok," not part of the false-ML-claim
  problem this addresses.
- Deleting the orphaned `[ticker]/route.ts` dead code — separate small cleanup, not blocking.
- UI copy audit for other "ML" labels — deferred until this model is actually live and the claim
  becomes true for at least this one system.
- Automatic retraining — first version is a manually re-run training script; automatic (e.g.
  monthly) retraining once `scan_log`'s real outcomes mature is a later fast-follow.
- US stocks — this spec trains and validates on the India `NSE_UNIVERSE` only. Extending to the
  US universe (`us_universe.json`, per the US-parity spec) is a follow-up once this is proven.
- The signals page's main scan list (`GET /signals`, backed by `core/swing_scan.py`'s
  `run_swing_scan()`) — confirmed during planning to be a **separate, independent** screener from
  `get_technical_analysis()`, with its own hand-rolled RSI/EMA and scoring formula, returning only
  pre-filtered candidates all hardcoded `"signal": "BUY"`. It is also not really "ML," but it's a
  different system needing its own separate spec — not touched here. This spec's target
  (`get_technical_analysis()`, reached via `GET /signals/{ticker}`) is what powers the portfolio
  page's `ml_class` badges and the per-ticker detail drawer on the signals page — confirmed as the
  shared, symbol-agnostic engine intended for both India and (per the US-parity spec) US serving.

## Data pipeline

New `apps/api/ml/` module:

- **`apps/api/ml/backtest_labels.py`** — walks `NSE_UNIVERSE` (the 30-stock list defined in
  `apps/api/core/paper_trading_scan.py`, imported rather than duplicated) across ~3 years of
  yfinance daily history.
  At each historical date (skipping the initial warm-up window needed before EMA200/RSI/BB are
  defined), computes the same feature set `get_technical_analysis()` computes today:
  - RSI(14)
  - EMA5/20/50/200, expressed as `(price / ema) - 1` (relative distance, not raw price — keeps
    the feature scale-invariant across stocks with very different price levels)
  - MACD histogram (MACD line − signal line)
  - Bollinger Band %B
  - Volume ratio (vs 20-day average)
  - % from 52-week high

  Labels each row with the actual realized forward 30-trading-day return (known, since this is
  historical data — no need to wait). Output: `apps/api/ml/training_data.parquet`, a local build
  artifact, **not** written to Supabase (this is training data generated offline, not live app
  state).

- **Split methodology:** time-based, not random-shuffle. Train on data through end of 2025,
  validate on the early-2026 slice. Random-shuffling would leak information across
  temporally-adjacent, highly-correlated rows (the same stock's indicators on consecutive days
  are not independent samples) — a classic lookahead-bias mistake this explicitly avoids.

## Training

- **`apps/api/ml/train.py`** — `sklearn.ensemble.HistGradientBoostingClassifier` on the feature
  set above. Chosen over logistic regression (likely too weak — real RSI/EMA/MACD interactions
  aren't linear) and over a stacked/ensembled multi-model setup (the FIFA WC2026 bracket
  predictor's stacked classifier silently degenerated to ~99% one-class output, undetected for a
  while — a single, inspectable model is a deliberate choice to avoid repeating that failure
  mode). Pure `scikit-learn`, no new native dependency (no XGBoost/LightGBM).
- Target: `1 if forward_return_30d > 0 else 0`.
- **Sanity gate, enforced by the training script itself:** refuse to write `model.joblib` if the
  model's predicted-positive rate on the validation split falls outside a sane band (30–70%).
  This is the check that would have caught the FIFA model's degenerate output before it ever
  shipped — applied here from the start.
- Output: `apps/api/ml/model.joblib`, committed to the repo (a small sklearn tabular model, no
  reason to keep it out of version control).
- Retraining: manual (`python -m ml.train`), rerun by hand for now. Automatic retraining folding
  in real `scan_log` outcomes as they mature is a later fast-follow (non-goal above).

## Serving & shadow-mode rollout

- `get_technical_analysis()` gains a second, parallel computation path: alongside the existing
  vote-counting `bias`, it also runs `model.joblib` on the same already-computed features to
  produce `ml_bias` (`BULLISH` if `predict_proba >= 0.55`, `BEARISH` if `predict_proba <= 0.45`,
  else `NEUTRAL`) and `ml_confidence` (the raw probability), added as two new keys on the returned
  dict. Purely additive — the API response and UI keep reading the existing `bias`/`confidence`
  fields unchanged, so this is a safe no-behavior-change deploy on its own.

- **New table `ml_shadow_log`, not `scan_log`.** `scan_log` writes are driven by the frontend's
  `logScansAsync` (`apps/web/app/dashboard/signals/page.tsx`), which only fires when a user has
  the signals page open, and only logs the swing-screener's pre-filtered candidates (a different,
  separate system per the Non-goals note above — it doesn't carry a `bias` value at all).
  Reusing `scan_log` for this would mean incomplete, user-dependent coverage and risks row
  collisions with the screener's existing writes to the same `(scanned_at, symbol, exchange)` key.
  Following the same precedent as `bias_log` (created as its own table rather than overloading
  `scan_log` for forex/commodities), shadow-mode data gets its own table:

  ```sql
  CREATE TABLE IF NOT EXISTS public.ml_shadow_log (
    id            uuid primary key default gen_random_uuid(),
    scanned_at    date not null,
    symbol        text not null,
    bias          text not null,        -- rule-based, from get_technical_analysis()
    ml_bias       text not null,        -- trained model
    ml_confidence numeric not null,     -- predict_proba
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

- **New Python job, not a frontend side effect.** `apps/api/ml/shadow_log.py`, scheduled daily in
  `core/scheduler.py` (same pattern as `paper_trading_scan`): iterates the full `NSE_UNIVERSE`
  (not just screener matches), calls `get_technical_analysis()` for each symbol, and upserts one
  row per symbol per day to `ml_shadow_log` via `core/supabase_rest.py`'s existing `rest_post`
  helper (`Prefer: resolution=merge-duplicates`). This guarantees complete, reliable daily
  coverage independent of whether anyone opens the dashboard.

- **Backfill:** a small addition to `apps/api/core/scan_log_backfill.py` (or a new sibling
  function, reusing its existing Yahoo-price-lookup pattern) fills `price_30d`/`return_30d` on
  `ml_shadow_log` rows once 30 days have passed, mirroring exactly what it already does for
  `scan_log`.

- **Shadow window: 4 weeks.** Chosen because the backfill needs 30 days to mature — a 4-week
  window means the earliest-logged shadow rows will have a real `return_30d` by the time the
  window closes, giving at least some real evidence rather than none.

- **Cutover criterion:** compare realized hit-rate — did `ml_bias=BULLISH` rows see
  `return_30d > 0` more often than `bias=BULLISH` rows did, over whatever real data accumulated
  in `ml_shadow_log` during the 4 weeks. This is explicitly a judgment call on a small sample, not
  a rigorous significance test — acknowledged and accepted, with the cutover reversible (flip the
  API back to serving rule-based `bias`) if it looks wrong after the fact.

- Once cutover happens: `get_technical_analysis()`'s returned `bias`/`confidence` values become
  the model's `ml_bias`/`ml_confidence` (the `ml_*` keys can stay too, now redundant but harmless).
  The rule-based vote-counting logic stays in the codebase (not deleted) as a fallback/reference,
  at minimum through the first post-cutover review cycle.

## Testing

No automated test infra exists elsewhere in this codebase (consistent with the rest of the app).
Verify by:

- Running `backtest_labels.py` on a small subset (e.g. 2 stocks, 6 months) first, spot-checking a
  handful of rows' computed indicators against `get_technical_analysis()`'s live output for the
  same stock/date to confirm the feature computation genuinely matches.
- After full-scale generation, checking the label distribution isn't wildly skewed (a market that
  went up most of the last 3 years will have more positive-label rows than negative — expected,
  but worth eyeballing before training).
- `train.py`'s built-in sanity gate (30–70% predicted-positive band) is itself a test — a failed
  gate should halt and print validation-set metrics for inspection, not fail silently.
- During shadow mode: periodically query `scan_log` for `ml_bias`/`bias` agreement rate and
  (once available) each side's real `return_30d` hit-rate, informally, ahead of the formal
  4-week cutover check.
