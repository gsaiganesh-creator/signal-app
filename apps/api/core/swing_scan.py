"""
Swing scan — extracted from twitter-agent/agents/swing_agent.py.
No Twitter/LLM dependencies. Pure yfinance + pandas.
"""
import json
import time
from pathlib import Path

import yfinance as yf

from core.kite_client import fetch_kite_daily_closes_batch
from core.scan_scoring import score_symbol

_UNIVERSE = Path(__file__).parent.parent / "config" / "universe.json"


def run_swing_scan(max_picks: int = 10) -> list[dict]:
    """
    RSI 42–62, price near EMA, price >₹100.
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
            closes = fetch_kite_daily_closes_batch(batch, days=35)  # None if keys/session unset/failed -- falls through to yfinance
            if closes is None:
                raw = yf.download(batch, period="1mo", interval="1d", progress=False, auto_adjust=True)
                if raw.empty:
                    continue
                closes = raw["Close"] if hasattr(raw.columns, "levels") else raw
            for sym in batch:
                try:
                    if sym not in closes.columns:
                        continue
                    pick = score_symbol(sym, closes[sym], name=name_map.get(sym, sym), sector=sector_map.get(sym, ""))
                    if pick:
                        results.append(pick)
                except Exception:
                    pass
        except Exception:
            pass
        time.sleep(0.3)

    results.sort(key=lambda x: -x["score"])
    return results[:max_picks]


def run_morning_scan(max_picks: int = 20) -> None:
    """Runs full swing scan and saves candidates to Supabase daily_signals."""
    import logging
    from datetime import date
    from core.supabase_client import upsert_signals

    logger = logging.getLogger(__name__)
    logger.info("morning_scan: starting full TA scan")

    picks = run_swing_scan(max_picks=max_picks)
    if not picks:
        logger.warning("morning_scan: no candidates found")
        return

    today = date.today().isoformat()
    rows = [
        {
            "date": today,
            "symbol": p["symbol"],
            "name": p["name"],
            "sector": p["sector"],
            "cmp": p["cmp"],
            "rsi": p["rsi"],
            "ema20": p["ema20"],
            "entry_low": p["entry_low"],
            "entry_high": p["entry_high"],
            "target": p["target"],
            "sl": p["sl"],
            "confidence": p["confidence"],
            "score": p["score"],
            "status": "WATCHING",
        }
        for p in picks
    ]

    upsert_signals(rows)
    logger.info("morning_scan: saved %d candidates to Supabase", len(rows))
