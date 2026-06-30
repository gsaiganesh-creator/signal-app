// Ticker TA detail — static path /api/ml/signals/detail?ticker=SBIN.NS
// Merges scan cache data (confidence, entry zone) with Yahoo Finance TA (EMA50, MACD, BB, 52W).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function r(v: number, d = 2) { return +v.toFixed(d); }

interface ScanSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

interface YahooChart {
  chart?: { result?: Array<{
    meta?: {
      regularMarketPrice?: number; regularMarketChangePercent?: number;
      regularMarketVolume?: number; averageDailyVolume10Day?: number;
      fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
      longName?: string; shortName?: string;
    };
    indicators?: { quote?: Array<{ close?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; volume?: (number|null)[] }> };
  }> };
}

function calcEma(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k);
  return val;
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
  const ema12Series = (() => {
    const k = 2 / 13, out: number[] = [];
    let v = closes.slice(0, 12).reduce((a, b) => a + b, 0) / Math.min(12, closes.length);
    for (let i = 0; i < Math.min(12, closes.length); i++) out.push(v);
    for (let i = 12; i < closes.length; i++) { v = closes[i] * k + v * (1 - k); out.push(v); }
    return out;
  })();
  const ema26Series = (() => {
    const k = 2 / 27, out: number[] = [];
    let v = closes.slice(0, 26).reduce((a, b) => a + b, 0) / Math.min(26, closes.length);
    for (let i = 0; i < Math.min(26, closes.length); i++) out.push(v);
    for (let i = 26; i < closes.length; i++) { v = closes[i] * k + v * (1 - k); out.push(v); }
    return out;
  })();
  const len = Math.min(ema12Series.length, ema26Series.length);
  const macdLine = ema12Series.slice(-len).map((v, i) => v - ema26Series.slice(-len)[i]);
  const macdVal = macdLine[macdLine.length - 1] ?? 0;
  const k = 2 / 10;
  let sig = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / Math.min(9, macdLine.length);
  for (let i = 9; i < macdLine.length; i++) sig = macdLine[i] * k + sig * (1 - k);
  return { macd: r(macdVal, 3), signal: r(sig, 3) };
}

function calcBB(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: r(mid + 2 * sd), lower: r(mid - 2 * sd) };
}

// Per-ticker in-memory cache
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 900_000; // 15 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('ticker') ?? '';
  if (!raw) return Response.json({ error: 'ticker required' }, { status: 400 });
  const sym = raw.toUpperCase().endsWith('.NS') ? raw.toUpperCase() : `${raw.toUpperCase()}.NS`;

  // Serve from cache
  const hit = _cache.get(sym);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return Response.json({ ...hit.data as object, cached: true },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }

  // Get scan data first
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  let scanHit: ScanSignal | null = null;
  try {
    const scanRes = await fetch(`${base}/api/ml/signals?limit=50`, { signal: AbortSignal.timeout(15000) });
    if (scanRes.ok) {
      const { signals } = await scanRes.json() as { signals: ScanSignal[] };
      scanHit = signals.find(s => s.symbol.toUpperCase() === sym) ?? null;
    }
  } catch { /* fall through to Yahoo-only */ }

  // Fetch Yahoo Finance for full TA (range=2mo — confirmed working from VPS)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const json = await res.json() as YahooChart;
        const result = json?.chart?.result?.[0];
        if (result) {
          const m = result.meta ?? {};
          const q = result.indicators?.quote?.[0] ?? {};
          const closes = (q.close ?? []).filter((c): c is number => c != null && isFinite(c));
          const vols   = (q.volume ?? []).filter((v): v is number => v != null && isFinite(v));
          const highs  = (q.high  ?? []).filter((h): h is number => h != null && isFinite(h));
          const lows   = (q.low   ?? []).filter((l): l is number => l != null && isFinite(l));

          if (closes.length >= 20) {
            const price    = m.regularMarketPrice ?? closes.at(-1) ?? 0;
            const chgPct   = m.regularMarketChangePercent ?? (scanHit?.chg ?? 0);
            const ema5     = r(calcEma(closes, 5));
            const ema20    = r(calcEma(closes, 20));
            const ema50    = closes.length >= 40 ? r(calcEma(closes, Math.min(50, closes.length))) : 0;
            const rsiVal   = calcRsi(closes) ?? scanHit?.rsi ?? 50;
            const { macd: macdVal, signal: macdSig } = calcMacd(closes);
            const bb       = calcBB(closes);
            const w52High  = m.fiftyTwoWeekHigh ?? Math.max(...highs);
            const w52Low   = m.fiftyTwoWeekLow  ?? Math.min(...lows);
            const avgVol   = m.averageDailyVolume10Day ?? (vols.length > 10 ? vols.slice(-10).reduce((a, b) => a + b, 0) / 10 : 0);
            const lastVol  = m.regularMarketVolume ?? vols.at(-1) ?? 0;
            const volRatio = avgVol > 0 ? r(lastVol / avgVol) : 1;

            // Price levels — prefer scan data for entry/target/SL
            const entryLo = scanHit?.entry_low  ?? r(ema20 * 0.99);
            const entryHi = scanHit?.entry_high ?? r(price * 1.005);
            const stop    = scanHit?.sl         ?? r(ema20 * 0.95);
            const target1 = scanHit?.target     ?? r(price * 1.10);
            const target2 = r(target1 * 1.04);

            // Pivot support/resistance from 2mo highs/lows
            const recentHigh = highs.length > 0 ? r(Math.max(...highs.slice(-20))) : r(price * 1.03);
            const recentLow  = lows.length  > 0 ? r(Math.min(...lows.slice(-20)))  : r(price * 0.97);

            // Signals
            const signals: { type: string; reason: string }[] = [];
            if (rsiVal < 30)       signals.push({ type: 'STRONG BUY',  reason: `RSI oversold at ${r(rsiVal, 1)}` });
            else if (rsiVal < 42)  signals.push({ type: 'BUY',         reason: `RSI approaching oversold (${r(rsiVal, 1)})` });
            else if (rsiVal > 70)  signals.push({ type: 'STRONG SELL', reason: `RSI overbought at ${r(rsiVal, 1)}` });
            else if (rsiVal > 62)  signals.push({ type: 'CAUTION',     reason: `RSI elevated (${r(rsiVal, 1)})` });
            if (ema5 > ema20 && ema20 > (ema50 || ema20)) signals.push({ type: 'BULLISH', reason: 'EMA5 > EMA20 — uptrend' });
            else if (ema5 < ema20) signals.push({ type: 'BEARISH', reason: 'EMA5 < EMA20 — weakening' });
            if (macdVal > macdSig) signals.push({ type: 'MACD BULLISH', reason: 'MACD above signal line' });
            if (volRatio > 2)      signals.push({ type: 'VOLUME SPIKE', reason: `Volume ${volRatio}× above average` });
            if (scanHit) signals.push({ type: scanHit.signal, reason: `RSI ${r(rsiVal, 1)} · EMA dist ${scanHit.ema_dist_pct}% · Confidence ${scanHit.confidence}%` });

            const bullish = signals.filter(s => ['BUY','STRONG BUY','BULLISH','MACD BULLISH'].includes(s.type)).length;
            const bearish = signals.filter(s => ['SELL','STRONG SELL','BEARISH'].includes(s.type)).length;

            const data = {
              symbol: sym, name: m.longName ?? m.shortName ?? sym.replace('.NS', ''),
              price: r(price), change_pct: r(chgPct, 2),
              ema5, ema20, ema50, sma200: null,
              rsi: r(rsiVal, 1), macd: macdVal, macd_signal: macdSig,
              bb_upper: bb?.upper ?? 0, bb_lower: bb?.lower ?? 0,
              support_1: recentLow, support_2: r(stop * 0.98),
              resistance_1: recentHigh, resistance_2: r(target1 * 0.98),
              entry_lo: entryLo, entry_hi: entryHi,
              target_1: target1, target_2: target2, stop,
              w52_high: r(w52High), w52_low: r(w52Low),
              pct_from_52h: w52High > 0 ? r((price - w52High) / w52High * 100, 1) : 0,
              vol_ratio: volRatio,
              bias: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL',
              signals,
            };

            _cache.set(sym, { data, ts: Date.now() });
            return Response.json({ ...data, cached: false },
              { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
          }
        }
      }
    }
  } catch { /* fall through to scan-only */ }

  // Fallback: scan data only (Yahoo Finance unavailable)
  if (!scanHit) return Response.json({ error: 'data unavailable' }, { status: 503 });

  const cmp = scanHit.cmp;
  const data = {
    symbol: sym, name: scanHit.name,
    price: cmp, change_pct: scanHit.chg,
    ema5: 0, ema20: scanHit.ema20, ema50: 0, sma200: null,
    rsi: scanHit.rsi, macd: 0, macd_signal: 0,
    bb_upper: 0, bb_lower: 0,
    support_1: r(scanHit.sl * 1.01, 1), support_2: scanHit.sl,
    resistance_1: r(scanHit.entry_high * 1.02, 1), resistance_2: r(scanHit.target * 0.97, 1),
    entry_lo: scanHit.entry_low, entry_hi: scanHit.entry_high,
    target_1: scanHit.target, target_2: r(scanHit.target * 1.04, 1), stop: scanHit.sl,
    w52_high: 0, w52_low: 0, pct_from_52h: 0, vol_ratio: 1,
    bias: scanHit.confidence >= 70 ? 'BULLISH' : 'NEUTRAL',
    signals: [
      { type: scanHit.signal, reason: `RSI ${scanHit.rsi} · EMA dist ${scanHit.ema_dist_pct}% · Confidence ${scanHit.confidence}%` },
      ...(scanHit.rsi < 50 ? [{ type: 'BULLISH', reason: 'RSI below midline — momentum building' }] : []),
    ],
  };
  _cache.set(sym, { data, ts: Date.now() });
  return Response.json({ ...data, cached: false },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
}
