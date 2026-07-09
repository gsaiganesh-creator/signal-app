"""Daily scan_log writer — ports the exact scan/scoring formula from
apps/web/lib/india-scan.ts (the same 100-stock India momentum scan the Signals
page runs client-side) so scan_log gets populated on a schedule instead of
depending on someone visiting /dashboard/signals (dashboard/signals/page.tsx's
logScansAsync only fires client-side on page load — low traffic meant
scan_log barely grew, and Track Record's Zone Accuracy / RL Analysis /
Methodology numbers looked frozen).

Runs in this scheduler (not a Vercel cron) per the project rule: all recurring
jobs live in this Python scheduler, never Vercel crons. See CLAUDE.md.

Kept as a numeric port of india-scan.ts rather than reusing core/technical.py's
different RSI/EMA formula, so scan_log stays consistent with what a live
visitor to the Signals page would actually see for the same symbol/day.
"""
import logging
from datetime import datetime, timezone

import yfinance as yf

from core.supabase_rest import rest_post

logger = logging.getLogger(__name__)

# Same 100-stock universe as apps/web/lib/india-scan.ts UNIVERSE — keep in sync
# if that list changes.
_UNIVERSE = [
    "HAL.NS", "BEL.NS", "BDL.NS", "COCHINSHIP.NS",
    "DIXON.NS", "KAYNES.NS", "SYRMA.NS", "AVALON.NS",
    "TATACOMM.NS", "ROUTE.NS", "TANLA.NS", "STLTECH.NS",
    "RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS",
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS",
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "CHOLAFIN.NS", "MUTHOOTFIN.NS",
    "NTPC.NS", "POWERGRID.NS", "TATAPOWER.NS", "RECLTD.NS",
    "BHEL.NS", "ABB.NS", "SIEMENS.NS", "CUMMINSIND.NS",
    "MARUTI.NS", "M&M.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS",
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "NATIONALUM.NS",
    "LT.NS", "ULTRACEMCO.NS", "AMBUJACEM.NS", "ACC.NS",
    "HINDUNILVR.NS", "ITC.NS", "DABUR.NS", "MARICO.NS",
    "SRF.NS", "DEEPAKNTR.NS", "AARTIIND.NS", "NAVINFLUOR.NS",
    "ASIANPAINT.NS", "BERGEPAINT.NS", "KANSAINER.NS", "AKZOINDIA.NS",
    "APOLLOHOSP.NS", "FORTIS.NS", "MAXHEALTH.NS", "NH.NS",
    "DLF.NS", "GODREJPROP.NS", "OBEROIRLTY.NS", "LODHA.NS",
    "INDIGO.NS", "BLUEDART.NS", "CONCOR.NS", "DELHIVERY.NS",
    "DMART.NS", "TRENT.NS", "METROBRAND.NS", "VMART.NS",
    "HAVELLS.NS", "VOLTAS.NS", "BLUESTAR.NS", "CROMPTON.NS",
    "ADANIGREEN.NS", "SUZLON.NS", "INOXWIND.NS", "SWSOLAR.NS",
    "HDFCAMC.NS", "UTIAMC.NS", "NAM-INDIA.NS", "NUVAMA.NS",
    "PAGEIND.NS", "KPRMILL.NS", "WELENT.NS", "ARVIND.NS",
    "UPL.NS", "COROMANDEL.NS", "CHAMBLFERT.NS", "DEEPAKFERT.NS",
    "SUNTV.NS", "ZEEL.NS", "PVRINOX.NS", "SAREGAMA.NS",
    "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS",
]

_LIMIT = 20  # matches limit=20 the Signals page fetches client-side


def _calc_ema(closes: list[float], period: int) -> float:
    if len(closes) < period:
        return closes[-1] if closes else 0.0
    k = 2 / (period + 1)
    val = sum(closes[:period]) / period
    for c in closes[period:]:
        val = c * k + val * (1 - k)
    return val


def _calc_rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    ch = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    g = sum(max(0, x) for x in ch[:period]) / period
    l = sum(max(0, -x) for x in ch[:period]) / period
    for x in ch[period:]:
        g = (g * (period - 1) + max(0, x)) / period
        l = (l * (period - 1) + max(0, -x)) / period
    return 100.0 if l == 0 else 100 - 100 / (1 + g / l)


def _zone(rsi: float, chg: float, confidence: int) -> str:
    """Mirrors scoreSig/ZONE_FROM_CAT in lib/india-scan.ts."""
    if rsi > 72 and chg < 0:
        return "Weak / Declining"
    if confidence >= 72:
        return "Strong Momentum"
    if confidence >= 58:
        return "Building"
    if rsi > 65:
        return "Sideways"
    return "Building"


def run_scan_log_writer() -> dict:
    results: list[dict] = []
    batch_size = 20
    for i in range(0, len(_UNIVERSE), batch_size):
        batch = _UNIVERSE[i : i + batch_size]
        try:
            raw = yf.download(batch, period="2mo", interval="1d", progress=False, auto_adjust=True)
            if raw.empty:
                continue
            closes_df = raw["Close"] if hasattr(raw.columns, "levels") else raw
            vols_df = raw["Volume"] if hasattr(raw.columns, "levels") else None
            for sym in batch:
                try:
                    if sym not in closes_df.columns:
                        continue
                    s_close = closes_df[sym].dropna()
                    if len(s_close) < 22:
                        continue
                    closes = s_close.tolist()
                    cmp = closes[-1]
                    if cmp < 100:
                        continue
                    prev = closes[-2]
                    chg = (cmp - prev) / prev * 100
                    if chg > 4.0:
                        continue

                    rsi_val = _calc_rsi(closes)
                    if rsi_val is None or rsi_val < 42 or rsi_val > 62:
                        continue

                    ema10 = _calc_ema(closes, 10)
                    ema20 = _calc_ema(closes, 20)
                    ema_dist = (cmp - ema20) / ema20 * 100
                    if ema_dist > 8:
                        continue

                    vol_bonus = 0
                    if vols_df is not None and sym in vols_df.columns:
                        s_vol = vols_df[sym].dropna()
                        if len(s_vol) > 0:
                            avg_vol = float(s_vol.mean())
                            last_vol = float(s_vol.iloc[-1])
                            if avg_vol > 0 and last_vol / avg_vol > 1.5:
                                vol_bonus = 2

                    score = (10 - abs(rsi_val - 52)) + (5 - abs(ema_dist)) + vol_bonus
                    confidence = min(100, round(50 + score * 3))

                    results.append({
                        "symbol": sym.replace(".NS", "").replace(".BO", ""),
                        "cmp": round(cmp, 2),
                        "rsi": round(rsi_val, 1),
                        "chg": round(chg, 2),
                        "confidence": confidence,
                        "score": round(score, 2),
                    })
                except Exception as e:
                    logger.error("scan_log_writer: failed for %s: %s", sym, e)
        except Exception as e:
            logger.error("scan_log_writer: batch fetch failed: %s", e)

    results.sort(key=lambda x: -x["score"])
    top = results[:_LIMIT]

    if not top:
        logger.info("scan_log_writer: no candidates found")
        return {"inserted": 0}

    today = datetime.now(timezone.utc).date().isoformat()
    rows = [
        {
            "scanned_at": today,
            "symbol": p["symbol"],
            "exchange": "NSE",
            "scan_score": _zone(p["rsi"], p["chg"], p["confidence"]),
            "price_at": p["cmp"],
            "rsi14": p["rsi"],
            "confidence": p["confidence"],
        }
        for p in top
    ]

    try:
        rest_post("scan_log", rows, prefer="resolution=merge-duplicates,return=minimal")
    except Exception as e:
        logger.error("scan_log_writer: upsert failed: %s", e)
        return {"inserted": 0, "error": str(e)}

    summary = {"inserted": len(rows), "date": today}
    logger.info("scan_log_writer: %s", summary)
    return summary
