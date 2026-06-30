// Node.js runtime — needs longer timeout for 100-stock scan
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { setScanCache, getScanCache, isCacheFresh, SCAN_TTL } from './_cache';

// ─── Universe (top 4 per sector, 100 stocks) ──────────────────────────────────
const UNIVERSE = [
  {symbol:'HAL.NS',name:'Hindustan Aeronautics',sector:'Defense'},{symbol:'BEL.NS',name:'Bharat Electronics',sector:'Defense'},{symbol:'BDL.NS',name:'Bharat Dynamics',sector:'Defense'},{symbol:'COCHINSHIP.NS',name:'Cochin Shipyard',sector:'Defense'},
  {symbol:'DIXON.NS',name:'Dixon Technologies',sector:'Semiconductor'},{symbol:'KAYNES.NS',name:'Kaynes Technology',sector:'Semiconductor'},{symbol:'SYRMA.NS',name:'Syrma SGS Technology',sector:'Semiconductor'},{symbol:'AVALON.NS',name:'Avalon Technologies',sector:'Semiconductor'},
  {symbol:'TATACOMM.NS',name:'Tata Communications',sector:'Telecom'},{symbol:'ROUTE.NS',name:'Route Mobile',sector:'Telecom'},{symbol:'TANLA.NS',name:'Tanla Platforms',sector:'Telecom'},{symbol:'STLTECH.NS',name:'STL Tech',sector:'Telecom'},
  {symbol:'RELIANCE.NS',name:'Reliance Industries',sector:'Oil_Gas'},{symbol:'ONGC.NS',name:'ONGC',sector:'Oil_Gas'},{symbol:'BPCL.NS',name:'BPCL',sector:'Oil_Gas'},{symbol:'IOC.NS',name:'Indian Oil',sector:'Oil_Gas'},
  {symbol:'HDFCBANK.NS',name:'HDFC Bank',sector:'Banks'},{symbol:'ICICIBANK.NS',name:'ICICI Bank',sector:'Banks'},{symbol:'SBIN.NS',name:'State Bank of India',sector:'Banks'},{symbol:'KOTAKBANK.NS',name:'Kotak Mahindra Bank',sector:'Banks'},
  {symbol:'BAJFINANCE.NS',name:'Bajaj Finance',sector:'Finance'},{symbol:'BAJAJFINSV.NS',name:'Bajaj Finserv',sector:'Finance'},{symbol:'CHOLAFIN.NS',name:'Cholamandalam Finance',sector:'Finance'},{symbol:'MUTHOOTFIN.NS',name:'Muthoot Finance',sector:'Finance'},
  {symbol:'NTPC.NS',name:'NTPC',sector:'Power'},{symbol:'POWERGRID.NS',name:'Power Grid',sector:'Power'},{symbol:'TATAPOWER.NS',name:'Tata Power',sector:'Power'},{symbol:'RECLTD.NS',name:'REC Limited',sector:'Power'},
  {symbol:'BHEL.NS',name:'BHEL',sector:'Capital_Goods'},{symbol:'ABB.NS',name:'ABB India',sector:'Capital_Goods'},{symbol:'SIEMENS.NS',name:'Siemens India',sector:'Capital_Goods'},{symbol:'CUMMINSIND.NS',name:'Cummins India',sector:'Capital_Goods'},
  {symbol:'MARUTI.NS',name:'Maruti Suzuki',sector:'Auto'},{symbol:'M&M.NS',name:'Mahindra & Mahindra',sector:'Auto'},{symbol:'BAJAJ-AUTO.NS',name:'Bajaj Auto',sector:'Auto'},{symbol:'HEROMOTOCO.NS',name:'Hero MotoCorp',sector:'Auto'},
  {symbol:'SUNPHARMA.NS',name:'Sun Pharma',sector:'Pharma'},{symbol:'DRREDDY.NS',name:"Dr Reddy's",sector:'Pharma'},{symbol:'CIPLA.NS',name:'Cipla',sector:'Pharma'},{symbol:'DIVISLAB.NS',name:"Divi's Laboratories",sector:'Pharma'},
  {symbol:'TATASTEEL.NS',name:'Tata Steel',sector:'Metal'},{symbol:'JSWSTEEL.NS',name:'JSW Steel',sector:'Metal'},{symbol:'HINDALCO.NS',name:'Hindalco',sector:'Metal'},{symbol:'NATIONALUM.NS',name:'NALCO',sector:'Metal'},
  {symbol:'LT.NS',name:'Larsen & Toubro',sector:'Infra'},{symbol:'ULTRACEMCO.NS',name:'UltraTech Cement',sector:'Infra'},{symbol:'AMBUJACEM.NS',name:'Ambuja Cements',sector:'Infra'},{symbol:'ACC.NS',name:'ACC Limited',sector:'Infra'},
  {symbol:'HINDUNILVR.NS',name:'Hindustan Unilever',sector:'FMCG'},{symbol:'ITC.NS',name:'ITC',sector:'FMCG'},{symbol:'DABUR.NS',name:'Dabur India',sector:'FMCG'},{symbol:'MARICO.NS',name:'Marico',sector:'FMCG'},
  {symbol:'SRF.NS',name:'SRF Limited',sector:'Chemicals'},{symbol:'DEEPAKNTR.NS',name:'Deepak Nitrite',sector:'Chemicals'},{symbol:'AARTIIND.NS',name:'Aarti Industries',sector:'Chemicals'},{symbol:'NAVINFLUOR.NS',name:'Navin Fluorine',sector:'Chemicals'},
  {symbol:'ASIANPAINT.NS',name:'Asian Paints',sector:'Paints'},{symbol:'BERGEPAINT.NS',name:'Berger Paints',sector:'Paints'},{symbol:'KANSAINER.NS',name:'Kansai Nerolac',sector:'Paints'},{symbol:'AKZOINDIA.NS',name:'Akzo Nobel India',sector:'Paints'},
  {symbol:'APOLLOHOSP.NS',name:'Apollo Hospitals',sector:'Healthcare'},{symbol:'FORTIS.NS',name:'Fortis Healthcare',sector:'Healthcare'},{symbol:'MAXHEALTH.NS',name:'Max Healthcare',sector:'Healthcare'},{symbol:'NH.NS',name:'Narayana Hrudayalaya',sector:'Healthcare'},
  {symbol:'DLF.NS',name:'DLF',sector:'Real_Estate'},{symbol:'GODREJPROP.NS',name:'Godrej Properties',sector:'Real_Estate'},{symbol:'OBEROIRLTY.NS',name:'Oberoi Realty',sector:'Real_Estate'},{symbol:'LODHA.NS',name:'Macrotech Developers',sector:'Real_Estate'},
  {symbol:'INDIGO.NS',name:'IndiGo',sector:'Aviation'},{symbol:'BLUEDART.NS',name:'Blue Dart Express',sector:'Aviation'},{symbol:'CONCOR.NS',name:'Container Corp',sector:'Aviation'},{symbol:'DELHIVERY.NS',name:'Delhivery',sector:'Aviation'},
  {symbol:'DMART.NS',name:'Avenue Supermarts',sector:'Retail'},{symbol:'TRENT.NS',name:'Trent',sector:'Retail'},{symbol:'METROBRAND.NS',name:'Metro Brands',sector:'Retail'},{symbol:'VMART.NS',name:'V-Mart Retail',sector:'Retail'},
  {symbol:'HAVELLS.NS',name:'Havells India',sector:'Consumer'},{symbol:'VOLTAS.NS',name:'Voltas',sector:'Consumer'},{symbol:'BLUESTAR.NS',name:'Blue Star',sector:'Consumer'},{symbol:'CROMPTON.NS',name:'Crompton Greaves',sector:'Consumer'},
  {symbol:'ADANIGREEN.NS',name:'Adani Green Energy',sector:'Renewables'},{symbol:'SUZLON.NS',name:'Suzlon Energy',sector:'Renewables'},{symbol:'INOXWIND.NS',name:'Inox Wind',sector:'Renewables'},{symbol:'SWSOLAR.NS',name:'Sterling & Wilson Solar',sector:'Renewables'},
  {symbol:'HDFCAMC.NS',name:'HDFC AMC',sector:'AMC_Wealth'},{symbol:'UTIAMC.NS',name:'UTI AMC',sector:'AMC_Wealth'},{symbol:'NAM-INDIA.NS',name:'Nippon Life India AMC',sector:'AMC_Wealth'},{symbol:'NUVAMA.NS',name:'Nuvama Wealth',sector:'AMC_Wealth'},
  {symbol:'PAGEIND.NS',name:'Page Industries',sector:'Textiles'},{symbol:'KPRMILL.NS',name:'KPR Mill',sector:'Textiles'},{symbol:'WELENT.NS',name:'Welspun India',sector:'Textiles'},{symbol:'ARVIND.NS',name:'Arvind',sector:'Textiles'},
  {symbol:'UPL.NS',name:'UPL',sector:'Agri'},{symbol:'COROMANDEL.NS',name:'Coromandel International',sector:'Agri'},{symbol:'CHAMBLFERT.NS',name:'Chambal Fertilisers',sector:'Agri'},{symbol:'DEEPAKFERT.NS',name:'Deepak Fertilisers',sector:'Agri'},
  {symbol:'SUNTV.NS',name:'Sun TV Network',sector:'Media'},{symbol:'ZEEL.NS',name:'Zee Entertainment',sector:'Media'},{symbol:'PVRINOX.NS',name:'PVR Inox',sector:'Media'},{symbol:'SAREGAMA.NS',name:'Saregama India',sector:'Media'},
  {symbol:'TCS.NS',name:'TCS',sector:'IT'},{symbol:'INFY.NS',name:'Infosys',sector:'IT'},{symbol:'WIPRO.NS',name:'Wipro',sector:'IT'},{symbol:'HCLTECH.NS',name:'HCL Technologies',sector:'IT'},
];

// ─── Math helpers ─────────────────────────────────────────────────────────────
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

// ─── Yahoo Finance fetch ──────────────────────────────────────────────────────
interface YahooChart {
  chart?: { result?: Array<{
    meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number };
    indicators?: { quote?: Array<{ close?: (number|null)[]; volume?: (number|null)[] }> };
  }> };
}

async function fetchCloses(symbol: string): Promise<{ closes: number[]; chg: number; vol: number; avgVol: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2mo`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal/1.0)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return { closes: [], chg: 0, vol: 0, avgVol: 0 };
  const data = await res.json() as YahooChart;
  const result = data?.chart?.result?.[0];
  const raw = result?.indicators?.quote?.[0]?.close ?? [];
  const vols = result?.indicators?.quote?.[0]?.volume ?? [];
  const closes = raw.filter((c): c is number => c != null && isFinite(c));
  const volNums = vols.filter((v): v is number => v != null && isFinite(v));
  const avgVol = volNums.length ? volNums.reduce((a, b) => a + b, 0) / volNums.length : 0;
  const lastVol = volNums[volNums.length - 1] ?? 0;
  return {
    closes,
    chg: result?.meta?.regularMarketChangePercent ?? 0,
    vol: lastVol,
    avgVol,
  };
}

interface Signal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

// Cache lives in _cache.ts — shared with the per-ticker route

async function runScan(): Promise<Signal[]> {
  const BATCH = 10;
  const results: Signal[] = [];

  for (let i = 0; i < UNIVERSE.length; i += BATCH) {
    const batch = UNIVERSE.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (stock) => {
        const { closes, chg, vol, avgVol } = await fetchCloses(stock.symbol);
        if (closes.length < 22) return null;
        const cmp = closes[closes.length - 1];
        if (cmp < 100) return null;
        if (chg > 4.0) return null; // skip gap-up stocks

        const rsiVal = calcRsi(closes);
        if (rsiVal == null || rsiVal < 42 || rsiVal > 62) return null;

        const ema10 = calcEma(closes, 10);
        const ema20 = calcEma(closes, 20);
        const emaDist = (cmp - ema20) / ema20 * 100;
        if (emaDist > 8) return null;

        const support = cmp > Math.max(ema10, ema20) ? Math.max(ema10, ema20) : Math.min(ema10, ema20);
        const entryLow  = r(Math.min(cmp, support) * 0.99, 1);
        const entryHigh = r(cmp * 1.005, 1);
        const sl        = r(support * 0.95, 1);
        const target    = r(cmp * 1.10, 1);
        const volBonus  = (avgVol > 0 && vol / avgVol > 1.5) ? 2 : 0;
        const score     = (10 - Math.abs(rsiVal - 52)) + (5 - Math.abs(emaDist)) + volBonus;
        return {
          symbol: stock.symbol, name: stock.name, sector: stock.sector,
          cmp: r(cmp), chg: r(chg, 2), rsi: r(rsiVal, 1), ema20: r(ema20),
          ema_dist_pct: r(emaDist, 1), entry_low: entryLow, entry_high: entryHigh,
          target, sl, signal: 'BUY', confidence: Math.min(100, Math.round(50 + score * 3)),
          score: r(score),
        } satisfies Signal;
      })
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  const cached = getScanCache();
  if (isCacheFresh() && cached) {
    return Response.json(
      { signals: cached.data.slice(0, limit), count: cached.data.slice(0, limit).length, cached: true },
      { headers: { 'Cache-Control': `public, s-maxage=${SCAN_TTL / 1000}, stale-while-revalidate=86400` } }
    );
  }

  try {
    const picks = await runScan();
    setScanCache(picks);
    return Response.json(
      { signals: picks.slice(0, limit), count: picks.slice(0, limit).length, cached: false },
      { headers: { 'Cache-Control': `public, s-maxage=${SCAN_TTL / 1000}, stale-while-revalidate=86400` } }
    );
  } catch (e) {
    return Response.json({ error: String(e), signals: [], count: 0 }, { status: 500 });
  }
}
