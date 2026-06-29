export const runtime = 'edge';
import type { FundStock } from '@/lib/fundamental-scan-types';
import { NSE_SCAN_UNIVERSE } from '@/lib/fundamental-scan-types';

const HDR = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

async function fetchFund(sym: string, sector: string): Promise<FundStock> {
  const ySym = `${sym}.NS`;
  const base: FundStock = { symbol:sym, sector, name:sym, price:null, change_pct:null,
    trailing_pe:null, price_to_book:null, roe:null, net_margin:null, operating_margin:null,
    debt_to_equity:null, revenue_growth:null, dividend_yield:null, market_cap:null };

  try {
    const [chartRes, qsRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
        { headers: HDR, signal: AbortSignal.timeout(7000) }),
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=summaryDetail,financialData`,
        { headers: HDR, signal: AbortSignal.timeout(7000) }),
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSyms = searchParams.get('symbols');

  let universe: Array<{ sym: string; sector: string }>;
  if (rawSyms) {
    const requested = rawSyms.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 25);
    universe = requested.map(s => {
      const found = NSE_SCAN_UNIVERSE.find(u => u.sym === s);
      return found ?? { sym: s, sector: 'Other' };
    });
  } else {
    universe = NSE_SCAN_UNIVERSE;
  }

  const settled = await Promise.allSettled(universe.map(u => fetchFund(u.sym, u.sector)));
  const results = settled.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as FundStock[];

  return Response.json({ results, scanned_at: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
  });
}
