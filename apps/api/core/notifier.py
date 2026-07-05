import os
import json
import logging
import httpx
from core.supabase_client import get_push_tokens, get_web_push_subscriptions

logger = logging.getLogger(__name__)

_EXPO_URL = "https://exp.host/--/api/v2/push/send"
_EXPO_TOKEN = os.getenv("EXPO_ACCESS_TOKEN", "")
_VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
_VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
_VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:admin@signal.in")


def send_entry_alerts(triggered: list[dict]) -> None:
    """
    Sends push notifications for all triggered signals.
    Covers both Expo (mobile) and Web Push (browser).
    """
    if not triggered:
        return

    symbols = [s["symbol"] for s in triggered]

    _send_expo_notifications(triggered, symbols)
    _send_web_push_notifications(triggered, symbols)


def _build_notification(sig: dict) -> tuple[str, str]:
    ticker = sig["symbol"].replace(".NS", "")
    price = sig["triggered_price"]
    title = f"🎯 {ticker} entering buy zone"
    body = (
        f"₹{price:,.0f} | "
        f"Entry ₹{sig['entry_low']:,.0f}–₹{sig['entry_high']:,.0f} | "
        f"Target ₹{sig['target']:,.0f} | "
        f"SL ₹{sig['sl']:,.0f}"
    )
    return title, body


def _send_expo_notifications(triggered: list[dict], symbols: list[str]) -> None:
    token_rows = get_push_tokens(symbols)
    if not token_rows:
        logger.info("notifier: no expo tokens found for %s", symbols)
        return

    token_map: dict[str, list[str]] = {}
    for row in token_rows:
        token_map.setdefault(row["symbol"], []).append(row["expo_token"])

    messages = []
    for sig in triggered:
        tokens = token_map.get(sig["symbol"], [])
        if not tokens:
            continue
        title, body = _build_notification(sig)
        for token in tokens:
            messages.append({
                "to": token,
                "title": title,
                "body": body,
                "data": {"symbol": sig["symbol"], "screen": "signal-detail"},
                "sound": "default",
                "priority": "high",
            })

    if not messages:
        return

    headers = {"Content-Type": "application/json"}
    if _EXPO_TOKEN:
        headers["Authorization"] = f"Bearer {_EXPO_TOKEN}"

    with httpx.Client() as client:
        for i in range(0, len(messages), 100):
            batch = messages[i : i + 100]
            try:
                client.post(_EXPO_URL, headers=headers, json=batch).raise_for_status()
                logger.info("notifier: sent %d expo push notifications", len(batch))
            except Exception as e:
                logger.error("notifier: expo push failed: %s", e)


def _send_web_push_notifications(triggered: list[dict], symbols: list[str]) -> None:
    if not _VAPID_PRIVATE_KEY:
        logger.warning("notifier: VAPID_PRIVATE_KEY not set, skipping web push")
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.error("notifier: pywebpush not installed")
        return

    sub_rows = get_web_push_subscriptions(symbols)
    if not sub_rows:
        logger.info("notifier: no web push subscriptions found for %s", symbols)
        return

    sub_map: dict[str, list[dict]] = {}
    for row in sub_rows:
        sub_map.setdefault(row["symbol"], []).append(row)

    for sig in triggered:
        subs = sub_map.get(sig["symbol"], [])
        if not subs:
            continue
        title, body = _build_notification(sig)
        payload = json.dumps({
            "title": title,
            "body": body,
            "data": {"symbol": sig["symbol"], "screen": "signal-detail"},
        })
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {
                            "p256dh": sub["p256dh"],
                            "auth": sub["auth"],
                        },
                    },
                    data=payload,
                    vapid_private_key=_VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": _VAPID_EMAIL},
                )
                logger.info("notifier: sent web push for %s", sig["symbol"])
            except WebPushException as e:
                logger.error("notifier: web push failed for %s: %s", sig["symbol"], e)
