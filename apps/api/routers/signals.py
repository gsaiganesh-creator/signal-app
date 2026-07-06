from fastapi import APIRouter, Query, HTTPException
from core.swing_scan import run_swing_scan
from core.technical import get_technical_analysis
from core import cache
import json
from pathlib import Path

_US_UNIVERSE_SYMBOLS = {
    s["symbol"]
    for items in json.loads((Path(__file__).parent.parent / "config" / "us_universe.json").read_text())["sectors"].values()
    for s in items
}

router = APIRouter(prefix="/signals", tags=["signals"])

_SCAN_TTL = 3600    # 1 hour — scan is heavy
_TICKER_TTL = 900   # 15 min per ticker


@router.get("")
def list_signals(limit: int = Query(default=10, ge=1, le=50)):
    cached = cache.get("swing_scan", _SCAN_TTL)
    if cached is not None:
        return {"signals": cached[:limit], "count": len(cached[:limit]), "cached": True}

    picks = run_swing_scan(max_picks=20)
    cache.set("swing_scan", picks)
    return {"signals": picks[:limit], "count": len(picks[:limit]), "cached": False}


@router.get("/us")
def list_us_signals(limit: int = Query(default=10, ge=1, le=50)):
    cached = cache.get("us_swing_scan", _SCAN_TTL)
    if cached is not None:
        return {"signals": cached[:limit], "count": len(cached[:limit]), "cached": True}

    from core.us_scan import run_us_swing_scan
    picks = run_us_swing_scan(max_picks=20)
    cache.set("us_swing_scan", picks)
    return {"signals": picks[:limit], "count": len(picks[:limit]), "cached": False}


@router.get("/{ticker}")
def get_signal(ticker: str):
    sym = ticker.upper()
    if sym not in _US_UNIVERSE_SYMBOLS and not sym.endswith(".NS"):
        sym += ".NS"

    key = f"ticker_{sym}"
    cached = cache.get(key, _TICKER_TTL)
    if cached is not None:
        return {**cached, "cached": True}

    data = get_technical_analysis(sym)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data for {sym}")

    cache.set(key, data)
    return {**data, "cached": False}
