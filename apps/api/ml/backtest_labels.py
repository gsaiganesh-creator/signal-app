"""Historical backtest label generator — bootstraps training data for the
trained signal classifier. Walks 3 years of yfinance history per symbol,
computes the same feature set core/technical.py computes, and labels each
row with the actual known forward 30-trading-day return."""
import logging
from pathlib import Path

import pandas as pd
import ta
import yfinance as yf

from core.paper_trading_scan import NSE_UNIVERSE
from ml.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

OUTPUT_PATH = Path(__file__).parent / "training_data.parquet"
FORWARD_DAYS = 30
WARMUP_DAYS = 252


def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    close = df["Close"]
    high = df["High"]
    volume = df["Volume"]

    ema5 = ta.trend.EMAIndicator(close, window=5).ema_indicator()
    ema20 = ta.trend.EMAIndicator(close, window=20).ema_indicator()
    ema50 = ta.trend.EMAIndicator(close, window=50).ema_indicator()
    ema200 = ta.trend.EMAIndicator(close, window=200).ema_indicator()
    rsi = ta.momentum.RSIIndicator(close, window=14).rsi()
    macd_obj = ta.trend.MACD(close)
    macd_hist = macd_obj.macd() - macd_obj.macd_signal()
    bb = ta.volatility.BollingerBands(close, window=20)
    bb_upper = bb.bollinger_hband()
    bb_lower = bb.bollinger_lband()
    bb_range = bb_upper - bb_lower
    bb_pct = ((close - bb_lower) / bb_range).where(bb_range != 0, 0.5)
    vol_ratio = volume / volume.rolling(20).mean()
    w52_high = high.rolling(252).max()
    pct_from_52h = (close - w52_high) / w52_high * 100

    fwd_return_30d = close.shift(-FORWARD_DAYS) / close - 1

    feat = pd.DataFrame({
        "rsi14": rsi,
        "ema5_dist": close / ema5 - 1,
        "ema20_dist": close / ema20 - 1,
        "ema50_dist": close / ema50 - 1,
        "ema200_dist": close / ema200 - 1,
        "macd_hist": macd_hist,
        "bb_pct": bb_pct,
        "vol_ratio": vol_ratio,
        "pct_from_52h": pct_from_52h,
        "fwd_return_30d": fwd_return_30d,
    })
    feat["date"] = df.index.tz_localize(None)
    return feat


def generate() -> pd.DataFrame:
    rows = []
    for sym in NSE_UNIVERSE:
        ysym = f"{sym}.NS"
        try:
            df = yf.Ticker(ysym).history(period="3y", auto_adjust=True)
        except Exception as e:
            logger.error("backtest_labels: fetch failed for %s: %s", ysym, e)
            continue
        if df.empty or len(df) < WARMUP_DAYS + FORWARD_DAYS:
            logger.warning("backtest_labels: not enough history for %s (%d rows)", ysym, len(df))
            continue

        feat = _compute_features(df)
        feat["symbol"] = sym
        feat = feat.iloc[WARMUP_DAYS:-FORWARD_DAYS]
        feat = feat.dropna(subset=FEATURE_COLUMNS + ["fwd_return_30d"])
        rows.append(feat)
        logger.info("backtest_labels: %s -> %d usable rows", sym, len(feat))

    if not rows:
        raise RuntimeError("backtest_labels: no usable data generated for any symbol")

    full = pd.concat(rows, ignore_index=True)
    full["label"] = (full["fwd_return_30d"] > 0).astype(int)
    full.to_parquet(OUTPUT_PATH, index=False)
    logger.info("backtest_labels: wrote %d rows to %s", len(full), OUTPUT_PATH)
    return full


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate()
