export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS` : exchange === 'BSE' ? `${symbol}.BO` : symbol;
  const hdrs = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };
  const url  = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=incomeStatementHistory,balanceSheetHistory`;

  try {
    const res = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return Response.json({ error: `yahoo ${res.status}` }, { status: 502 });

    const data = await res.json() as {
      quoteSummary?: {
        result?: Array<{
          incomeStatementHistory?: {
            incomeStatementHistory?: Array<{
              endDate?: { fmt?: string };
              totalRevenue?: { raw?: number };
              grossProfit?: { raw?: number };
              ebit?: { raw?: number };
              netIncome?: { raw?: number };
            }>;
          };
          balanceSheetHistory?: {
            balanceSheetStatements?: Array<{
              endDate?: { fmt?: string };
              totalAssets?: { raw?: number };
              totalLiab?: { raw?: number };
              totalStockholderEquity?: { raw?: number };
              longTermDebt?: { raw?: number };
              cash?: { raw?: number };
            }>;
          };
        }>;
      };
    };

    const qs = data?.quoteSummary?.result?.[0];
    if (!qs) return Response.json({ error: 'no data' }, { status: 404 });

    const income = (qs.incomeStatementHistory?.incomeStatementHistory ?? [])
      .map(s => ({
        year:     s.endDate?.fmt?.slice(0, 4) ?? '—',
        revenue:  s.totalRevenue?.raw  ?? null,
        gross:    s.grossProfit?.raw   ?? null,
        ebit:     s.ebit?.raw          ?? null,
        net:      s.netIncome?.raw     ?? null,
      }))
      .reverse(); // oldest first

    const balance = (qs.balanceSheetHistory?.balanceSheetStatements ?? [])
      .map(s => ({
        year:   s.endDate?.fmt?.slice(0, 4) ?? '—',
        assets: s.totalAssets?.raw              ?? null,
        liab:   s.totalLiab?.raw               ?? null,
        equity: s.totalStockholderEquity?.raw   ?? null,
        debt:   s.longTermDebt?.raw             ?? null,
        cash:   s.cash?.raw                     ?? null,
        de:     (s.longTermDebt?.raw && s.totalStockholderEquity?.raw && s.totalStockholderEquity.raw !== 0)
                  ? +(s.longTermDebt.raw / s.totalStockholderEquity.raw).toFixed(2)
                  : null,
      }))
      .reverse();

    return Response.json({ symbol, exchange, income, balance }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=3600' },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
