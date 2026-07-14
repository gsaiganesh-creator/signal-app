"""
Alpaca historical daily bars for US equities -- real IEX data instead of
yfinance's frequently-throttled/delayed feed. India/BSE stays on yfinance
(Alpaca doesn't cover those markets). Mirrors apps/web/lib/alpaca.ts's
scoping logic on the TS side (which handles live price snapshots; this
module handles the historical bars technical.py/us_scan.py need for
RSI/EMA/MACD, a separate concern from a single current price).

Needs ALPACA_API_KEY_ID + ALPACA_API_SECRET_KEY env vars -- set on this
backend's own host (Railway/Render/etc), NOT the same place as Vercel's
env vars, which only cover the Next.js side.
"""
import logging
import os
import re
from datetime import datetime, timedelta, timezone

import pandas as pd

logger = logging.getLogger(__name__)

# Share-class tickers (e.g. Berkshire's BRK-B) use a dash in this codebase's
# convention (matching yfinance), but Alpaca expects a dot (BRK.B). Only
# translate the class-suffix form specifically -- don't touch dashes
# elsewhere, there aren't any other kinds of US equity symbols here.
_DASH_CLASS_RE = re.compile(r"^([A-Z]+)-([A-Z])$")
_DOT_CLASS_RE = re.compile(r"^([A-Z]+)\.([A-Z])$")


def _to_alpaca_symbol(symbol: str) -> str:
    m = _DASH_CLASS_RE.match(symbol)
    return f"{m.group(1)}.{m.group(2)}" if m else symbol


def _from_alpaca_symbol(symbol: str) -> str:
    m = _DOT_CLASS_RE.match(symbol)
    return f"{m.group(1)}-{m.group(2)}" if m else symbol

_ALPACA_KEY = os.getenv("ALPACA_API_KEY_ID", "")
_ALPACA_SECRET = os.getenv("ALPACA_API_SECRET_KEY", "")

_client = None
if _ALPACA_KEY and _ALPACA_SECRET:
    try:
        from alpaca.data.historical import StockHistoricalDataClient
        _client = StockHistoricalDataClient(_ALPACA_KEY, _ALPACA_SECRET)
    except ImportError:
        logger.warning("alpaca_client: alpaca-py not installed -- US symbols will stay on yfinance")


def has_alpaca_keys() -> bool:
    return _client is not None


def is_us_equity_symbol(symbol: str) -> bool:
    """US equity = no India suffix (.NS/.BO). Mirrors lib/alpaca.ts's isUsEquitySymbol."""
    return not symbol.endswith(".NS") and not symbol.endswith(".BO")


def fetch_alpaca_daily_closes_batch(symbols: list[str], days: int = 35) -> pd.DataFrame | None:
    """
    Wide-format Close price DataFrame (columns=symbols, index=date) for a
    batch of US symbols -- shaped to match what us_scan.py extracts from
    yf.download(batch)["Close"]. Returns None if keys aren't configured or
    the request fails/is empty (caller falls back to yfinance for this batch).
    """
    if _client is None or not symbols:
        return None
    try:
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame

        alpaca_symbols = [_to_alpaca_symbol(s) for s in symbols]
        req = StockBarsRequest(
            symbol_or_symbols=alpaca_symbols,
            timeframe=TimeFrame.Day,
            start=datetime.now(timezone.utc) - timedelta(days=days),
            feed="iex",
        )
        bars = _client.get_stock_bars(req)
        df = bars.df
        if df.empty:
            return None
        wide = df["close"].unstack(level="symbol")
        return wide.rename(columns=_from_alpaca_symbol)
    except Exception as e:
        logger.warning("alpaca_client: batch bars fetch failed for %d symbols -- %s", len(symbols), e)
        return None


def fetch_alpaca_daily_bars(symbol: str, years: int = 2) -> pd.DataFrame | None:
    """
    Daily OHLCV bars for one US symbol, shaped to match yfinance's
    tk.history() output exactly (capitalized Open/High/Low/Close/Volume
    columns, plain DatetimeIndex, no symbol level) -- a drop-in replacement
    for the yfinance DataFrame technical.py's downstream code expects.
    Returns None if keys aren't configured or the request fails/empty.
    """
    if _client is None:
        return None
    try:
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame

        alpaca_symbol = _to_alpaca_symbol(symbol)
        req = StockBarsRequest(
            symbol_or_symbols=alpaca_symbol,
            timeframe=TimeFrame.Day,
            start=datetime.now(timezone.utc) - timedelta(days=years * 365),
            feed="iex",
        )
        bars = _client.get_stock_bars(req)
        df = bars.df
        if df.empty:
            return None
        # MultiIndex (symbol, timestamp) -> plain DatetimeIndex for this one symbol
        if isinstance(df.index, pd.MultiIndex):
            df = df.xs(alpaca_symbol, level="symbol")
        df = df.rename(columns={
            "open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume",
        })[["Open", "High", "Low", "Close", "Volume"]]
        return df
    except Exception as e:
        logger.warning("alpaca_client: failed to fetch bars for %s -- %s", symbol, e)
        return None
