// Comprehensive stock detail: price, technicals (RSI, EMA, MACD, BB), 52W, signals
// Computed from Yahoo Finance 3-month daily history — no ML backend needed

export const runtime = 'edge';

function ema(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, prices.length);
  for (let i = Math.min(period, prices.length); i < prices.length; i++) {
    val = prices[i] * k + val * (1 - k);
  }
  return val;
}

function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]; else avgLoss -= changes[i];
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0, changes[i])) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -changes[i])) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

function bollinger(prices: number[], period = 20) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: mid + 2 * sd, lower: mid - 2 * sd, mid };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();

  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS`
             : exchange === 'BSE' ? `${symbol}.BO`
             : symbol; // US stocks — no suffix

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ error: `yahoo ${res.status}` }, { status: 502 });

    const data = await res.json() as {
      chart?: { result?: Array<{
        meta?: {
          regularMarketPrice?: number; regularMarketChangePercent?: number; chartPreviousClose?: number;
          fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
          fiftyDayAverage?: number; twoHundredDayAverage?: number;
          regularMarketVolume?: number; averageDailyVolume10Day?: number;
          longName?: string; shortName?: string; currency?: string;
        };
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    if (!result?.meta) return Response.json({ error: 'no data' }, { status: 404 });

    const m = result.meta;
    const raw = result.indicators?.quote?.[0]?.close ?? [];
    const closes = raw.filter((c): c is number => c != null && isFinite(c));

    const price   = m.regularMarketPrice ?? null;
    const ema20   = closes.length >= 20 ? +ema(closes, 20).toFixed(2) : null;
    const ema50   = m.fiftyDayAverage    ? +m.fiftyDayAverage.toFixed(2)   : closes.length >= 50 ? +ema(closes, 50).toFixed(2)  : null;
    const ema200  = m.twoHundredDayAverage ? +m.twoHundredDayAverage.toFixed(2) : null;
    const rsi14   = rsi(closes);
    const bb      = bollinger(closes);
    const ema12v  = closes.length >= 12 ? ema(closes, 12) : null;
    const ema26v  = closes.length >= 26 ? ema(closes, 26) : null;
    const macd    = (ema12v != null && ema26v != null) ? +(ema12v - ema26v).toFixed(2) : null;
    const volR    = (m.regularMarketVolume && m.averageDailyVolume10Day)
                  ? +(m.regularMarketVolume / m.averageDailyVolume10Day).toFixed(2) : null;
    const high52  = m.fiftyTwoWeekHigh ?? null;
    const low52   = m.fiftyTwoWeekLow  ?? null;
    const from52h = (price && high52) ? +((price - high52) / high52 * 100).toFixed(1) : null;
    const bbPct   = (bb && price) ? +Math.max(0, Math.min(100, (price - bb.lower) / (bb.upper - bb.lower) * 100)).toFixed(1) : null;

    // Derived price levels
    const stopLoss   = (bb && price) ? +Math.max(bb.lower, price * 0.95).toFixed(2) : null;
    const target1    = (ema50 && price && ema50 > price) ? ema50 : (bb ? +bb.upper.toFixed(2) : null);
    const target2    = (bb && price) ? +(bb.upper * 1.025).toFixed(2) : null;
    const entryLow   = (ema20 && price) ? +Math.min(ema20, price * 0.998).toFixed(2) : null;
    const entryHigh  = (ema20 && price) ? +Math.max(ema20, price * 1.002).toFixed(2) : null;

    // Signal strings
    const signals: string[] = [];
    if (price && ema200) {
      if (price < ema200) signals.push('BELOW 200 SMA · Long-term bearish — caution');
      else                signals.push('ABOVE 200 SMA · Long-term bullish trend intact');
    }
    if (price && ema50) {
      if (price < ema50)  signals.push('BELOW 50 EMA · Medium-term momentum weak');
      else                signals.push('ABOVE 50 EMA · Medium-term trend positive');
    }
    if (rsi14 != null) {
      if (rsi14 < 35)     signals.push(`RSI OVERSOLD (${rsi14.toFixed(0)}) · Watch for reversal`);
      else if (rsi14 > 70) signals.push(`RSI OVERBOUGHT (${rsi14.toFixed(0)}) · Momentum extended`);
    }
    if (macd != null) {
      if (macd > 0)       signals.push('MACD POSITIVE · Short-term bullish momentum');
      else                signals.push('MACD NEGATIVE · Short-term bearish momentum');
    }

    return Response.json({
      symbol, exchange, currency: m.currency ?? (exchange === 'NSE' || exchange === 'BSE' ? 'INR' : 'USD'),
      name: m.longName ?? m.shortName ?? symbol,
      price, change_pct: m.regularMarketChangePercent ?? null,
      prev_close: m.chartPreviousClose ?? null,
      ema20, ema50, ema200,
      rsi14: rsi14 != null ? +rsi14.toFixed(1) : null,
      macd,
      bb_upper: bb ? +bb.upper.toFixed(2) : null,
      bb_lower: bb ? +bb.lower.toFixed(2) : null,
      bb_mid:   bb ? +bb.mid.toFixed(2)   : null,
      bb_pct: bbPct,
      high_52w: high52, low_52w: low52, from_52h: from52h,
      volume: m.regularMarketVolume ?? null,
      avg_volume: m.averageDailyVolume10Day ?? null,
      vol_ratio: volR,
      stop_loss: stopLoss, target1, target2,
      entry_low: entryLow, entry_high: entryHigh,
      signals,
    }, { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' } });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
