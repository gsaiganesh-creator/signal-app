"""Scan log backfill — fills in 30d/60d outcome prices for the ML technical
scan track record (scan_log table). Ported from the Next.js route that
implemented this before the move to this Python scheduler."""
import logging
from datetime import datetime, timedelta, timezone

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch

logger = logging.getLogger(__name__)


def run_scan_log_backfill() -> dict:
    today = datetime.now(timezone.utc).date()
    d30ago = (today - timedelta(days=30)).isoformat()
    d60ago = (today - timedelta(days=60)).isoformat()
    d65ago = (today - timedelta(days=65)).isoformat()

    need30 = rest_get("scan_log", [
        ("scanned_at", f"lte.{d30ago}"),
        ("price_30d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "100"),
    ])
    need60 = rest_get("scan_log", [
        ("scanned_at", f"lte.{d60ago}"),
        ("scanned_at", f"gte.{d65ago}"),
        ("price_60d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "100"),
    ])

    price_cache: dict[str, float | None] = {}
    for row in need30 + need60:
        key = f"{row['symbol']}:{row['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(row["symbol"], row["exchange"])

    updated30 = updated60 = 0
    for row in need30:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("scan_log", {"id": f"eq.{row['id']}"}, {"price_30d": price, "return_30d": ret})
            updated30 += 1
        except Exception as e:
            logger.error("scan_log_backfill: 30d patch failed for %s: %s", row["symbol"], e)

    for row in need60:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("scan_log", {"id": f"eq.{row['id']}"}, {"price_60d": price, "return_60d": ret})
            updated60 += 1
        except Exception as e:
            logger.error("scan_log_backfill: 60d patch failed for %s: %s", row["symbol"], e)

    summary = {"updated_30d": updated30, "updated_60d": updated60}
    logger.info("scan_log_backfill: %s", summary)
    return summary
