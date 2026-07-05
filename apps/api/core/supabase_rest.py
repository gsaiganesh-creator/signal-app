"""Generic Supabase REST helpers for the dashboard cron jobs (sentiment scan,
scan log backfill, price alerts). Separate from core/supabase_client.py,
which is dedicated to the dormant signal-lifecycle feature."""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_HEADERS = {
    "apikey": _KEY,
    "Authorization": f"Bearer {_KEY}",
    "Content-Type": "application/json",
}


def rest_get(path: str, params: dict | list[tuple[str, str]] | None = None) -> list[dict]:
    """Reads never abort the caller's job on a transient error — matches the
    TS routes this was ported from (`res.ok ? await res.json() : []`)."""
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.get(f"{_URL}/rest/v1/{path}", headers=_HEADERS, params=params or {})
            r.raise_for_status()
            return r.json()
    except Exception as e:
        logger.error("supabase_rest: GET %s failed: %s", path, e)
        return []


def rest_post(path: str, json_body: dict, prefer: str = "return=minimal") -> None:
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            f"{_URL}/rest/v1/{path}",
            headers={**_HEADERS, "Prefer": prefer},
            json=json_body,
        )
        r.raise_for_status()


def rest_patch(path: str, params: dict, json_body: dict, prefer: str = "return=minimal") -> None:
    with httpx.Client(timeout=15.0) as client:
        r = client.patch(
            f"{_URL}/rest/v1/{path}",
            headers={**_HEADERS, "Prefer": prefer},
            params=params,
            json=json_body,
        )
        r.raise_for_status()
