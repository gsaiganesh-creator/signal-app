import os
import httpx

_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_HEADERS = {
    "apikey": _KEY,
    "Authorization": f"Bearer {_KEY}",
    "Content-Type": "application/json",
}


def _rest(path: str) -> str:
    return f"{_URL}/rest/v1/{path}"


def _today() -> str:
    from datetime import date
    return date.today().isoformat()


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _upsert(table: str, rows: list[dict]) -> None:
    if not rows:
        return
    with httpx.Client() as client:
        client.post(
            _rest(table),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=rows,
        ).raise_for_status()


def upsert_signals(rows: list[dict]) -> None:
    _upsert("daily_signals", rows)


def upsert_us_signals(rows: list[dict]) -> None:
    _upsert("us_daily_signals", rows)


def get_active_signals() -> list[dict]:
    with httpx.Client() as client:
        r = client.get(
            _rest("daily_signals"),
            headers={**_HEADERS, "Prefer": "return=representation"},
            params={
                "status": "eq.WATCHING",
                "date": f"eq.{_today()}",
                "select": "id,symbol,name,entry_low,entry_high,target,sl,confidence",
            },
        )
        r.raise_for_status()
        return r.json()


def mark_triggered(signal_id: str, symbol: str, price: float) -> None:
    with httpx.Client() as client:
        client.patch(
            _rest("daily_signals"),
            headers={**_HEADERS, "Prefer": "return=minimal"},
            params={"id": f"eq.{signal_id}"},
            json={"status": "TRIGGERED", "triggered_at": _now()},
        ).raise_for_status()

        client.post(
            _rest("signal_alerts"),
            headers={**_HEADERS, "Prefer": "return=minimal"},
            json={
                "signal_id": signal_id,
                "symbol": symbol,
                "alert_type": "ENTRY",
                "price_at_alert": price,
            },
        ).raise_for_status()


def expire_watching_signals() -> None:
    with httpx.Client() as client:
        client.patch(
            _rest("daily_signals"),
            headers={**_HEADERS, "Prefer": "return=minimal"},
            params={"status": "eq.WATCHING", "date": f"eq.{_today()}"},
            json={"status": "EXPIRED"},
        ).raise_for_status()


def get_push_tokens(symbols: list[str]) -> list[dict]:
    """Returns push token rows for users who watchlisted any triggered symbol."""
    if not symbols:
        return []
    sym_filter = "(" + ",".join(symbols) + ")"
    with httpx.Client() as client:
        r = client.get(
            _rest("push_tokens"),
            headers={**_HEADERS, "Prefer": "return=representation"},
            params={
                "select": "expo_token,user_id,symbol",
                "symbol": f"in.{sym_filter}",
            },
        )
        r.raise_for_status()
        return r.json()


def get_web_push_subscriptions(symbols: list[str]) -> list[dict]:
    """Returns all web push subscriptions (frontend saves to push_subscriptions table)."""
    with httpx.Client() as client:
        r = client.get(
            _rest("push_subscriptions"),
            headers={**_HEADERS, "Prefer": "return=representation"},
            params={"select": "endpoint,p256dh,auth,user_id"},
        )
        r.raise_for_status()
        return r.json()
