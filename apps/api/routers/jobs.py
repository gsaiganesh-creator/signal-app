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
