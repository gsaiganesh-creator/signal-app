import os
import logging
import httpx
from core.supabase_client import get_push_tokens

logger = logging.getLogger(__name__)

_EXPO_URL = "https://exp.host/--/api/v2/push/send"
_EXPO_TOKEN = os.getenv("EXPO_ACCESS_TOKEN", "")


def send_entry_alerts(triggered: list[dict]) -> None:
    """
    Sends Expo push notifications for all triggered signals.
    triggered: list of dicts from price_checker.run_intraday_check()
    """
    if not triggered:
        return

    symbols = [s["symbol"] for s in triggered]
    token_rows = get_push_tokens(symbols)
    if not token_rows:
        logger.info("notifier: no push tokens found for %s", symbols)
        return

    # build a map: symbol → list of expo tokens
    token_map: dict[str, list[str]] = {}
    for row in token_rows:
        token_map.setdefault(row["symbol"], []).append(row["expo_token"])

    messages = []
    for sig in triggered:
        sym = sig["symbol"]
        tokens = token_map.get(sym, [])
        if not tokens:
            continue

        ticker = sym.replace(".NS", "")
        price = sig["triggered_price"]
        title = f"🎯 {ticker} entering buy zone"
        body = (
            f"₹{price:,.0f} | "
            f"Entry ₹{sig['entry_low']:,.0f}–₹{sig['entry_high']:,.0f} | "
            f"Target ₹{sig['target']:,.0f} | "
            f"SL ₹{sig['sl']:,.0f}"
        )
        for token in tokens:
            messages.append({
                "to": token,
                "title": title,
                "body": body,
                "data": {"symbol": sym, "screen": "signal-detail"},
                "sound": "default",
                "priority": "high",
            })

    if not messages:
        return

    headers = {"Content-Type": "application/json"}
    if _EXPO_TOKEN:
        headers["Authorization"] = f"Bearer {_EXPO_TOKEN}"

    # Expo accepts max 100 messages per request
    batch_size = 100
    with httpx.Client() as client:
        for i in range(0, len(messages), batch_size):
            batch = messages[i : i + batch_size]
            try:
                r = client.post(_EXPO_URL, headers=headers, json=batch)
                r.raise_for_status()
                logger.info("notifier: sent %d push notifications", len(batch))
            except Exception as e:
                logger.error("notifier: push send failed: %s", e)
