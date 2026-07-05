"""Shared price-fetch helper for cron jobs — mirrors the yfinance pattern
already used in core/technical.py."""
import logging
from concurrent.futures import ThreadPoolExecutor

import yfinance as yf

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 10


def yahoo_symbol(symbol: str, exchange: str) -> str:
    if exchange == "BSE":
        return f"{symbol}.BO"
    if exchange in ("NYSE", "NASDAQ"):
        return symbol
    return f"{symbol}.NS"


def _fetch(symbol: str, exchange: str) -> float | None:
    tk = yf.Ticker(yahoo_symbol(symbol, exchange))
    hist = tk.history(period="1d")
    if hist.empty:
        return None
    return float(hist["Close"].iloc[-1])


def fetch_price(symbol: str, exchange: str) -> float | None:
    """Bounded to _TIMEOUT_SECONDS — cron jobs call this in tight loops over
    many symbols, so one hung network call must not stall the whole run."""
    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(_fetch, symbol, exchange).result(timeout=_TIMEOUT_SECONDS)
    except Exception as e:
        logger.error("price_utils: fetch failed for %s: %s", symbol, e)
        return None
