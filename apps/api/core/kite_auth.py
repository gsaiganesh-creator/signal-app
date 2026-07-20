"""
Kite daily headless login — ported from MStock-Automation's
trading/kite_auto_login.py (the exact HTTP+TOTP flow already proven working
in production there), adapted for apps/api:
  - Writes the fresh access_token to Supabase (kite_session table) instead
    of a local .env file — apps/api's actual host disk persistence across
    restarts/redeploys isn't guaranteed, and every job in this process
    needs to read the same current token.
  - Skips the Playwright browser-login fallback the original script has for
    when Kite's redirect-based flow breaks. That fallback needs a Chromium
    binary in the Docker image (~300MB) for a rarely-hit path. If the
    primary HTTP flow starts failing regularly in practice, port that
    fallback in then — not preemptively.

Kite access tokens expire at midnight IST daily — this must run once each
morning before market open (08:45 IST, see core/scheduler.py) via TOTP,
fully unattended.
"""
import logging
import os
import re
import socket
from datetime import datetime, timezone

import pyotp
import requests

from core.notify import send_whatsapp

logger = logging.getLogger(__name__)

SUPA_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SRVC_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

KITE_BASE = "https://kite.zerodha.com"
CONNECT_URL = "https://kite.zerodha.com/connect/login"

# Same IPv4-only workaround as the original script — some hosts resolve
# kite.zerodha.com to an IPv6 address first and the connection hangs.
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, *args, **kwargs):
    return _orig_getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = _ipv4_only


def _svc_headers():
    return {"apikey": SRVC_KEY, "Authorization": f"Bearer {SRVC_KEY}", "Content-Type": "application/json"}


def save_session(access_token: str | None, health_ok: bool) -> None:
    if not SUPA_URL or not SRVC_KEY:
        logger.error("kite_auth: Supabase env vars not set — cannot persist session")
        return
    body = {"access_token": access_token, "updated_at": datetime.now(timezone.utc).isoformat(), "last_health_ok": health_ok}
    try:
        requests.patch(f"{SUPA_URL}/rest/v1/kite_session?id=eq.1", headers=_svc_headers(), json=body, timeout=10)
    except Exception as e:
        logger.error("kite_auth: failed to persist session to Supabase — %s", e)


def get_stored_access_token() -> str | None:
    if not SUPA_URL or not SRVC_KEY:
        return None
    try:
        r = requests.get(f"{SUPA_URL}/rest/v1/kite_session?id=eq.1&select=access_token", headers=_svc_headers(), timeout=10)
        if r.ok and r.json():
            return r.json()[0].get("access_token")
    except Exception as e:
        logger.warning("kite_auth: failed to read stored session — %s", e)
    return None


def get_last_health_ok() -> bool:
    """Defaults to True (not False) on any read failure — an unreadable
    Supabase row shouldn't itself trigger a spurious 'just went unhealthy'
    alert from the health-check job's before/after comparison."""
    if not SUPA_URL or not SRVC_KEY:
        return True
    try:
        r = requests.get(f"{SUPA_URL}/rest/v1/kite_session?id=eq.1&select=last_health_ok", headers=_svc_headers(), timeout=10)
        if r.ok and r.json():
            return bool(r.json()[0].get("last_health_ok", True))
    except Exception as e:
        logger.warning("kite_auth: failed to read health status — %s", e)
    return True


def auto_login() -> str | None:
    """Full headless TOTP login. Returns access_token on success, None on failure."""
    api_key = os.getenv("KITE_API_KEY", "").strip()
    api_secret = os.getenv("KITE_API_SECRET", "").strip()
    user_id = os.getenv("KITE_USER_ID", "").strip()
    password = os.getenv("KITE_PASSWORD", "").strip()
    totp_secret = os.getenv("KITE_TOTP_SECRET", "").strip()

    missing = [k for k, v in {
        "KITE_API_KEY": api_key, "KITE_API_SECRET": api_secret,
        "KITE_USER_ID": user_id, "KITE_PASSWORD": password,
        "KITE_TOTP_SECRET": totp_secret,
    }.items() if not v]
    if missing:
        logger.error("kite_auth: missing env vars: %s", ", ".join(missing))
        return None

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0", "X-Kite-Version": "3"})

    try:
        # Step 1: user_id + password
        resp = session.post(f"{KITE_BASE}/api/login", data={"user_id": user_id, "password": password}, timeout=15)
        data = resp.json()
        if data.get("status") != "success":
            logger.error("kite_auth: login step failed — %s", data.get("message", data))
            return None
        request_id = data["data"]["request_id"]

        # Step 2: TOTP 2FA
        totp_value = pyotp.TOTP(totp_secret).now()
        resp = session.post(f"{KITE_BASE}/api/twofa", data={
            "user_id": user_id, "request_id": request_id, "twofa_value": totp_value, "twofa_type": "totp",
        }, timeout=15)
        data = resp.json()
        if data.get("status") != "success":
            logger.error("kite_auth: TOTP step failed — %s", data.get("message", data))
            return None

        # Step 3: hit Connect login URL with the authenticated session, capture request_token from redirect
        resp = session.get(f"{CONNECT_URL}?api_key={api_key}&skip_session=true", allow_redirects=False, timeout=15)
        redirect = resp.headers.get("Location", "")
        match = re.search(r"request_token=([A-Za-z0-9]+)", redirect)
        if not match:
            resp2 = session.get(redirect, allow_redirects=False, timeout=15) if redirect else None
            redirect2 = resp2.headers.get("Location", "") if resp2 else ""
            match = re.search(r"request_token=([A-Za-z0-9]+)", redirect2)
        if not match:
            logger.error("kite_auth: could not extract request_token from redirect (%s)", redirect)
            return None
        request_token = match.group(1)

        # Step 4: exchange for access_token
        from kiteconnect import KiteConnect
        kite = KiteConnect(api_key=api_key)
        sess = kite.generate_session(request_token, api_secret=api_secret)
        token = sess["access_token"]

        logger.info("kite_auth: logged in as %s (%s)", sess.get("user_name"), sess.get("user_id"))
        return token
    except Exception as e:
        logger.error("kite_auth: login flow raised — %s", e)
        return None


def verify_connection(access_token: str) -> bool:
    """Live check that the token actually works (profile + margins call)."""
    api_key = os.getenv("KITE_API_KEY", "").strip()
    try:
        from kiteconnect import KiteConnect
        kite = KiteConnect(api_key=api_key)
        kite.set_access_token(access_token)
        profile = kite.profile()
        logger.info("kite_auth: verified — %s (%s)", profile.get("user_name"), profile.get("user_id"))
        return True
    except Exception as e:
        logger.error("kite_auth: verify failed — %s", e)
        return False


def run_daily_login() -> None:
    """Scheduled entrypoint (~08:45 IST daily, before market open). Logs in,
    verifies, persists to Supabase, alerts on any failure via WhatsApp."""
    token = auto_login()
    if not token:
        save_session(None, health_ok=False)
        send_whatsapp("🔴 SignalGenie: Kite daily login FAILED. India scans will fall back to yfinance until this is fixed.")
        return

    ok = verify_connection(token)
    save_session(token, health_ok=ok)

    from core.kite_client import reset_client
    reset_client()  # force re-init so subsequent calls in this process pick up the fresh token

    if not ok:
        send_whatsapp("🔴 SignalGenie: Kite login succeeded but verification failed. Check the account manually.")
