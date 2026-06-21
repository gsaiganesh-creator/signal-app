from fastapi import APIRouter
import yfinance as yf
from core import cache

router = APIRouter(prefix="/market", tags=["market"])

_INDICES = {
    "NIFTY50":   "^NSEI",
    "SENSEX":    "^BSESN",
    "BANKNIFTY": "^NSEBANK",
    "NIFTYIT":   "^CNXIT",
    "NIFTYMID":  "^NSMIDCP",
    "GIFTNIFTY": "GNF1!",
}

_GLOBAL = {
    "SPX500":  "^GSPC",
    "NASDAQ":  "^IXIC",
    "DOW":     "^DJI",
    "NIKKEI":  "^N225",
    "HKSENG":  "^HSI",
    "GOLD":    "GC=F",
    "CRUDE":   "CL=F",
    "DXY":     "DX-Y.NYB",
    "USDINR":  "INR=X",
}


def _fetch_quote(ticker_map: dict) -> list[dict]:
    out = []
    for name, sym in ticker_map.items():
        try:
            tk = yf.Ticker(sym)
            hist = tk.history(period="2d", interval="1d")
            if len(hist) < 2:
                continue
            curr = float(hist["Close"].iloc[-1])
            prev = float(hist["Close"].iloc[-2])
            chg = round((curr - prev) / prev * 100, 2)
            out.append({"name": name, "symbol": sym, "price": round(curr, 2), "change_pct": chg})
        except Exception:
            pass
    return out


@router.get("/indices")
def indices():
    cached = cache.get("indices", 900)
    if cached:
        return {"indices": cached, "cached": True}
    data = _fetch_quote(_INDICES)
    cache.set("indices", data)
    return {"indices": data, "cached": False}


@router.get("/global")
def global_cues():
    cached = cache.get("global_cues", 900)
    if cached:
        return {"data": cached, "cached": True}
    data = _fetch_quote(_GLOBAL)
    cache.set("global_cues", data)
    return {"data": data, "cached": False}


@router.get("/regime")
def market_regime():
    from core.sentiment import get_market_mood
    mood = get_market_mood()
    cached_idx = cache.get("indices", 900) or []
    nifty = next((x for x in cached_idx if x["name"] == "NIFTY50"), None)
    if not nifty:
        idxdata = _fetch_quote({"NIFTY50": "^NSEI"})
        nifty = idxdata[0] if idxdata else {"change_pct": 0}
    trend = "BULLISH" if nifty["change_pct"] > 0.3 else ("BEARISH" if nifty["change_pct"] < -0.3 else "SIDEWAYS")
    return {
        "regime": trend,
        "nifty_change": nifty.get("change_pct", 0),
        "sentiment": mood["label"],
        "sentiment_score": mood["overall"],
    }
