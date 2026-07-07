"""Daily job: runs the full NSE_UNIVERSE through get_technical_analysis()
and logs both the rule-based bias and the trained model's ml_bias/
ml_confidence to ml_shadow_log, for shadow-mode validation before cutover."""
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
