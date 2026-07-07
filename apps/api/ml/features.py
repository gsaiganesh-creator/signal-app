"""Feature column list shared between backtest_labels.py, train.py, and
core/technical.py. Kept dependency-free so core/technical.py can import it
without circular import risk — core/paper_trading_scan.py already imports
core.technical, so this module must never import core.paper_trading_scan."""

FEATURE_COLUMNS = [
    "rsi14", "ema5_dist", "ema20_dist", "ema50_dist", "ema200_dist",
    "macd_hist", "bb_pct", "vol_ratio", "pct_from_52h",
]
