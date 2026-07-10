"""Pre-warms the signal_cache table (India NSE/BSE only) so the portfolio page's
ml_class always has real data to render from, instead of relying on some user
happening to have the page open during market hours to trigger the client-side
live fetch (dashboard/portfolio/page.tsx enrichHoldings Step 3, gated behind
isMarketOpen()). Runs independently of any user session, right after market
open and again after close. Also computes a 'Momentum Scan' verdict (EMA/RSI/
MACD priority cascade, mirrors the TS logic in
apps/web/app/api/stock-detail/route.ts) into the same row's 'signal' column,
so both technical read-outs are available from a single cached fetch."""
import logging
import time
from datetime import datetime, timezone

from core.supabase_rest import rest_get, rest_post
from core.technical import get_technical_analysis

logger = logging.getLogger(__name__)

_MAX_SYMBOLS = 300
_SUFFIX = {"NSE": ".NS", "BSE": ".BO"}


def _momentum_signal(price: float | None, ema200: float | None, ema50: float | None,
                      rsi: float | None, macd: float | None) -> str:
    """Mirrors apps/web/app/api/stock-detail/route.ts's signal-priority chain
    (EMA200 position -> EMA50 position -> RSI extreme -> MACD sign, first
    match wins) so the "Momentum Scan" badge reflects the same read a user
    already sees on the Signals page's "My Portfolio" mode — collapsed to a
    clean BUY/SELL/HOLD verdict instead of that endpoint's full sentence, so
    it renders consistently next to the Technical Bias badge (BULLISH/
    BEARISH/NEUTRAL). Keep this in sync if the TS priority chain changes."""
    if price and ema200:
        return "BUY" if price >= ema200 else "SELL"
    if price and ema50:
        return "BUY" if price >= ema50 else "SELL"
    if rsi is not None:
        if rsi < 35:
            return "BUY"
        if rsi > 70:
            return "SELL"
    if macd is not None:
        return "BUY" if macd > 0 else "SELL"
    return "HOLD"


def _india_symbols() -> list[dict]:
    holdings = rest_get("holdings", {"select": "symbol,exchange", "exchange": "in.(NSE,BSE)"})
    watchlist = rest_get("watchlist", {"select": "symbol,exchange", "exchange": "in.(NSE,BSE)"})

    counts: dict[str, dict] = {}
    for row in holdings + watchlist:
        key = f"{row['symbol']}:{row['exchange']}"
        if key in counts:
            counts[key]["count"] += 1
        else:
            counts[key] = {"symbol": row["symbol"], "exchange": row["exchange"], "count": 1}

    return sorted(counts.values(), key=lambda r: -r["count"])[:_MAX_SYMBOLS]


def run_signal_cache_prewarm() -> dict:
    candidates = _india_symbols()
    updated = failed = 0
    now = datetime.now(timezone.utc).isoformat()

    for row in candidates:
        symbol, exchange = row["symbol"], row["exchange"]
        suffix = _SUFFIX.get(exchange, "")
        try:
            result = get_technical_analysis(f"{symbol}{suffix}", name=symbol)
            if not result:
                failed += 1
                continue
            momentum = _momentum_signal(
                result.get("price"), result.get("ema200"), result.get("ema50"),
                result.get("rsi"), result.get("macd"),
            )
            rest_post(
                "signal_cache",
                {
                    "symbol": symbol,
                    "exchange": exchange,
                    "bias": result["bias"],
                    "signal": momentum,
                    "rsi14": result["rsi"],
                    "ml_class": None,
                    "price": result["price"],
                    "change_pct": result["change_pct"],
                    "fetched_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
            updated += 1
        except Exception as e:
            logger.error("signal_cache_prewarm: failed for %s.%s: %s", symbol, exchange, e)
            failed += 1
        time.sleep(0.3)  # yfinance throttle — matches sentiment_scan's pacing

    summary = {"candidates": len(candidates), "updated": updated, "failed": failed}
    logger.info("signal_cache_prewarm: %s", summary)
    return summary
