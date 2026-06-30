// Technical analysis detail for a single ticker — matches TADetail interface in signals/page.tsx
// Primary: serve from shared scan cache (no Yahoo Finance call needed for scanned stocks).
// Fallback: live Yahoo Finance fetch for stocks not in the scan (e.g. manual search).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { findInScan } from '../_cache';

function r(v: number, d = 2) { return +v.toFixed(d); }

function calcEmaFull(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, closes.length);
  for (let i = 0; i < Math.min(period, closes.length); i++) out.push(val);
  for (let i = period; i < closes.length; i++) {
    val = closes[i] * k + val * (1 - k);
    out.push(val);
  }
  return out;
}

function calcEma(closes: number[], period: number): number {
  const series = calcEmaFull(closes, period);
  return series[series.length - 1] ?? 0;
}

function calcSma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const ch = closes.slice(1).map((p, i) => p - closes[i]);
  let g = 0, l = 0;
  for (let i = 0; i < period; i++) { if (ch[i] > 0) g += ch[i]; else l -= ch[i]; }
  g /= period; l /= period;
  for (let i = period; i < ch.length; i++) {
    g = (g * (period - 1) + Math.max(0, ch[i])) / period;
    l = (l * (period - 1) + Math.max(0, -ch[i])) / period;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function calcMacd(closes: number[]): { macd: number; signal: number } {
  const ema12 = calcEmaFull(closes, 12);
  const ema26 = calcEmaFull(closes, 26);
  const len = Math.min(ema12.length, ema26.length);
  const macdLine = ema12.slice(-len).map((v, i) => v - ema26.slice(-len)[i]);
  const macdVal = macdLine[macdLine.length - 1] ?? 0;
  // Signal = 9-period EMA of MACD line
  const k = 2 / (9 + 1);
  let sigVal = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / Math.min(9, macdLine.length);
  for (let i = 9; i < macdLine.length; i++) sigVal = macdLine[i] * k + sigVal * (1 - k);
  return { macd: r(macdVal, 3), signal: r(sigVal, 3) };
}

function calcBB(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: r(mid + 2 * sd), lower: r(mid - 2 * sd), mid: r(mid) };
}

function pivot(high: number[], low: number[], close: number[]) {
  const i = -2; // use second-to-last bar for completed pivot
  const h = high.at(i) ?? 0, l = low.at(i) ?? 0, c = close.at(i) ?? 0;
  const p = (h + l + c) / 3;
  return {
    r1: r(2 * p - l),
    r2: r(p + (h - l)),
    s1: r(2 * p - h),
    s2: r(p - (h - l)),
  };
}

interface YahooChart {
  chart?: { result?: Array<{
    meta?: { longName?: string; shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketVolume?: number; averageDailyVolume10Day?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number };
    indicators?: { quote?: Array<{ close?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; volume?: (number|null)[] }> };
  }> };
}

// In-memory cache per ticker
const _tickerCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 900_000; // 15 min

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const sym = ticker.toUpperCase().endsWith('.NS') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.NS`;

  // ── 1. Serve from per-ticker cache ──────────────────────────────────────────
  const cached = _tickerCache.get(sym);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(Object.assign({}, cached.data as object, { cached: true }),
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }

  // ── 2. Serve from shared scan cache (no Yahoo Finance call needed) ──────────
  const scanHit = findInScan(sym);
  if (scanHit) {
    const cmp = scanHit.cmp;
    const scanDerived = {
      symbol: sym, name: scanHit.name,
      price: cmp, change_pct: scanHit.chg,
      ema5: 0, ema20: scanHit.ema20, ema50: 0, sma200: null,
      rsi: scanHit.rsi, macd: 0, macd_signal: 0,
      bb_upper: 0, bb_lower: 0,
      support_1: r(scanHit.sl * 1.01), support_2: r(scanHit.sl),
      resistance_1: r(scanHit.entry_high * 1.02), resistance_2: r(scanHit.target * 0.97),
      entry_lo: scanHit.entry_low, entry_hi: scanHit.entry_high,
      target_1: scanHit.target, target_2: r(scanHit.target * 1.04), stop: scanHit.sl,
      w52_high: 0, w52_low: 0, pct_from_52h: 0,
      vol_ratio: 1, bias: scanHit.confidence >= 70 ? 'BULLISH' : 'NEUTRAL',
      signals: [
        { type: scanHit.signal, reason: `RSI ${scanHit.rsi} · EMA dist ${scanHit.ema_dist_pct}% · Confidence ${scanHit.confidence}%` },
        ...(scanHit.rsi < 50 ? [{ type: 'BULLISH', reason: 'RSI below midline — building momentum' }] : []),
      ],
      from_scan_cache: true,
    };
    _tickerCache.set(sym, { data: scanDerived, ts: Date.now() });
    return Response.json({ ...scanDerived, cached: false },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }

  // ── 3. Fallback: live Yahoo Finance fetch (for manually searched stocks) ─────
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=6mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return Response.json({ error: `yahoo ${res.status}` }, { status: 502 });

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return Response.json({ error: 'yahoo returned non-JSON (rate limited)' }, { status: 502 });
    }

    const json = await res.json() as YahooChart;
    const result = json?.chart?.result?.[0];
    if (!result) return Response.json({ error: 'no data' }, { status: 404 });

    const m = result.meta ?? {};
    const q = result.indicators?.quote?.[0] ?? {};
    const closes = (q.close ?? []).filter((c): c is number => c != null && isFinite(c));
    const highs  = (q.high  ?? []).filter((h): h is number => h != null && isFinite(h));
    const lows   = (q.low   ?? []).filter((l): l is number => l != null && isFinite(l));
    const vols   = (q.volume ?? []).filter((v): v is number => v != null && isFinite(v));

    if (closes.length < 50) return Response.json({ error: 'insufficient data' }, { status: 404 });

    const price    = m.regularMarketPrice ?? closes.at(-1) ?? 0;
    const chgPct   = m.regularMarketChangePercent ?? 0;
    const ema5     = r(calcEma(closes, 5));
    const ema20    = r(calcEma(closes, 20));
    const ema50    = r(calcEma(closes, 50));
    const sma200   = closes.length >= 200 ? r(calcSma(closes, 200) ?? 0) : null;
    const rsiVal   = calcRsi(closes);
    const { macd: macdVal, signal: macdSig } = calcMacd(closes);
    const bb       = calcBB(closes);
    const piv      = pivot(highs, lows, closes);
    const w52High  = m.fiftyTwoWeekHigh ?? Math.max(...highs.slice(-252));
    const w52Low   = m.fiftyTwoWeekLow  ?? Math.min(...lows.slice(-252));
    const avgVol   = m.averageDailyVolume10Day ?? (vols.length > 10 ? vols.slice(-10).reduce((a,b)=>a+b,0)/10 : 0);
    const lastVol  = m.regularMarketVolume ?? vols.at(-1) ?? 0;
    const volRatio = avgVol > 0 ? r(lastVol / avgVol) : 1;

    // ─── Signal generation ───────────────────────────────────────────────────
    const signals: { type: string; reason: string }[] = [];
    if (rsiVal != null) {
      if (rsiVal < 30)        signals.push({ type:'STRONG BUY',   reason:`RSI oversold at ${r(rsiVal,1)}` });
      else if (rsiVal < 40)   signals.push({ type:'BUY',          reason:`RSI approaching oversold (${r(rsiVal,1)})` });
      else if (rsiVal > 70)   signals.push({ type:'STRONG SELL',  reason:`RSI overbought at ${r(rsiVal,1)}` });
      else if (rsiVal > 60)   signals.push({ type:'CAUTION',      reason:`RSI elevated (${r(rsiVal,1)})` });
    }
    if (ema5 > ema20 && ema20 > ema50) signals.push({ type:'BULLISH', reason:'EMA5 > EMA20 > EMA50 — strong uptrend' });
    else if (ema5 < ema20 && ema20 < ema50) signals.push({ type:'BEARISH', reason:'EMA5 < EMA20 < EMA50 — downtrend' });

    if (sma200 != null) {
      if (price > sma200) signals.push({ type:'ABOVE 200 SMA', reason:'Long-term bullish structure intact' });
      else                signals.push({ type:'BELOW 200 SMA', reason:'Long-term bearish — caution' });
    }
    if (volRatio > 2.0) signals.push({ type:'VOLUME SPIKE', reason:`Volume ${volRatio}× above 20-day average` });
    if (macdVal > macdSig) signals.push({ type:'MACD BULLISH', reason:'MACD line above signal — momentum positive' });

    const bullish = signals.filter(s => ['BUY','STRONG BUY','BULLISH','GOLDEN CROSS','ABOVE 200 SMA','MACD BULLISH'].includes(s.type)).length;
    const bearish = signals.filter(s => ['SELL','STRONG SELL','BEARISH','DEATH CROSS','BELOW 200 SMA'].includes(s.type)).length;
    const bias = bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL';

    // ─── Entry/exit levels (ATR-based) ───────────────────────────────────────
    const atrs = highs.slice(-15).map((h, i) => h - (lows.slice(-15)[i] ?? 0));
    const atr  = atrs.reduce((a, b) => a + b, 0) / atrs.length || price * 0.015;
    const isOversold = rsiVal != null && rsiVal < 40 && price < ema20;
    const isBreakout = piv.r1 > 0 && price > piv.r1 && price > ema20;

    let entry_lo: number, entry_hi: number, stop: number, target_1: number, target_2: number;
    if (isOversold) {
      entry_lo = r(price * 0.995); entry_hi = r(price * 1.015);
      stop = r(price - atr * 1.2);
      target_1 = piv.r1 > entry_hi ? piv.r1 : r(entry_hi * 1.06);
      target_2 = piv.r2 > target_1 ? piv.r2 : r(target_1 * 1.04);
    } else if (isBreakout) {
      entry_lo = r(piv.r1 * 0.995); entry_hi = r(piv.r1 * 1.02);
      stop = r(piv.r1 * 0.965);
      target_1 = piv.r2; target_2 = r(piv.r2 + (piv.r2 - piv.r1));
    } else {
      entry_lo = r(ema20 * 0.99); entry_hi = r((ema5 > ema20 ? ema5 : ema20) * 1.015);
      stop = r(ema50 * 0.975);
      target_1 = piv.r1 > entry_hi ? piv.r1 : r(entry_hi * 1.05);
      target_2 = piv.r2 > target_1 ? piv.r2 : r(target_1 * 1.03);
    }
    // Sanity
    if (bb && target_1 <= entry_hi) target_1 = bb.upper > entry_hi * 1.02 ? bb.upper : r(entry_hi * 1.05);
    if (target_2 <= target_1) target_2 = r(target_1 * 1.04);
    if (stop >= entry_lo) stop = r(entry_lo - atr);

    const data = {
      symbol: sym, name: m.longName ?? m.shortName ?? sym.replace('.NS',''),
      price: r(price), change_pct: r(chgPct, 2),
      ema5, ema20, ema50, sma200,
      rsi: rsiVal != null ? r(rsiVal, 1) : 50,
      macd: macdVal, macd_signal: macdSig,
      bb_upper: bb?.upper ?? 0, bb_lower: bb?.lower ?? 0,
      support_1: piv.s1, support_2: piv.s2,
      resistance_1: piv.r1, resistance_2: piv.r2,
      entry_lo, entry_hi, target_1, target_2, stop,
      w52_high: r(w52High), w52_low: r(w52Low),
      pct_from_52h: r((price - w52High) / w52High * 100, 1),
      vol_ratio: volRatio, bias, signals,
    };

    _tickerCache.set(sym, { data, ts: Date.now() });
    return Response.json({ ...data, cached: false },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
