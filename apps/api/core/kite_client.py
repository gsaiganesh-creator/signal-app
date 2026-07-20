"""
Kite historical/live data — ported from MStock-Automation's trading/kite_data.py
(the proven-in-production client), adapted to this codebase's Alpaca-client
interface shape (core/alpaca_client.py) so technical.py/swing_scan.py can
swap data sources the same way for India as they already do for US.

India equivalent of alpaca_client.py: real Zerodha data instead of
yfinance's frequently-throttled/delayed feed. US/other symbols are
unaffected — this only ever activates for .NS/.BO symbols.

Needs KITE_API_KEY set (app-level, static) plus a live access_token — that
part is NOT static, it's refreshed daily by core/kite_auth.py's scheduled
job and read from Supabase here, not from an env var.
"""
import json
import logging
import os
from datetime import datetime, timedelta, time as dtime
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
TOKEN_CACHE_FILE = DATA_DIR / "kite_instrument_tokens.json"
UNIVERSE_CACHE_FILE = DATA_DIR / "kite_full_universe.json"
UNIVERSE_CACHE_TTL_HOURS = 24 * 7  # instrument list changes rarely (new listings/delistings)

SUPA_URL = os.getenv("SUPABASE_URL", "")
SRVC_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_kite_client = None
_cached_access_token: str | None = None


def reset_client() -> None:
    """Force re-init on next call — used by kite_auth after a token refresh."""
    global _kite_client, _cached_access_token
    _kite_client = None
    _cached_access_token = None


def has_kite_keys() -> bool:
    return bool(os.getenv("KITE_API_KEY", "").strip())


def is_india_equity_symbol(symbol: str) -> bool:
    return symbol.endswith(".NS") or symbol.endswith(".BO")


def _get_access_token() -> str | None:
    global _cached_access_token
    if _cached_access_token:
        return _cached_access_token
    if not SUPA_URL or not SRVC_KEY:
        return None
    try:
        import requests
        r = requests.get(
            f"{SUPA_URL}/rest/v1/kite_session?id=eq.1&select=access_token",
            headers={"apikey": SRVC_KEY, "Authorization": f"Bearer {SRVC_KEY}"},
            timeout=10,
        )
        if r.ok and r.json():
            _cached_access_token = r.json()[0].get("access_token")
            return _cached_access_token
    except Exception as e:
        logger.warning("kite_client: failed to fetch access token — %s", e)
    return None


def _get_kite():
    global _kite_client
    if _kite_client:
        return _kite_client
    api_key = os.getenv("KITE_API_KEY", "").strip()
    access_token = _get_access_token()
    if not api_key or not access_token:
        return None
    try:
        from kiteconnect import KiteConnect
        k = KiteConnect(api_key=api_key)
        k.set_access_token(access_token)
        _kite_client = k
        return k
    except Exception as e:
        logger.warning("kite_client: init failed — %s", e)
        return None


# ── Instrument token cache (NSE trading symbol -> numeric token Kite's
# historical API requires) — non-secret, disk-cached 24h, same pattern as
# the original script. Container-ephemeral is fine; worst case is one
# extra kite.ltp() call to rebuild it after a restart.

def _load_token_cache() -> dict:
    if TOKEN_CACHE_FILE.exists():
        try:
            data = json.loads(TOKEN_CACHE_FILE.read_text())
            if datetime.fromisoformat(data.get("_ts", "2000-01-01")) > datetime.now() - timedelta(hours=24):
                return data
        except Exception:
            pass
    return {}


def _save_token_cache(cache: dict) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    cache["_ts"] = datetime.now().isoformat()
    TOKEN_CACHE_FILE.write_text(json.dumps(cache, indent=2))


_EXCHANGE_PREFIX = {"NS": "NSE", "BO": "BSE"}


def _strip_suffix(symbol: str) -> str:
    return symbol[:-3] if symbol.endswith(".NS") or symbol.endswith(".BO") else symbol


def _get_instrument_tokens(symbols: list[str]) -> dict[str, int]:
    """
    symbols carry the .NS/.BO suffix — cache is keyed on the suffixed
    symbol (not the bare trading symbol) so an NSE and a BSE listing that
    share the same trading symbol never collide, and the correct exchange
    prefix is queried for each (previously hardcoded to "NSE:", which
    silently failed to resolve any BSE-only symbol — undetected before
    since the only caller was the NSE-only curated universe).
    """
    cache = _load_token_cache()
    missing = [s for s in symbols if s not in cache]
    if missing:
        kite = _get_kite()
        if kite:
            try:
                by_exchange: dict[str, list[str]] = {}
                for s in missing:
                    suffix = s.rsplit(".", 1)[-1] if "." in s else "NS"
                    by_exchange.setdefault(_EXCHANGE_PREFIX.get(suffix, "NSE"), []).append(s)
                for exch, syms in by_exchange.items():
                    query = [f"{exch}:{_strip_suffix(s)}" for s in syms]
                    ltp = kite.ltp(query)
                    for key, val in ltp.items():
                        tsym = key.split(":", 1)[1]
                        matched = next((s for s in syms if _strip_suffix(s) == tsym), None)
                        if matched:
                            cache[matched] = val["instrument_token"]
                _save_token_cache(cache)
            except Exception as e:
                logger.warning("kite_client: instrument token fetch failed — %s", e)
    return {s: cache[s] for s in symbols if s in cache and s != "_ts"}


def fetch_full_market_universe() -> list[dict] | None:
    """
    Full NSE+BSE equity list via Kite's instruments dump (~4000+ tradeable
    stocks) — disk-cached 7 days since listings/delistings are rare. Returns
    None if Kite isn't configured/logged in, so the caller can skip the
    full-market scan for that run rather than fall back to yfinance for
    thousands of symbols one at a time.
    """
    if UNIVERSE_CACHE_FILE.exists():
        try:
            data = json.loads(UNIVERSE_CACHE_FILE.read_text())
            if datetime.fromisoformat(data["_ts"]) > datetime.now() - timedelta(hours=UNIVERSE_CACHE_TTL_HOURS):
                return data["stocks"]
        except Exception:
            pass

    kite = _get_kite()
    if not kite:
        return None
    try:
        seen: dict[str, dict] = {}
        for exchange in ("NSE", "BSE"):
            for inst in kite.instruments(exchange):
                if inst.get("instrument_type") != "EQ":
                    continue
                tsym = inst.get("tradingsymbol", "")
                if not tsym or "-RE" in tsym:
                    continue
                if tsym in seen and seen[tsym]["exchange"] == "NSE":
                    continue  # prefer the NSE listing when a stock trades on both
                seen[tsym] = {
                    "symbol": f"{tsym}.{'NS' if exchange == 'NSE' else 'BO'}",
                    "name": inst.get("name") or tsym,
                    "exchange": exchange,
                }
        stocks = list(seen.values())
        DATA_DIR.mkdir(exist_ok=True)
        UNIVERSE_CACHE_FILE.write_text(json.dumps({"_ts": datetime.now().isoformat(), "stocks": stocks}))
        return stocks
    except Exception as e:
        logger.warning("kite_client: full universe fetch failed — %s", e)
        return None


def fetch_kite_daily_bars(symbol: str, years: int = 2) -> pd.DataFrame | None:
    """
    Daily OHLCV for one India symbol (e.g. 'RELIANCE.NS'), shaped to match
    yfinance's tk.history() output — drop-in replacement, same as
    alpaca_client.fetch_alpaca_daily_bars for the US side.
    """
    kite = _get_kite()
    if not kite:
        return None
    tokens = _get_instrument_tokens([symbol])
    token = tokens.get(symbol)
    if not token:
        return None
    try:
        to_date = datetime.now()
        from_date = to_date - timedelta(days=years * 365)
        candles = kite.historical_data(token, from_date=from_date.strftime("%Y-%m-%d"), to_date=to_date.strftime("%Y-%m-%d"), interval="day")
        if not candles or len(candles) < 50:
            return None
        df = pd.DataFrame(candles)
        df = df.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date")[["Open", "High", "Low", "Close", "Volume"]]
        # Drop today's partial candle during market hours — partial volume
        # (e.g. 0.04x at 10 AM) throws off volume-ratio gates downstream.
        now_t = datetime.now().time()
        if dtime(9, 15) <= now_t <= dtime(15, 30):
            today_str = datetime.now().strftime("%Y-%m-%d")
            df = df[~df.index.strftime("%Y-%m-%d").str.startswith(today_str)]
        return df
    except Exception as e:
        logger.warning("kite_client: daily bars failed for %s — %s", symbol, e)
        return None


def fetch_kite_close_series(symbol: str, days: int = 35) -> pd.Series | None:
    """
    Daily Close series for one symbol — shorter lookback than
    fetch_kite_daily_bars (which pulls years of OHLCV), used by
    full_market_scan.py's per-symbol pass over ~4000 stocks where fetching
    2 years of full OHLCV per symbol would be unnecessarily heavy.
    """
    kite = _get_kite()
    if not kite:
        return None
    tokens = _get_instrument_tokens([symbol])
    token = tokens.get(symbol)
    if not token:
        return None
    try:
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)
        candles = kite.historical_data(token, from_date=from_date.strftime("%Y-%m-%d"), to_date=to_date.strftime("%Y-%m-%d"), interval="day")
        if not candles:
            return None
        df = pd.DataFrame(candles)
        df["date"] = pd.to_datetime(df["date"])
        return df.set_index("date")["close"]
    except Exception as e:
        logger.debug("kite_client: close series failed for %s — %s", symbol, e)
        return None


def fetch_kite_daily_closes_batch(symbols: list[str], days: int = 35) -> pd.DataFrame | None:
    """
    Wide-format Close price DataFrame (columns=symbols incl. .NS/.BO suffix,
    index=date) for a batch — shaped to match what swing_scan.py extracts
    from yf.download(batch)["Close"]. Returns None on any failure so the
    caller falls back to yfinance for this batch, same contract as Alpaca's
    batch fetch on the US side.
    """
    kite = _get_kite()
    if not kite or not symbols:
        return None
    tokens = _get_instrument_tokens(symbols)
    if not tokens:
        return None
    try:
        series = {}
        for orig in symbols:
            token = tokens.get(orig)
            if not token:
                continue
            to_date = datetime.now()
            from_date = to_date - timedelta(days=days)
            candles = kite.historical_data(token, from_date=from_date.strftime("%Y-%m-%d"), to_date=to_date.strftime("%Y-%m-%d"), interval="day")
            if not candles:
                continue
            df = pd.DataFrame(candles)
            df["date"] = pd.to_datetime(df["date"])
            series[orig] = df.set_index("date")["close"]
        if not series:
            return None
        return pd.DataFrame(series)
    except Exception as e:
        logger.warning("kite_client: batch closes failed for %d symbols — %s", len(symbols), e)
        return None
