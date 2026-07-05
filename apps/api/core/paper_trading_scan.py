"""Paper trading auto-scanner — ported from the Next.js route that implemented
this before the move to this Python scheduler. Two jobs per run:
  1. Auto-EXIT open trades that hit SL or target
  2. Auto-ENTER new trades where a stock matches a strategy's signal
"""
import logging
from datetime import datetime, timezone

from core.supabase_rest import rest_get, rest_patch, rest_post
from core.technical import get_technical_analysis

logger = logging.getLogger(__name__)

# 30-stock NSE universe scanned every morning — same list as the TS original
NSE_UNIVERSE = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "SBIN", "BHARTIARTL", "WIPRO", "KOTAKBANK", "ITC",
    "LT", "ASIANPAINT", "MARUTI", "TITAN", "BAJFINANCE",
    "HCLTECH", "SUNPHARMA", "NESTLEIND", "POWERGRID", "ONGC",
    "ADANIPORTS", "AXISBANK", "BAJAJFINSV", "BPCL", "BRITANNIA",
    "CIPLA", "DRREDDY", "EICHERMOT", "TMPV", "ETERNAL",
]


def _matches_entry(d: dict, s: dict) -> bool:
    """Entry signal logic per algo type — ported 1:1 from the TS switch statement."""
    price = d["price"]
    rsi14 = d.get("rsi")
    ema20 = d.get("ema20") or 0
    ema50 = d.get("ema50") or 0
    ema200 = d.get("ema200") or 0
    macd = d.get("macd") or 0
    bb_pct = d.get("bb_pct")
    if bb_pct is None:
        bb_pct = 1
    from_52h = d.get("pct_from_52h")
    if from_52h is None:
        from_52h = -100
    vol_ratio = d.get("vol_ratio") or 0

    rsi_ok = rsi14 is not None and s["rsi_low"] <= rsi14 <= s["rsi_high"]
    algo = s["algo_type"]

    if algo == "rsi_ema":
        return rsi_ok and price > ema20
    if algo == "dual_ema":
        return ema20 > ema50 and price > ema50 and rsi_ok
    if algo == "mean_rev":
        return rsi14 is not None and rsi14 < 38 and bb_pct < 0.25
    if algo == "vwap":
        return rsi_ok and macd > 0
    if algo == "sector_rot":
        return rsi_ok and price > ema200 and macd > 0
    if algo == "breakout":
        return rsi14 is not None and rsi14 > 50 and from_52h > -8 and vol_ratio > 1.3
    if algo == "custom_ema20":
        return rsi_ok and price > ema20
    if algo == "custom_ema50":
        return rsi_ok and price > ema50
    if algo == "custom_ema200":
        return rsi_ok and price > ema200
    return rsi_ok  # custom_none or unknown


def run_paper_trading_scan() -> dict:
    strategies = rest_get("paper_strategies", {
        "select": "id,user_id,name,algo_type,capital,rsi_low,rsi_high,sl_pct,target_pct",
        "active": "eq.true",
    })
    if not strategies:
        return {"ok": True, "message": "No active strategies", "scanned": 0}

    open_trades = rest_get("paper_trades", {
        "select": "id,strategy_id,symbol,signal,entry_price,qty,status",
        "status": "eq.OPEN",
    })

    # ── Fetch technicals for the whole universe ──────────────────────────────
    stock_map: dict[str, dict] = {}
    for sym in NSE_UNIVERSE:
        detail = get_technical_analysis(f"{sym}.NS")
        if detail and detail.get("price"):
            stock_map[sym] = detail

    # ── Auto-EXIT: close trades that hit SL or target ────────────────────────
    strategy_by_id = {s["id"]: s for s in strategies}
    exited = 0
    for trade in open_trades:
        detail = stock_map.get(trade["symbol"])
        if not detail:
            continue
        strategy = strategy_by_id.get(trade["strategy_id"])
        if not strategy:
            continue

        price = detail["price"]
        is_buy = trade["signal"] == "BUY"
        sl_price = trade["entry_price"] * (1 - strategy["sl_pct"] / 100)
        tgt_price = trade["entry_price"] * (1 + strategy["target_pct"] / 100)

        hit_sl = price <= sl_price if is_buy else price >= sl_price
        hit_tgt = price >= tgt_price if is_buy else price <= tgt_price

        if hit_sl or hit_tgt:
            pl = (price - trade["entry_price"]) * trade["qty"] * (1 if is_buy else -1)
            try:
                rest_patch("paper_trades", {"id": f"eq.{trade['id']}"}, {
                    "exit_price": round(price, 2),
                    "exit_at": datetime.now(timezone.utc).isoformat(),
                    "pl": round(pl, 2),
                    "status": "WIN" if hit_tgt else "LOSS",
                })
                exited += 1
            except Exception as e:
                logger.error("paper_trading_scan: exit failed for trade %s: %s", trade["id"], e)

    # ── Auto-ENTER: find new signals, skip already-open symbols ──────────────
    entered = 0
    entries: list[str] = []
    for strategy in strategies:
        already_open = {
            t["symbol"] for t in open_trades if t["strategy_id"] == strategy["id"]
        }
        for sym, detail in stock_map.items():
            if sym in already_open:
                continue
            if not _matches_entry(detail, strategy):
                continue

            qty = max(1, int((strategy["capital"] * 0.05) / detail["price"]))
            entries.append(f"{strategy['name']} -> {sym} @ Rs.{detail['price']}")
            try:
                rest_post("paper_trades", {
                    "strategy_id": strategy["id"],
                    "user_id": strategy["user_id"],
                    "symbol": sym,
                    "signal": "BUY",
                    "entry_price": round(detail["price"], 2),
                    "qty": qty,
                    "status": "OPEN",
                    "entry_at": datetime.now(timezone.utc).isoformat(),
                })
                entered += 1
            except Exception as e:
                logger.error("paper_trading_scan: entry failed for %s/%s: %s", strategy["id"], sym, e)

    summary = {
        "ok": True,
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "scanned": len(stock_map),
        "strategies": len(strategies),
        "exited": exited,
        "entered": entered,
        "entries": entries,
    }
    logger.info("paper_trading_scan: %s", summary)
    return summary
