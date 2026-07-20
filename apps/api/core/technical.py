"""
Technical analysis — extracted from twitter-agent/agents/technical_analyst.py.
Simplified: uses yfinance directly (no price validator scraping).
"""
import logging
from pathlib import Path

import joblib
import yfinance as yf
import pandas as pd
import ta

from ml.features import FEATURE_COLUMNS
from core.alpaca_client import fetch_alpaca_daily_bars, is_us_equity_symbol
from core.kite_client import fetch_kite_daily_bars, is_india_equity_symbol

logger = logging.getLogger(__name__)

_MODEL_PATH = Path(__file__).parent.parent / "ml" / "model.joblib"
try:
    _MODEL = joblib.load(_MODEL_PATH)
except FileNotFoundError:
    _MODEL = None
    logger.warning("technical: no trained model found at %s — ml_bias/ml_confidence will be null", _MODEL_PATH)


def get_technical_analysis(symbol: str, name: str | None = None) -> dict | None:
    """Full technical analysis for a single stock symbol (e.g. 'RELIANCE.NS')."""
    try:
        df = None
        if is_us_equity_symbol(symbol):
            df = fetch_alpaca_daily_bars(symbol, years=2)  # None if keys unset/request failed -- falls through to yfinance
        elif is_india_equity_symbol(symbol):
            df = fetch_kite_daily_bars(symbol, years=2)  # None if keys/session unset/request failed -- falls through to yfinance
        if df is None:
            tk = yf.Ticker(symbol)
            df = tk.history(period="2y", auto_adjust=True)
        if df.empty or len(df) < 50:
            return None

        close = df["Close"]
        high = df["High"]
        low = df["Low"]
        volume = df["Volume"]

        ema5 = ta.trend.EMAIndicator(close, window=5).ema_indicator()
        ema20 = ta.trend.EMAIndicator(close, window=20).ema_indicator()
        ema50 = ta.trend.EMAIndicator(close, window=50).ema_indicator()
        ema200 = ta.trend.EMAIndicator(close, window=200).ema_indicator()
        sma200 = ta.trend.SMAIndicator(close, window=200).sma_indicator()

        rsi = ta.momentum.RSIIndicator(close, window=14).rsi()

        macd_obj = ta.trend.MACD(close)
        macd_line = macd_obj.macd()
        macd_sig = macd_obj.macd_signal()

        bb = ta.volatility.BollingerBands(close, window=20)
        bb_upper = bb.bollinger_hband()
        bb_lower = bb.bollinger_lband()

        # Support / Resistance (pivot)
        pi = next((i for i in range(-2, -10, -1) if float(high.iloc[i]) > float(low.iloc[i])), -2)
        pivot = (high.iloc[pi] + low.iloc[pi] + close.iloc[pi]) / 3
        r1 = float((2 * pivot) - low.iloc[pi])
        s1 = float((2 * pivot) - high.iloc[pi])
        r2 = float(pivot + (high.iloc[pi] - low.iloc[pi]))
        s2 = float(pivot - (high.iloc[pi] - low.iloc[pi]))

        avg_vol = float(volume.rolling(20).mean().iloc[-1])
        vol_ratio = round(float(volume.iloc[-1]) / avg_vol, 2) if avg_vol > 0 else 1.0

        w52_high = float(high.rolling(252).max().iloc[-1])
        w52_low = float(low.rolling(252).min().iloc[-1])

        curr_price = float(close.iloc[-1])
        prev_close = float(close.iloc[-2])
        change_pct = round((curr_price - prev_close) / prev_close * 100, 2)

        curr_rsi = round(float(rsi.iloc[-1]), 1)
        curr_ema5 = round(float(ema5.iloc[-1]), 2)
        curr_ema20 = round(float(ema20.iloc[-1]), 2)
        curr_ema50 = round(float(ema50.iloc[-1]), 2)
        curr_ema200 = round(float(ema200.iloc[-1]), 2) if not pd.isna(ema200.iloc[-1]) else None
        curr_sma200 = round(float(sma200.iloc[-1]), 2) if not pd.isna(sma200.iloc[-1]) else None

        signals = []
        if curr_rsi < 30:
            signals.append({"type": "STRONG BUY", "reason": f"RSI oversold at {curr_rsi}"})
        elif curr_rsi < 40:
            signals.append({"type": "BUY", "reason": f"RSI approaching oversold ({curr_rsi})"})
        elif curr_rsi > 70:
            signals.append({"type": "STRONG SELL", "reason": f"RSI overbought at {curr_rsi}"})
        elif curr_rsi > 60:
            signals.append({"type": "CAUTION", "reason": f"RSI elevated ({curr_rsi})"})

        if curr_ema5 > curr_ema20 > curr_ema50:
            signals.append({"type": "BULLISH", "reason": "EMA5 > EMA20 > EMA50 — strong uptrend"})
        elif curr_ema5 < curr_ema20 < curr_ema50:
            signals.append({"type": "BEARISH", "reason": "EMA5 < EMA20 < EMA50 — downtrend"})

        prev_ema5 = float(ema5.iloc[-2])
        prev_ema20 = float(ema20.iloc[-2])
        if prev_ema5 <= prev_ema20 and curr_ema5 > curr_ema20:
            signals.append({"type": "GOLDEN CROSS", "reason": "EMA5 just crossed above EMA20"})
        elif prev_ema5 >= prev_ema20 and curr_ema5 < curr_ema20:
            signals.append({"type": "DEATH CROSS", "reason": "EMA5 just crossed below EMA20"})

        if curr_sma200:
            if curr_price > curr_sma200:
                signals.append({"type": "ABOVE 200 SMA", "reason": "Long-term bullish structure intact"})
            else:
                signals.append({"type": "BELOW 200 SMA", "reason": "Long-term bearish — caution"})

        if vol_ratio > 2.0:
            signals.append({"type": "VOLUME SPIKE", "reason": f"Volume {vol_ratio}x above 20-day average"})

        bullish = sum(1 for s in signals if s["type"] in ["BUY", "STRONG BUY", "BULLISH", "GOLDEN CROSS", "ABOVE 200 SMA"])
        bearish = sum(1 for s in signals if s["type"] in ["SELL", "STRONG SELL", "BEARISH", "DEATH CROSS", "BELOW 200 SMA"])
        bias = "BULLISH" if bullish > bearish else ("BEARISH" if bearish > bullish else "NEUTRAL")

        # ATR-based entry/exit zones
        atr = float((high - low).rolling(14).mean().iloc[-1]) or curr_price * 0.015
        is_oversold = curr_rsi < 40 and curr_price < curr_ema20
        is_breakout = curr_price > r1 and curr_price > curr_ema20

        if is_oversold:
            entry_lo = round(curr_price * 0.995, 2)
            entry_hi = round(curr_price * 1.015, 2)
            stop = round(curr_price - atr * 1.2, 2)
            tgt1 = r1 if r1 > entry_hi else round(entry_hi * 1.06, 2)
            tgt2 = r2 if r2 > tgt1 else round(tgt1 * 1.04, 2)
        elif is_breakout:
            entry_lo = round(r1 * 0.995, 2)
            entry_hi = round(r1 * 1.020, 2)
            stop = round(r1 * 0.965, 2)
            tgt1 = r2
            tgt2 = round(r2 + (r2 - r1), 2)
        else:
            entry_lo = round(curr_ema20 * 0.990, 2)
            entry_hi = round(curr_ema5 * 1.010 if curr_ema5 > curr_ema20 else curr_ema20 * 1.015, 2)
            stop = round(curr_ema50 * 0.975, 2)
            tgt1 = r1 if r1 > entry_hi else round(entry_hi * 1.05, 2)
            tgt2 = r2 if r2 > tgt1 else round(tgt1 * 1.03, 2)

        bb_up = float(bb_upper.iloc[-1])
        if tgt1 <= entry_hi:
            tgt1 = bb_up if bb_up > entry_hi * 1.02 else round(entry_hi * 1.05, 2)
        if tgt2 <= tgt1:
            tgt2 = round(tgt1 * 1.04, 2)
        if stop >= entry_lo:
            stop = round(entry_lo - atr * 1.0, 2)

        bb_pct_val = (
            round((curr_price - float(bb_lower.iloc[-1])) / (float(bb_upper.iloc[-1]) - float(bb_lower.iloc[-1])), 3)
            if float(bb_upper.iloc[-1]) != float(bb_lower.iloc[-1]) else 0.5
        )
        pct_from_52h_val = round((curr_price - w52_high) / w52_high * 100, 2)

        ml_bias = None
        ml_confidence = None
        if _MODEL is not None and curr_ema200 is not None:
            macd_hist_val = float(macd_line.iloc[-1]) - float(macd_sig.iloc[-1])
            feature_values = {
                "rsi14": curr_rsi,
                "ema5_dist": curr_price / curr_ema5 - 1,
                "ema20_dist": curr_price / curr_ema20 - 1,
                "ema50_dist": curr_price / curr_ema50 - 1,
                "ema200_dist": curr_price / curr_ema200 - 1,
                "macd_hist": macd_hist_val,
                "bb_pct": bb_pct_val,
                "vol_ratio": vol_ratio,
                "pct_from_52h": pct_from_52h_val,
            }
            features = pd.DataFrame([feature_values])[FEATURE_COLUMNS]
            proba = float(_MODEL.predict_proba(features)[0][1])
            ml_confidence = round(proba, 3)
            ml_bias = "BULLISH" if proba >= 0.55 else ("BEARISH" if proba <= 0.45 else "NEUTRAL")

        return {
            "symbol": symbol,
            "name": name or symbol.replace(".NS", ""),
            "price": round(curr_price, 2),
            "change_pct": change_pct,
            "ema5": curr_ema5,
            "ema20": curr_ema20,
            "ema50": curr_ema50,
            "ema200": curr_ema200,
            "sma200": curr_sma200,
            "rsi": curr_rsi,
            "macd": round(float(macd_line.iloc[-1]), 3),
            "macd_signal": round(float(macd_sig.iloc[-1]), 3),
            "bb_upper": round(float(bb_upper.iloc[-1]), 2),
            "bb_lower": round(float(bb_lower.iloc[-1]), 2),
            "bb_pct": bb_pct_val,
            "support_1": round(s1, 2),
            "support_2": round(s2, 2),
            "resistance_1": round(r1, 2),
            "resistance_2": round(r2, 2),
            "entry_lo": entry_lo,
            "entry_hi": entry_hi,
            "target_1": round(tgt1, 2),
            "target_2": round(tgt2, 2),
            "stop": stop,
            "w52_high": round(w52_high, 2),
            "w52_low": round(w52_low, 2),
            "pct_from_52h": pct_from_52h_val,
            "vol_ratio": vol_ratio,
            "bias": bias,
            "signals": signals,
            "ml_bias": ml_bias,
            "ml_confidence": ml_confidence,
        }
    except Exception as e:
        print(f"[technical] Error for {symbol}: {e}")
        return None
