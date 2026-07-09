import asyncio
import os

from fastapi import APIRouter, HTTPException, Query

from core.ml_shadow_log_backfill import run_ml_shadow_log_backfill
from core.paper_trading_scan import run_paper_trading_scan
from core.price_alerts import run_price_alerts_check
from core.scan_log_backfill import run_scan_log_backfill
from core.sentiment_scan import run_sentiment_backfill, run_sentiment_scan
from core.shadow_log import run_shadow_log
from core.signal_cache_scan import run_signal_cache_prewarm
from core.scan_log_writer import run_scan_log_writer

router = APIRouter(prefix="/jobs", tags=["jobs"])

_CRON_SECRET = os.getenv("CRON_SECRET", "")

_JOBS = {
    "sentiment-scan": run_sentiment_scan,
    "sentiment-backfill": run_sentiment_backfill,
    "scan-log-backfill": run_scan_log_backfill,
    "price-alerts-check": run_price_alerts_check,
    "paper-trading-scan": run_paper_trading_scan,
    "ml-shadow-log": run_shadow_log,
    "ml-shadow-log-backfill": run_ml_shadow_log_backfill,
    "signal-cache-prewarm": run_signal_cache_prewarm,
    "scan-log-writer": run_scan_log_writer,
}


@router.post("/{name}")
async def trigger_job(name: str, secret: str = Query(default="")):
    """Manually trigger a job for testing/ops. Costs real money per call
    (Grok API) and can send real push notifications — gated by CRON_SECRET,
    the same shared secret the scheduled Next.js routes used before this
    migration."""
    if _CRON_SECRET and secret != _CRON_SECRET:
        raise HTTPException(status_code=403, detail="forbidden")
    fn = _JOBS.get(name)
    if fn is None:
        return {"error": f"unknown job '{name}'", "available": list(_JOBS.keys())}
    result = await asyncio.to_thread(fn)
    return {"job": name, "result": result}
