"""
Full NSE+BSE market scan (~4000 stocks) — the depth differentiator between
plan tiers, vs. swing_scan.py's curated ~100-stock universe which stays the
same for everyone. Runs once daily (see scheduler.py), paced to stay under
Kite's ~3 req/sec historical-data rate limit — ~4000 symbols means a run of
20+ minutes, which is why this can only be a scheduled background job, never
a live per-request call.

Results are cached to Supabase `scan_cache` under key 'india_full_market' —
the same table apps/web's lib/scan-cache.ts already reads for the other
scan pills (ML Top 20 / Beta / Fundamental). The Next.js API route for this
pill only ever READS that row; it never computes inline, since a scan this
size can't fit inside a request's execution window.
"""
import logging
import time
from datetime import datetime, timezone

from core.kite_client import fetch_full_market_universe, fetch_kite_close_series
from core.scan_scoring import score_symbol
from core.supabase_rest import rest_post

logger = logging.getLogger(__name__)

_SCAN_KEY = "india_full_market"
_RATE_LIMIT_SLEEP = 0.34  # ~3 req/sec Kite historical-data cap


def run_full_market_scan() -> dict:
    universe = fetch_full_market_universe()
    if not universe:
        logger.error("full_market_scan: no universe available (Kite not configured/logged in) — skipping")
        return {"ok": False, "reason": "no_universe"}

    results = []
    scanned = failed = 0

    for stock in universe:
        try:
            s_close = fetch_kite_close_series(stock["symbol"], days=35)
            if s_close is None:
                failed += 1
                continue
            pick = score_symbol(stock["symbol"], s_close, name=stock["name"])
            if pick:
                results.append(pick)
            scanned += 1
        except Exception as e:
            failed += 1
            logger.debug("full_market_scan: %s failed — %s", stock["symbol"], e)
        time.sleep(_RATE_LIMIT_SLEEP)

    results.sort(key=lambda x: -x["score"])

    now = datetime.now(timezone.utc).isoformat()
    rest_post(
        "scan_cache",
        {"scan_key": _SCAN_KEY, "results": results, "computed_at": now},
        prefer="resolution=merge-duplicates,return=minimal",
    )

    summary = {"ok": True, "universe": len(universe), "scanned": scanned, "failed": failed, "qualifying": len(results)}
    logger.info("full_market_scan: %s", summary)
    return summary
