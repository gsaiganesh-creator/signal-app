"""Price alerts check — fires web push notifications when a user's price
alert target is hit. Ported from the Next.js route that implemented this
before the move to this Python scheduler."""
import json
import logging
import os
import time
from datetime import datetime, timezone

from pywebpush import WebPushException, webpush

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch

logger = logging.getLogger(__name__)

_VAPID_PRIVATE = os.getenv("VAPID_PRIVATE_KEY", "")
_VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:support@signalgenie.ai")


def run_price_alerts_check() -> dict:
    alerts = rest_get("price_alerts", {"triggered": "eq.false", "select": "*"})
    if not alerts:
        return {"checked": 0, "triggered": 0, "sent": 0}

    price_cache: dict[str, float | None] = {}
    for a in alerts:
        key = f"{a['symbol']}:{a['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(a["symbol"], a["exchange"])
            time.sleep(0.2)

    triggered = []
    for a in alerts:
        price = price_cache.get(f"{a['symbol']}:{a['exchange']}")
        if price is None:
            continue
        hit = price >= a["target_price"] if a["condition"] == "above" else price <= a["target_price"]
        if hit:
            triggered.append({**a, "current_price": price})

    if not triggered:
        return {"checked": len(alerts), "triggered": 0, "sent": 0}

    for a in triggered:
        try:
            rest_patch("price_alerts", {"id": f"eq.{a['id']}"}, {
                "triggered": True,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "triggered_price": a["current_price"],
            })
        except Exception as e:
            logger.error("price_alerts: mark-triggered failed for %s: %s", a["symbol"], e)

    user_ids = sorted({a["user_id"] for a in triggered})
    sub_filter = "(" + ",".join(f'"{u}"' for u in user_ids) + ")"
    subs = rest_get("push_subscriptions", {"user_id": f"in.{sub_filter}", "select": "*"})

    sent = 0
    for a in triggered:
        user_subs = [s for s in subs if s["user_id"] == a["user_id"]]
        direction = "above" if a["condition"] == "above" else "below"
        payload = json.dumps({
            "title": f"🔔 {a['symbol']} Alert Triggered",
            "body": f"{a['symbol']} is now ₹{a['current_price']:,.2f} — {direction} your ₹{a['target_price']} target.",
            "url": "/dashboard/watchlist",
            "tag": f"alert-{a['id']}",
        })
        for sub in user_subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                    },
                    data=payload,
                    vapid_private_key=_VAPID_PRIVATE,
                    vapid_claims={"sub": _VAPID_EMAIL},
                )
                sent += 1
            except WebPushException as e:
                logger.warning("price_alerts: push send failed for %s: %s", a["symbol"], e)

    summary = {"checked": len(alerts), "triggered": len(triggered), "sent": sent}
    logger.info("price_alerts: %s", summary)
    return summary
