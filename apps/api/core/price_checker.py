import logging
import yfinance as yf
from core.supabase_client import get_active_signals, mark_triggered

logger = logging.getLogger(__name__)


def run_intraday_check() -> list[dict]:
    """
    Fetches latest 5-min price for all WATCHING signals.
    Marks as TRIGGERED when price enters the entry zone.
    Returns list of newly triggered signal dicts.
    """
    signals = get_active_signals()
    if not signals:
        logger.info("intraday_check: no active signals today")
        return []

    symbols = [s["symbol"] for s in signals]
    logger.info("intraday_check: checking %d symbols", len(symbols))

    try:
        raw = yf.download(
            symbols,
            period="1d",
            interval="5m",
            progress=False,
            auto_adjust=True,
        )
    except Exception as e:
        logger.error("intraday_check: yfinance download failed: %s", e)
        return []

    if raw.empty:
        logger.warning("intraday_check: yfinance returned empty data")
        return []

    # handle single vs multi ticker response
    if hasattr(raw.columns, "levels"):
        closes = raw["Close"]
    else:
        closes = raw[["Close"]]
        closes.columns = symbols

    triggered = []
    for sig in signals:
        sym = sig["symbol"]
        try:
            if sym not in closes.columns:
                continue
            series = closes[sym].dropna()
            if series.empty:
                continue
            price = float(series.iloc[-1])
            if sig["entry_low"] <= price <= sig["entry_high"]:
                mark_triggered(sig["id"], sym, price)
                triggered.append({**sig, "triggered_price": price})
                logger.info("TRIGGERED: %s @ %.2f", sym, price)
        except Exception as e:
            logger.error("intraday_check: error processing %s: %s", sym, e)

    return triggered
