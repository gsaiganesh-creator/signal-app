// Technical analysis for US stocks — RSI, EMA20, MACD, 52W, vol ratio, signal, sector.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function r(v: number, d = 2) { return +v.toFixed(d); }

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
  const ema = (n: number, seed?: number): number[] => {
    const k = 2 / (n + 1), out: number[] = [];
    let v = seed ?? closes.slice(0, n).reduce((a, b) => a + b, 0) / Math.min(n, closes.length);
    for (let i = 0; i < Math.min(n, closes.length); i++) out.push(v);
    for (let i = n; i < closes.length; i++) { v = closes[i] * k + v * (1 - k); out.push(v); }
    return out;
  };
  const e12 = ema(12), e26 = ema(26);
  const len = Math.min(e12.length, e26.length);
  const macdLine = e12.slice(-len).map((v, i) => v - e26.slice(-len)[i]);
  const macdVal = macdLine[macdLine.length - 1] ?? 0;
  const k = 2 / 10;
  let sig = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / Math.min(9, macdLine.length);
  for (let i = 9; i < macdLine.length; i++) sig = macdLine[i] * k + sig * (1 - k);
  return { macd: r(macdVal, 3), signal: r(sig, 3) };
}

const US_SECTORS: Record<string, string> = {
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', GOOGL:'Technology', GOOG:'Technology',
  META:'Technology', AMD:'Technology', INTC:'Technology', CRM:'Technology', ORCL:'Technology',
  ADBE:'Technology', AVGO:'Technology', QCOM:'Technology', TXN:'Technology', MU:'Technology',
  AMZN:'Consumer Disc.', TSLA:'Consumer Disc.', HD:'Consumer Disc.', MCD:'Consumer Disc.',
  NKE:'Consumer Disc.', SBUX:'Consumer Disc.', TGT:'Consumer Disc.', COST:'Consumer Disc.',
  LOW:'Consumer Disc.', BKNG:'Consumer Disc.',
  JPM:'Financials', BAC:'Financials', V:'Financials', MA:'Financials', GS:'Financials',
  MS:'Financials', WFC:'Financials', C:'Financials', BLK:'Financials', SCHW:'Financials',
  JNJ:'Healthcare', UNH:'Healthcare', PFE:'Healthcare', ABBV:'Healthcare', LLY:'Healthcare',
  MRK:'Healthcare', BMY:'Healthcare', AMGN:'Healthcare', ABT:'Healthcare', MDT:'Healthcare',
  XOM:'Energy', CVX:'Energy', COP:'Energy', SLB:'Energy', PSX:'Energy',
  LIN:'Materials', APD:'Materials', FCX:'Materials', NEM:'Materials',
  CAT:'Industrials', HON:'Industrials', GE:'Industrials', UPS:'Industrials', BA:'Industrials',
  DE:'Industrials', MMM:'Industrials', RTX:'Industrials',
  NEE:'Utilities', DUK:'Utilities', SO:'Utilities',
  PLD:'Real Estate', AMT:'Real Estate', EQIX:'Real Estate',
  PG:'Consumer Staples', KO:'Consumer Staples', PEP:'Consumer Staples', WMT:'Consumer Staples',
  BRKB:'Diversified', 'BRK-B':'Diversified', BRK:'Diversified',
  SPY:'ETF', QQQ:'ETF', IVV:'ETF', VOO:'ETF', VTI:'ETF', ARKK:'ETF',
};

interface YahooChart {
  chart?: { result?: Array<{
    meta?: {
      regularMarketPrice?: number; regularMarketVolume?: number;
      averageDailyVolume10Day?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
      regularMarketChangePercent?: number;
    };
    indicators?: { quote?: Array<{ close?: (number|null)[]; volume?: (number|null)[] }> };
  }> };
}

const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 1_800_000; // 30 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('symbols') ?? '';
  const symbols = [...new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 20);
  if (!symbols.length) return Response.json({});

  const result: Record<string, unknown> = {};

  await Promise.allSettled(symbols.map(async sym => {
    const cached = _cache.get(sym);
    if (cached && Date.now() - cached.ts < CACHE_TTL) { result[sym] = cached.data; return; }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signalgenie/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('json')) return;
      const json = await res.json() as YahooChart;
      const result0 = json?.chart?.result?.[0];
      if (!result0) return;

      const m = result0.meta ?? {};
      const q = result0.indicators?.quote?.[0] ?? {};
      const closes = (q.close ?? []).filter((c): c is number => c != null && isFinite(c));
      const vols   = (q.volume ?? []).filter((v): v is number => v != null && isFinite(v));
      if (closes.length < 14) return;

      const price      = m.regularMarketPrice ?? closes.at(-1) ?? 0;
      const ema20      = r(calcEma(closes, 20));
      const rsiVal     = calcRsi(closes) ?? 50;
      const { macd: macdVal, signal: macdSig } = calcMacd(closes);
      const w52High    = m.fiftyTwoWeekHigh ?? 0;
      const w52Low     = m.fiftyTwoWeekLow  ?? 0;
      const avgVol     = m.averageDailyVolume10Day ?? (vols.length > 10 ? vols.slice(-10).reduce((a, b) => a + b, 0) / 10 : 0);
      const lastVol    = m.regularMarketVolume ?? vols.at(-1) ?? 0;
      const volRatio   = avgVol > 0 ? r(lastVol / avgVol) : 1;
      const pctFrom52h = w52High > 0 ? r((price - w52High) / w52High * 100, 1) : 0;
      const chgPct     = m.regularMarketChangePercent ?? 0;

      const signal = rsiVal < 38 ? 'BUY' : rsiVal > 70 ? 'SELL' : macdVal > macdSig ? 'BUY' : 'HOLD';

      const data = {
        rsi: r(rsiVal, 1), ema20, macd: macdVal, macd_signal: macdSig,
        macd_bullish: macdVal > macdSig, w52_high: r(w52High), w52_low: r(w52Low),
        pct_from_52h: pctFrom52h, vol_ratio: volRatio, chg_pct: r(chgPct, 2),
        signal, sector: US_SECTORS[sym] ?? 'Other',
      };
      _cache.set(sym, { data, ts: Date.now() });
      result[sym] = data;
    } catch { /* skip */ }
  }));

  return Response.json(result, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
}
