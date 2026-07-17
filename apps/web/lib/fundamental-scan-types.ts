import { fetchYahooQuoteSummary } from './yahoo-auth';

export type FundStock = {
  symbol: string;
  sector: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  trailing_pe: number | null;
  price_to_book: number | null;
  roe: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  market_cap: number | null;
  dividend_yield: number | null;
};

export const NSE_SCAN_UNIVERSE: Array<{ sym: string; sector: string }> = [
  // IT
  {sym:'TCS',sector:'IT'},{sym:'INFY',sector:'IT'},{sym:'WIPRO',sector:'IT'},{sym:'HCLTECH',sector:'IT'},
  {sym:'TECHM',sector:'IT'},{sym:'LTIM',sector:'IT'},{sym:'MPHASIS',sector:'IT'},{sym:'COFORGE',sector:'IT'},
  {sym:'PERSISTENT',sector:'IT'},{sym:'KPITTECH',sector:'IT'},
  // Banking
  {sym:'HDFCBANK',sector:'Banking'},{sym:'ICICIBANK',sector:'Banking'},{sym:'KOTAKBANK',sector:'Banking'},
  {sym:'AXISBANK',sector:'Banking'},{sym:'SBIN',sector:'Banking'},{sym:'INDUSINDBK',sector:'Banking'},
  {sym:'FEDERALBNK',sector:'Banking'},{sym:'BANDHANBNK',sector:'Banking'},
  // Finance / NBFC
  {sym:'BAJFINANCE',sector:'Finance'},{sym:'BAJAJFINSV',sector:'Finance'},{sym:'CHOLAFIN',sector:'Finance'},
  {sym:'MUTHOOTFIN',sector:'Finance'},{sym:'LICHSGFIN',sector:'Finance'},
  // Auto
  {sym:'MARUTI',sector:'Auto'},{sym:'TATAMOTORS',sector:'Auto'},{sym:'M&M',sector:'Auto'},
  {sym:'BAJAJ-AUTO',sector:'Auto'},{sym:'HEROMOTOCO',sector:'Auto'},{sym:'EICHERMOT',sector:'Auto'},{sym:'TVSMOTOR',sector:'Auto'},
  // Pharma
  {sym:'SUNPHARMA',sector:'Pharma'},{sym:'CIPLA',sector:'Pharma'},{sym:'DRREDDY',sector:'Pharma'},
  {sym:'DIVISLAB',sector:'Pharma'},{sym:'LUPIN',sector:'Pharma'},{sym:'AUROPHARMA',sector:'Pharma'},{sym:'ALKEM',sector:'Pharma'},
  // FMCG
  {sym:'HINDUNILVR',sector:'FMCG'},{sym:'ITC',sector:'FMCG'},{sym:'NESTLEIND',sector:'FMCG'},
  {sym:'BRITANNIA',sector:'FMCG'},{sym:'DABUR',sector:'FMCG'},{sym:'MARICO',sector:'FMCG'},
  {sym:'GODREJCP',sector:'FMCG'},{sym:'TATACONSUM',sector:'FMCG'},
  // Metals
  {sym:'TATASTEEL',sector:'Metals'},{sym:'JSWSTEEL',sector:'Metals'},{sym:'HINDALCO',sector:'Metals'},
  {sym:'VEDL',sector:'Metals'},{sym:'SAIL',sector:'Metals'},{sym:'NMDC',sector:'Metals'},
  // Energy / Power
  {sym:'RELIANCE',sector:'Energy'},{sym:'ONGC',sector:'Energy'},{sym:'NTPC',sector:'Energy'},
  {sym:'POWERGRID',sector:'Energy'},{sym:'COALINDIA',sector:'Energy'},{sym:'BPCL',sector:'Energy'},
  // Realty
  {sym:'DLF',sector:'Realty'},{sym:'GODREJPROP',sector:'Realty'},{sym:'OBEROIREALTY',sector:'Realty'},
  {sym:'PRESTIGE',sector:'Realty'},{sym:'PHOENIXLTD',sector:'Realty'},
  // Telecom
  {sym:'BHARTIARTL',sector:'Telecom'},{sym:'INDUSTOWER',sector:'Telecom'},
  // Consumer / Discretionary
  {sym:'TITAN',sector:'Consumer'},{sym:'ASIANPAINT',sector:'Consumer'},{sym:'PIDILITIND',sector:'Consumer'},
  {sym:'HAVELLS',sector:'Consumer'},{sym:'VOLTAS',sector:'Consumer'},{sym:'TRENT',sector:'Consumer'},
  // Cement
  {sym:'ULTRACEMCO',sector:'Cement'},{sym:'SHREECEM',sector:'Cement'},{sym:'ACC',sector:'Cement'},{sym:'AMBUJACEM',sector:'Cement'},
  // Infra / Capital Goods
  {sym:'LT',sector:'Infra'},{sym:'ABB',sector:'Infra'},{sym:'SIEMENS',sector:'Infra'},{sym:'CUMMINSIND',sector:'Infra'},
  // Hospital / Diagnostics
  {sym:'APOLLOHOSP',sector:'Hospital'},{sym:'FORTIS',sector:'Hospital'},{sym:'MAXHEALTH',sector:'Hospital'},
  // Diversified / New-age
  {sym:'ADANIENT',sector:'Diversified'},{sym:'ZOMATO',sector:'Consumer'},{sym:'IRCTC',sector:'Diversified'},
  {sym:'NAUKRI',sector:'IT'},
];

const FUND_HDR = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

// Moved from app/api/fundamental-scan/route.ts so lib/india-fundamental-scan.ts
// (the "ML Fundamental Strong" ranked scan) can reuse the exact same fetch
// instead of a second, drifting copy — route files should only export route
// handlers, not shared fetch logic other modules need to import.
export async function fetchFund(sym: string, sector: string): Promise<FundStock> {
  const ySym = `${sym}.NS`;
  const base: FundStock = { symbol:sym, sector, name:sym, price:null, change_pct:null,
    trailing_pe:null, price_to_book:null, roe:null, net_margin:null, operating_margin:null,
    debt_to_equity:null, revenue_growth:null, dividend_yield:null, market_cap:null };

  try {
    const [chartRes, qsRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
        { headers: FUND_HDR, signal: AbortSignal.timeout(7000) }),
      fetchYahooQuoteSummary(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=summaryDetail,financialData`),
    ]);

    if (chartRes.ok) {
      const d = await chartRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; longName?: string; shortName?: string } }> } };
      const m = d?.chart?.result?.[0]?.meta;
      base.price      = m?.regularMarketPrice ?? null;
      base.change_pct = m?.regularMarketChangePercent ?? null;
      base.name       = m?.longName ?? m?.shortName ?? sym;
    }

    if (qsRes.ok) {
      const d = await qsRes.json() as {
        quoteSummary?: { result?: Array<{
          summaryDetail?: {
            trailingPE?:    { raw?: number };
            priceToBook?:   { raw?: number };
            marketCap?:     { raw?: number };
            dividendYield?: { raw?: number };
          };
          financialData?: {
            returnOnEquity?:   { raw?: number };
            profitMargins?:    { raw?: number };
            operatingMargins?: { raw?: number };
            debtToEquity?:     { raw?: number };
            revenueGrowth?:    { raw?: number };
          };
        }> }
      };
      const qs = d?.quoteSummary?.result?.[0];
      const sd = qs?.summaryDetail;
      const fd = qs?.financialData;
      base.trailing_pe      = sd?.trailingPE?.raw      ? +sd.trailingPE.raw.toFixed(1)             : null;
      base.price_to_book    = sd?.priceToBook?.raw     ? +sd.priceToBook.raw.toFixed(2)            : null;
      base.market_cap       = sd?.marketCap?.raw       ?? null;
      base.dividend_yield   = sd?.dividendYield?.raw   ? +(sd.dividendYield.raw * 100).toFixed(2)  : null;
      base.roe              = fd?.returnOnEquity?.raw  ? +(fd.returnOnEquity.raw * 100).toFixed(1) : null;
      base.net_margin       = fd?.profitMargins?.raw   ? +(fd.profitMargins.raw * 100).toFixed(1)  : null;
      base.operating_margin = fd?.operatingMargins?.raw? +(fd.operatingMargins.raw * 100).toFixed(1): null;
      base.debt_to_equity   = fd?.debtToEquity?.raw    ? +fd.debtToEquity.raw.toFixed(1)           : null;
      base.revenue_growth   = fd?.revenueGrowth?.raw   ? +(fd.revenueGrowth.raw * 100).toFixed(1)  : null;
    }
  } catch { /* stock failed — return base with nulls */ }

  return base;
}
