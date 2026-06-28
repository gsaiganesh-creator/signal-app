// Shared utility — used by /api/stock-detail and /stocks/[symbol] server page
// Fetches Yahoo Finance 3mo daily OHLCV and computes RSI14, EMA20/50/200

export interface StockDetail {
  symbol: string;
  exchange: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  prev_close: number | null;
  rsi14: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  high_52w: number | null;
  low_52w: number | null;
  from_52h: number | null;
  signals: string[];
  error?: string;
}

function calcEma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let v = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) v = prices[i] * k + v * (1 - k);
  return v;
}

function calcRsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const ch = prices.slice(1).map((p, i) => p - prices[i]);
  let ag = 0, al = 0;
  for (let i = 0; i < period; i++) { if (ch[i] > 0) ag += ch[i]; else al -= ch[i]; }
  ag /= period; al /= period;
  for (let i = period; i < ch.length; i++) {
    ag = (ag * (period - 1) + Math.max(0, ch[i]))  / period;
    al = (al * (period - 1) + Math.max(0, -ch[i])) / period;
  }
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
}

function yhTicker(symbol: string, exchange: string) {
  return exchange === 'BSE' ? symbol + '.BO' : symbol + '.NS';
}

export async function fetchStockDetail(symbol: string, exchange = 'NSE'): Promise<StockDetail> {
  const ticker = yhTicker(symbol, exchange);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } },
    );
    if (!res.ok) return { symbol, exchange, name: symbol, price: null, change_pct: null, prev_close: null, rsi14: null, ema20: null, ema50: null, ema200: null, high_52w: null, low_52w: null, from_52h: null, signals: [], error: 'fetch_failed' };

    const j    = await res.json();
    const r    = j?.chart?.result?.[0];
    if (!r)    return { symbol, exchange, name: symbol, price: null, change_pct: null, prev_close: null, rsi14: null, ema20: null, ema50: null, ema200: null, high_52w: null, low_52w: null, from_52h: null, signals: [], error: 'no_data' };

    const meta    = r.meta ?? {};
    const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter((c: number | null) => c != null);
    const highs:  number[] = (r.indicators?.quote?.[0]?.high  ?? []).filter((c: number | null) => c != null);
    const lows:   number[] = (r.indicators?.quote?.[0]?.low   ?? []).filter((c: number | null) => c != null);

    const price      = meta.regularMarketPrice ?? closes[closes.length - 1] ?? null;
    const prev_close = meta.previousClose ?? closes[closes.length - 2] ?? null;
    const change_pct = price && prev_close ? ((price - prev_close) / prev_close) * 100 : null;
    const name       = meta.longName ?? meta.shortName ?? symbol;
    const high_52w   = highs.length  ? Math.max(...highs)  : null;
    const low_52w    = lows.length   ? Math.min(...lows)   : null;
    const from_52h   = high_52w && price ? ((price - high_52w) / high_52w) * 100 : null;

    const rsi14  = calcRsi(closes);
    const ema20  = calcEma(closes, 20);
    const ema50  = calcEma(closes, 50);
    const ema200 = calcEma(closes, 200);

    const signals: string[] = [];
    if (price && ema20)  signals.push(price > ema20  ? `PRICE ABOVE EMA20 (${ema20.toFixed(1)})`  : `PRICE BELOW EMA20 (${ema20.toFixed(1)})`);
    if (price && ema50)  signals.push(price > ema50  ? `PRICE ABOVE EMA50 (${ema50.toFixed(1)})`  : `PRICE BELOW EMA50 (${ema50.toFixed(1)})`);
    if (price && ema200) signals.push(price > ema200 ? `PRICE ABOVE EMA200 (${ema200.toFixed(1)})` : `PRICE BELOW EMA200 (${ema200.toFixed(1)})`);
    if (rsi14 != null) {
      if (rsi14 < 30) signals.push(`RSI OVERSOLD (${rsi14.toFixed(1)})`);
      else if (rsi14 > 70) signals.push(`RSI OVERBOUGHT (${rsi14.toFixed(1)})`);
      else signals.push(`RSI NEUTRAL (${rsi14.toFixed(1)})`);
    }

    return { symbol, exchange, name, price, change_pct, prev_close, rsi14, ema20, ema50, ema200, high_52w, low_52w, from_52h, signals };
  } catch {
    return { symbol, exchange, name: symbol, price: null, change_pct: null, prev_close: null, rsi14: null, ema20: null, ema50: null, ema200: null, high_52w: null, low_52w: null, from_52h: null, signals: [], error: 'exception' };
  }
}
