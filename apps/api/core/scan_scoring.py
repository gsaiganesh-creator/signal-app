"""Shared RSI/EMA scoring logic for equity scans — used by India's
swing_scan.py (curated ~100) and full_market_scan.py (full NSE+BSE), and by
US's us_scan.py (curated ~100) and full_market_scan_us.py (full NYSE/
NASDAQ/AMEX), so the curated and full-universe versions of each market can
never drift out of sync on what counts as a qualifying pick."""


def calc_rsi(closes, period: int = 14):
    delta = closes.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def score_symbol(sym: str, s_close, name: str = "", sector: str = "", min_price: float = 100.0, price_decimals: int = 1) -> dict | None:
    """RSI 42-62, price near EMA, price above min_price (₹100 for India's
    default, callers pass $20 for US). price_decimals controls rounding on
    the derived entry/target/stop prices (1 for India's larger rupee values,
    2 for US's cents-precision quotes). Returns None if the symbol doesn't
    pass the screen."""
    s_close = s_close.dropna()
    if len(s_close) < 21:
        return None
    cmp = float(s_close.iloc[-1])
    prev = float(s_close.iloc[-2])
    if cmp < min_price:
        return None
    intraday_chg = (cmp - prev) / prev * 100
    if intraday_chg > 3.0:
        return None
    rsi = float(calc_rsi(s_close).iloc[-1])
    if not (42 <= rsi <= 62):
        return None
    ema10 = float(s_close.ewm(span=10).mean().iloc[-1])
    ema20 = float(s_close.ewm(span=20).mean().iloc[-1])
    ema_dist = (cmp - ema20) / ema20 * 100
    if ema_dist > 8:
        return None
    support = max(ema10, ema20) if cmp > max(ema10, ema20) else min(ema10, ema20)
    entry_low = round(min(cmp, support) * 0.99, price_decimals)
    entry_high = round(cmp * 1.005, price_decimals)
    sl = round(support * 0.95, price_decimals)
    target = round(cmp * 1.10, price_decimals)
    score = (10 - abs(rsi - 52)) + (5 - abs(ema_dist))
    return {
        "symbol": sym,
        "name": name or sym,
        "sector": sector,
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
    }
