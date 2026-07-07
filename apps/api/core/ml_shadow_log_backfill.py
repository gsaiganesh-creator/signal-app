"""Backfill for ml_shadow_log — fills price_30d/return_30d once 30 days
have passed, mirroring scan_log_backfill.py's pattern exactly."""
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
