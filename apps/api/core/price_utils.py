"""Shared price-fetch helper for cron jobs — mirrors the yfinance pattern
already used in core/technical.py."""
import logging

import yfinance as yf

logger = logging.getLogger(__name__)


def yahoo_symbol(symbol: str, exchange: str) -> str:
    if exchange == "BSE":
        return f"{symbol}.BO"
    if exchange in ("NYSE", "NASDAQ"):
        return symbol
    return f"{symbol}.NS"


def fetch_price(symbol: str, exchange: str) -> float | None:
    try:
        tk = yf.Ticker(yahoo_symbol(symbol, exchange))
        hist = tk.history(period="1d")
        if hist.empty:
            return None
        return float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.error("price_utils: fetch failed for %s: %s", symbol, e)
        return None
