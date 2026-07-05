"""
Swing scan — extracted from twitter-agent/agents/swing_agent.py.
No Twitter/LLM dependencies. Pure yfinance + pandas.
"""
import json
import time
from pathlib import Path

import yfinance as yf

_UNIVERSE = Path(__file__).parent.parent / "config" / "universe.json"


def _calc_rsi(closes, period: int = 14):
    delta = closes.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


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
                    if cmp < 100:
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
                    entry_low = round(min(cmp, support) * 0.99, 1)
                    entry_high = round(cmp * 1.005, 1)
                    sl = round(support * 0.95, 1)
                    target = round(cmp * 1.10, 1)
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
