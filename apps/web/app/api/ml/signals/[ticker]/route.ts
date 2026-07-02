// Per-stock ML signal: RSI14 + EMA20/50/200 + MACD → BUY/SELL/HOLD/STRONG_BUY/STRONG_SELL
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function calcEma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) val = prices[i] * k + val * (1 - k);
  return val;
}

function calcRsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const chg = prices.slice(1).map((p, i) => p - prices[i]);
  let g = 0, l = 0;
  for (let i = 0; i < period; i++) { if (chg[i] > 0) g += chg[i]; else l -= chg[i]; }
  g /= period; l /= period;
  for (let i = period; i < chg.length; i++) {
    g = (g * (period - 1) + Math.max(0, chg[i])) / period;
    l = (l * (period - 1) + Math.max(0, -chg[i])) / period;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function calcMacd(prices: number[]): number | null {
  const e12 = calcEma(prices, 12);
  const e26 = calcEma(prices, 26);
  return e12 != null && e26 != null ? e12 - e26 : null;
}

function deriveSignal(
  price: number, rsi: number | null,
  ema20: number | null, ema50: number | null, ema200: number | null,
  macd: number | null,
): string {
  const r = rsi ?? 50;
  const aboveEma20  = ema20  != null && price > ema20;
  const aboveEma50  = ema50  != null && price > ema50;
  const aboveEma200 = ema200 != null && price > ema200;
  const macdPos     = macd != null && macd > 0;

  // STRONG_BUY: all EMAs aligned bullish, RSI in sweet spot, MACD positive
  if (aboveEma20 && aboveEma50 && aboveEma200 && r >= 42 && r <= 65 && macdPos)
    return 'STRONG_BUY';

  // BUY: above EMA50, RSI in range, either MACD positive or above EMA20
  if (aboveEma50 && r >= 35 && r <= 70 && (macdPos || aboveEma20))
    return 'BUY';

  // STRONG_SELL: below EMA200 + EMA50, MACD negative, RSI bearish
  if (!aboveEma200 && !aboveEma50 && !macdPos && r < 50)
    return 'STRONG_SELL';

  // SELL: below EMA50, MACD negative
  if (!aboveEma50 && !macdPos && r < 55)
    return 'SELL';

  return 'HOLD';
}

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!ticker) return Response.json({ signal: 'HOLD', rsi: null, current_price: null, change_pct: null });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return Response.json({ signal: 'HOLD', rsi: null, current_price: null, change_pct: null });

    const data = await res.json() as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number }; indicators?: { quote?: { close?: (number | null)[] }[] } }[] }
    };
    const result    = data?.chart?.result?.[0];
    const meta      = result?.meta;
    const rawClose  = result?.indicators?.quote?.[0]?.close ?? [];
    const closes    = rawClose.filter((c): c is number => c != null && isFinite(c));

    const current_price = meta?.regularMarketPrice ?? closes[closes.length - 1] ?? null;
    const change_pct    = meta?.regularMarketChangePercent ?? null;

    if (closes.length < 22 || !current_price) {
      return Response.json({ signal: 'HOLD', rsi: null, current_price, change_pct });
    }

    const rsi    = calcRsi(closes);
    const ema20  = calcEma(closes, 20);
    const ema50  = calcEma(closes, 50);
    const ema200 = calcEma(closes, 200);
    const macd   = calcMacd(closes);

    const signal = deriveSignal(current_price, rsi, ema20, ema50, ema200, macd);

    return Response.json(
      { signal, rsi: rsi != null ? +rsi.toFixed(1) : null, current_price, change_pct },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } },
    );
  } catch {
    return Response.json({ signal: 'HOLD', rsi: null, current_price: null, change_pct: null });
  }
}
