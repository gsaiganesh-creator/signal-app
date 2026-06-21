from fastapi import APIRouter, Query, HTTPException
from core.swing_scan import run_swing_scan
from core.technical import get_technical_analysis
from core import cache

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


@router.get("/{ticker}")
def get_signal(ticker: str):
    sym = ticker.upper()
    if not sym.endswith(".NS"):
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
