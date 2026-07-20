"""
Full US market scan (~7000-8000 NASDAQ/NYSE/AMEX stocks) — mirrors
core/full_market_scan.py's India approach, applied to the US universe via
Alpaca instead of Kite. Runs once daily (see scheduler.py). Alpaca's batch
bars endpoint covers hundreds of symbols per HTTP call (unlike Kite's
one-call-per-symbol historical API), so this doesn't need India's per-symbol
rate-limit pacing -- a handful of large batches finishes in well under a
minute of actual API time.

Results are cached to Supabase `scan_cache` under key 'us_full_market' --
same table/shape as the India scans. The Next.js route for this only ever
READS that row.

Unlike India's tiered depth (Starter/Pro/Elite), the whole US signals
section is already Elite-only (see PLAN_GATES['signals-us'] in
apps/web/lib/use-plan.ts) -- no lower tier can reach this scan at all, so
there's no depth slicing to layer on top: Elite gets every qualifying stock.
"""
import logging
import time
from datetime import datetime, timezone

from core.alpaca_client import fetch_alpaca_daily_closes_batch, fetch_full_us_universe
from core.scan_scoring import score_symbol
from core.supabase_rest import rest_post

logger = logging.getLogger(__name__)

_SCAN_KEY = "us_full_market"
_BATCH_SIZE = 200


def run_full_market_scan_us() -> dict:
    universe = fetch_full_us_universe()
    if not universe:
        logger.error("full_market_scan_us: no universe available (Alpaca not configured) -- skipping")
        return {"ok": False, "reason": "no_universe"}

    name_map = {s["symbol"]: s["name"] for s in universe}
    symbols = [s["symbol"] for s in universe]

    results = []
    scanned = failed = 0

    for i in range(0, len(symbols), _BATCH_SIZE):
        batch = symbols[i : i + _BATCH_SIZE]
        try:
            closes = fetch_alpaca_daily_closes_batch(batch, days=35)
            if closes is None:
                failed += len(batch)
                continue
            for sym in batch:
                try:
                    if sym not in closes.columns:
                        continue
                    pick = score_symbol(sym, closes[sym], name=name_map.get(sym, sym), min_price=20.0, price_decimals=2)
                    if pick:
                        results.append(pick)
                    scanned += 1
                except Exception:
                    failed += 1
        except Exception as e:
            failed += len(batch)
            logger.warning("full_market_scan_us: batch %d-%d failed -- %s", i, i + _BATCH_SIZE, e)
        time.sleep(0.3)

    results.sort(key=lambda x: -x["score"])

    now = datetime.now(timezone.utc).isoformat()
    rest_post(
        "scan_cache",
        {"scan_key": _SCAN_KEY, "results": results, "computed_at": now},
        prefer="resolution=merge-duplicates,return=minimal",
    )

    summary = {"ok": True, "universe": len(universe), "scanned": scanned, "failed": failed, "qualifying": len(results)}
    logger.info("full_market_scan_us: %s", summary)
    return summary
