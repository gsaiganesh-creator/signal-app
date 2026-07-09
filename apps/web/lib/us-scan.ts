// Live US momentum scan — mirrors lib/india-scan.ts exactly (same on-demand
// Yahoo Finance + in-memory-cache pattern) so US Signals behaves just like
// India Signals during market hours: fresh data on cache-miss, any time of
// day, not gated behind the once-daily apps/api/core/us_scan.py snapshot.
// Universe + scoring formula ported from us_scan.py (same 100-stock list,
// same RSI/EMA/score math) — keep both in sync if either changes.

export const UNIVERSE = [
  {symbol:'AAPL',name:'Apple Inc',sector:'Technology'},{symbol:'MSFT',name:'Microsoft Corp',sector:'Technology'},{symbol:'NVDA',name:'NVIDIA Corp',sector:'Technology'},{symbol:'GOOGL',name:'Alphabet Inc Class A',sector:'Technology'},{symbol:'GOOG',name:'Alphabet Inc Class C',sector:'Technology'},{symbol:'META',name:'Meta Platforms Inc',sector:'Technology'},{symbol:'AMD',name:'Advanced Micro Devices',sector:'Technology'},{symbol:'INTC',name:'Intel Corp',sector:'Technology'},{symbol:'CRM',name:'Salesforce Inc',sector:'Technology'},{symbol:'ORCL',name:'Oracle Corp',sector:'Technology'},{symbol:'ADBE',name:'Adobe Inc',sector:'Technology'},{symbol:'AVGO',name:'Broadcom Inc',sector:'Technology'},{symbol:'QCOM',name:'Qualcomm Inc',sector:'Technology'},{symbol:'TXN',name:'Texas Instruments',sector:'Technology'},{symbol:'MU',name:'Micron Technology',sector:'Technology'},{symbol:'CSCO',name:'Cisco Systems',sector:'Technology'},{symbol:'IBM',name:'International Business Machines',sector:'Technology'},
  {symbol:'NFLX',name:'Netflix Inc',sector:'Communication_Services'},{symbol:'DIS',name:'Walt Disney Co',sector:'Communication_Services'},{symbol:'CMCSA',name:'Comcast Corp',sector:'Communication_Services'},{symbol:'VZ',name:'Verizon Communications',sector:'Communication_Services'},{symbol:'T',name:'AT&T Inc',sector:'Communication_Services'},{symbol:'TMUS',name:'T-Mobile US',sector:'Communication_Services'},
  {symbol:'AMZN',name:'Amazon.com Inc',sector:'Consumer_Discretionary'},{symbol:'TSLA',name:'Tesla Inc',sector:'Consumer_Discretionary'},{symbol:'HD',name:'Home Depot',sector:'Consumer_Discretionary'},{symbol:'MCD',name:'McDonald\'s Corp',sector:'Consumer_Discretionary'},{symbol:'NKE',name:'Nike Inc',sector:'Consumer_Discretionary'},{symbol:'SBUX',name:'Starbucks Corp',sector:'Consumer_Discretionary'},{symbol:'TGT',name:'Target Corp',sector:'Consumer_Discretionary'},{symbol:'COST',name:'Costco Wholesale',sector:'Consumer_Discretionary'},{symbol:'LOW',name:'Lowe\'s Companies',sector:'Consumer_Discretionary'},{symbol:'BKNG',name:'Booking Holdings',sector:'Consumer_Discretionary'},{symbol:'CMG',name:'Chipotle Mexican Grill',sector:'Consumer_Discretionary'},{symbol:'ORLY',name:'O\'Reilly Automotive',sector:'Consumer_Discretionary'},
  {symbol:'JPM',name:'JPMorgan Chase',sector:'Financials'},{symbol:'BAC',name:'Bank of America',sector:'Financials'},{symbol:'V',name:'Visa Inc',sector:'Financials'},{symbol:'MA',name:'Mastercard Inc',sector:'Financials'},{symbol:'GS',name:'Goldman Sachs',sector:'Financials'},{symbol:'MS',name:'Morgan Stanley',sector:'Financials'},{symbol:'WFC',name:'Wells Fargo',sector:'Financials'},{symbol:'C',name:'Citigroup Inc',sector:'Financials'},{symbol:'BLK',name:'BlackRock Inc',sector:'Financials'},{symbol:'SCHW',name:'Charles Schwab',sector:'Financials'},{symbol:'AXP',name:'American Express',sector:'Financials'},{symbol:'SPGI',name:'S&P Global Inc',sector:'Financials'},{symbol:'PYPL',name:'PayPal Holdings',sector:'Financials'},
  {symbol:'JNJ',name:'Johnson & Johnson',sector:'Healthcare'},{symbol:'UNH',name:'UnitedHealth Group',sector:'Healthcare'},{symbol:'PFE',name:'Pfizer Inc',sector:'Healthcare'},{symbol:'ABBV',name:'AbbVie Inc',sector:'Healthcare'},{symbol:'LLY',name:'Eli Lilly and Co',sector:'Healthcare'},{symbol:'MRK',name:'Merck & Co',sector:'Healthcare'},{symbol:'BMY',name:'Bristol-Myers Squibb',sector:'Healthcare'},{symbol:'AMGN',name:'Amgen Inc',sector:'Healthcare'},{symbol:'ABT',name:'Abbott Laboratories',sector:'Healthcare'},{symbol:'MDT',name:'Medtronic plc',sector:'Healthcare'},{symbol:'CVS',name:'CVS Health Corp',sector:'Healthcare'},{symbol:'TMO',name:'Thermo Fisher Scientific',sector:'Healthcare'},{symbol:'DHR',name:'Danaher Corp',sector:'Healthcare'},
  {symbol:'XOM',name:'Exxon Mobil Corp',sector:'Energy'},{symbol:'CVX',name:'Chevron Corp',sector:'Energy'},{symbol:'COP',name:'ConocoPhillips',sector:'Energy'},{symbol:'SLB',name:'Schlumberger NV',sector:'Energy'},{symbol:'PSX',name:'Phillips 66',sector:'Energy'},
  {symbol:'LIN',name:'Linde plc',sector:'Materials'},{symbol:'APD',name:'Air Products and Chemicals',sector:'Materials'},{symbol:'FCX',name:'Freeport-McMoRan',sector:'Materials'},{symbol:'NEM',name:'Newmont Corp',sector:'Materials'},{symbol:'SHW',name:'Sherwin-Williams',sector:'Materials'},{symbol:'ECL',name:'Ecolab Inc',sector:'Materials'},
  {symbol:'CAT',name:'Caterpillar Inc',sector:'Industrials'},{symbol:'HON',name:'Honeywell International',sector:'Industrials'},{symbol:'GE',name:'General Electric',sector:'Industrials'},{symbol:'UPS',name:'United Parcel Service',sector:'Industrials'},{symbol:'BA',name:'Boeing Co',sector:'Industrials'},{symbol:'DE',name:'Deere & Co',sector:'Industrials'},{symbol:'MMM',name:'3M Co',sector:'Industrials'},{symbol:'RTX',name:'RTX Corp',sector:'Industrials'},{symbol:'LMT',name:'Lockheed Martin',sector:'Industrials'},{symbol:'NOC',name:'Northrop Grumman',sector:'Industrials'},{symbol:'GD',name:'General Dynamics',sector:'Industrials'},
  {symbol:'NEE',name:'NextEra Energy',sector:'Utilities'},{symbol:'DUK',name:'Duke Energy',sector:'Utilities'},{symbol:'SO',name:'Southern Co',sector:'Utilities'},{symbol:'D',name:'Dominion Energy',sector:'Utilities'},{symbol:'EXC',name:'Exelon Corp',sector:'Utilities'},
  {symbol:'PLD',name:'Prologis Inc',sector:'Real_Estate'},{symbol:'AMT',name:'American Tower Corp',sector:'Real_Estate'},{symbol:'EQIX',name:'Equinix Inc',sector:'Real_Estate'},{symbol:'SPG',name:'Simon Property Group',sector:'Real_Estate'},{symbol:'O',name:'Realty Income Corp',sector:'Real_Estate'},
  {symbol:'PG',name:'Procter & Gamble',sector:'Consumer_Staples'},{symbol:'KO',name:'Coca-Cola Co',sector:'Consumer_Staples'},{symbol:'PEP',name:'PepsiCo Inc',sector:'Consumer_Staples'},{symbol:'WMT',name:'Walmart Inc',sector:'Consumer_Staples'},{symbol:'PM',name:'Philip Morris International',sector:'Consumer_Staples'},{symbol:'MO',name:'Altria Group',sector:'Consumer_Staples'},
  {symbol:'BRK-B',name:'Berkshire Hathaway Class B',sector:'Diversified'},
];

function r(v: number, d = 2) { return +v.toFixed(d); }

export function calcEma(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k);
  return val;
}

export function calcRsi(closes: number[], period = 14): number | null {
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

interface YahooChart {
  chart?: { result?: Array<{
    meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number };
    indicators?: { quote?: Array<{ close?: (number | null)[] }> };
  }> };
}

async function fetchCloses(symbol: string): Promise<{ closes: number[]; chg: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2mo`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal/1.0)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return { closes: [], chg: 0 };
  const data = await res.json() as YahooChart;
  const result = data?.chart?.result?.[0];
  const raw = result?.indicators?.quote?.[0]?.close ?? [];
  const closes = raw.filter((c): c is number => c != null && isFinite(c));
  return { closes, chg: result?.meta?.regularMarketChangePercent ?? 0 };
}

export interface USScanSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

export async function runUsScan(): Promise<USScanSignal[]> {
  const BATCH = 10;
  const results: USScanSignal[] = [];

  for (let i = 0; i < UNIVERSE.length; i += BATCH) {
    const batch = UNIVERSE.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (stock) => {
        const { closes, chg } = await fetchCloses(stock.symbol);
        if (closes.length < 21) return null;
        const cmp = closes[closes.length - 1];
        if (cmp < 20) return null; // us_scan.py's low-price filter (curated large-cap universe)
        if (chg > 3.0) return null; // skip gap-up stocks

        const rsiVal = calcRsi(closes);
        if (rsiVal == null || rsiVal < 42 || rsiVal > 62) return null;

        const ema10 = calcEma(closes, 10);
        const ema20 = calcEma(closes, 20);
        const emaDist = (cmp - ema20) / ema20 * 100;
        if (emaDist > 8) return null;

        const support = cmp > Math.max(ema10, ema20) ? Math.max(ema10, ema20) : Math.min(ema10, ema20);
        const entryLow  = r(Math.min(cmp, support) * 0.99, 2);
        const entryHigh = r(cmp * 1.005, 2);
        const sl        = r(support * 0.95, 2);
        const target    = r(cmp * 1.10, 2);
        const score      = (10 - Math.abs(rsiVal - 52)) + (5 - Math.abs(emaDist));
        return {
          symbol: stock.symbol, name: stock.name, sector: stock.sector,
          cmp: r(cmp), chg: r(chg, 2), rsi: r(rsiVal, 1), ema20: r(ema20),
          ema_dist_pct: r(emaDist, 1), entry_low: entryLow, entry_high: entryHigh,
          target, sl, signal: 'BUY', confidence: Math.min(100, Math.round(50 + score * 3)),
          score: r(score),
        } satisfies USScanSignal;
      })
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
