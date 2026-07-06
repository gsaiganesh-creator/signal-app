"""
US swing scan — mirrors core/swing_scan.py's logic and structure, applied
to the US monitored universe (config/us_universe.json) instead of India's.
"""
import json
import logging
import time
from pathlib import Path

import yfinance as yf

logger = logging.getLogger(__name__)

_UNIVERSE = Path(__file__).parent.parent / "config" / "us_universe.json"


def _calc_rsi(closes, period: int = 14):
    delta = closes.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def run_us_swing_scan(max_picks: int = 10) -> list[dict]:
    """
    RSI 42-62, price near EMA20, price > $20 (a curated large-cap universe
    won't have penny stocks — this just filters any unusually low-priced
    name, not a literal currency-mismatched copy of India's >Rs100 filter).
    Returns picks sorted by score descending.
    """
    universe = json.loads(_UNIVERSE.read_text())
    stocks: list[dict] = []
    for sector, items in universe["sectors"].items():
        for s in items:
            s = dict(s)
            s["sector"] = sector
            stocks.append(s)

    symbols = [s["symbol"] for s in stocks]
    name_map = {s["symbol"]: s["name"] for s in stocks}
    sector_map = {s["symbol"]: s["sector"] for s in stocks}

    results = []
    batch_size = 40
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i : i + batch_size]
        try:
            raw = yf.download(batch, period="1mo", interval="1d", progress=False, auto_adjust=True)
            if raw.empty:
                continue
            closes = raw["Close"] if hasattr(raw.columns, "levels") else raw
            for sym in batch:
                try:
                    if sym not in closes.columns:
                        continue
                    s_close = closes[sym].dropna()
                    if len(s_close) < 21:
                        continue
                    cmp = float(s_close.iloc[-1])
                    prev = float(s_close.iloc[-2])
                    if cmp < 20:
                        continue
                    intraday_chg = (cmp - prev) / prev * 100
                    if intraday_chg > 3.0:
                        continue
                    rsi = float(_calc_rsi(s_close).iloc[-1])
                    if not (42 <= rsi <= 62):
                        continue
                    ema10 = float(s_close.ewm(span=10).mean().iloc[-1])
                    ema20 = float(s_close.ewm(span=20).mean().iloc[-1])
                    ema_dist = (cmp - ema20) / ema20 * 100
                    if ema_dist > 8:
                        continue
                    support = max(ema10, ema20) if cmp > max(ema10, ema20) else min(ema10, ema20)
                    entry_low = round(min(cmp, support) * 0.99, 2)
                    entry_high = round(cmp * 1.005, 2)
                    sl = round(support * 0.95, 2)
                    target = round(cmp * 1.10, 2)
                    score = (10 - abs(rsi - 52)) + (5 - abs(ema_dist))
                    results.append({
                        "symbol": sym,
                        "name": name_map.get(sym, sym),
                        "sector": sector_map.get(sym, ""),
                        "cmp": round(cmp, 2),
                        "chg": round(intraday_chg, 2),
                        "rsi": round(rsi, 1),
                        "ema20": round(ema20, 2),
                        "ema_dist_pct": round(ema_dist, 1),
                        "entry_low": entry_low,
                        "entry_high": entry_high,
                        "target": target,
                        "sl": sl,
                        "signal": "BUY",
                        "confidence": min(100, int(50 + score * 3)),
                        "score": round(score, 2),
                    })
                except Exception as e:
                    logger.debug("us_scan: skipping %s — %s", sym, e)
        except Exception as e:
            logger.warning("us_scan: batch %d-%d failed — %s", i, i + batch_size, e)
        time.sleep(0.3)

    results.sort(key=lambda x: -x["score"])
    return results[:max_picks]


def run_us_morning_scan(max_picks: int = 20) -> None:
    """Runs the US swing scan and saves candidates to Supabase us_daily_signals."""
    import logging
    from datetime import date
    from core.supabase_client import upsert_us_signals

    logger = logging.getLogger(__name__)
    logger.info("us_morning_scan: starting full US TA scan")

    picks = run_us_swing_scan(max_picks=max_picks)
    if not picks:
        logger.warning("us_morning_scan: no candidates found")
        return

    today = date.today().isoformat()
    rows = [
        {
            "scanned_at": today,
            "symbol": p["symbol"],
            "name": p["name"],
            "sector": p["sector"],
            "cmp": p["cmp"],
            "chg": p["chg"],
            "rsi": p["rsi"],
            "ema20": p["ema20"],
            "ema_dist_pct": p["ema_dist_pct"],
            "entry_low": p["entry_low"],
            "entry_high": p["entry_high"],
            "target": p["target"],
            "sl": p["sl"],
            "signal": p["signal"],
            "confidence": p["confidence"],
            "score": p["score"],
        }
        for p in picks
    ]

    upsert_us_signals(rows)
    logger.info("us_morning_scan: saved %d candidates to Supabase", len(rows))
