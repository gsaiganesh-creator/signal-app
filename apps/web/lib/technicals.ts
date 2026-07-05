// Shared technical-indicator math — pure functions over price arrays.
// Used by /api/stock-detail (stocks) and /api/technical (currency pairs, commodity futures, ...).

export function ema(prices: number[], period: number): number {
  if (!prices.length) return 0;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, prices.length);
  for (let i = Math.min(period, prices.length); i < prices.length; i++) val = prices[i] * k + val * (1 - k);
  return val;
}

export function rsi(prices: number[], period = 14): number | null {
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

export function bollinger(prices: number[], period = 20) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: mid + 2 * sd, lower: mid - 2 * sd, mid };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (highs.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Supertrend (period=10, multiplier=3) — Wilder smoothed ATR
export function supertrend(
  highs: number[], lows: number[], closes: number[],
  period = 10, mult = 3,
): { value: number; direction: 1 | -1 } | null {
  if (highs.length < period + 2) return null;
  // Compute true ranges
  const trs: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
  }
  // Wilder smoothed ATR
  const atrArr: number[] = new Array(closes.length).fill(0);
  let seed = 0;
  for (let i = 1; i <= period; i++) seed += trs[i];
  atrArr[period] = seed / period;
  for (let i = period + 1; i < closes.length; i++) {
    atrArr[i] = (atrArr[i-1] * (period - 1) + trs[i]) / period;
  }
  // Supertrend bands
  const upper: number[] = new Array(closes.length).fill(0);
  const lower: number[] = new Array(closes.length).fill(0);
  const dir:   number[] = new Array(closes.length).fill(1);
  for (let i = period; i < closes.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    let rawUp = hl2 + mult * atrArr[i];
    let rawLo = hl2 - mult * atrArr[i];
    // Band tightening
    upper[i] = (i > period && rawUp < upper[i-1]) || closes[i-1] > upper[i-1] ? rawUp : upper[i-1];
    lower[i] = (i > period && rawLo > lower[i-1]) || closes[i-1] < lower[i-1] ? rawLo : lower[i-1];
    // Direction
    if (i === period) { dir[i] = 1; continue; }
    if (closes[i] > upper[i-1])       dir[i] = 1;
    else if (closes[i] < lower[i-1])  dir[i] = -1;
    else                               dir[i] = dir[i-1];
  }
  const last = closes.length - 1;
  const d = dir[last] as 1 | -1;
  return { value: +(d === 1 ? lower[last] : upper[last]).toFixed(2), direction: d };
}
