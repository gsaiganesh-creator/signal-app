// Batch dividend data for portfolio holdings — ex-date, yield, annual div.
// Lightweight: only fetches summaryDetail + calendarEvents from quoteSummary.
export const runtime = 'edge';

interface DivResult {
  symbol: string;
  ex_div_date: string | null;
  div_yield: number | null;          // % e.g. 1.5 = 1.5%
  annual_div_per_share: number | null; // INR/USD
  days_to_ex: number | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('symbols') ?? '').trim();
  if (!raw) return Response.json({ error: 'symbols required' }, { status: 400 });

  // symbols param: comma-separated Yahoo tickers e.g. "RELIANCE.NS,TCS.NS,AAPL"
  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
  const hdrs = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

  const results: DivResult[] = await Promise.all(
    symbols.map(async (ySym): Promise<DivResult> => {
      const bare = ySym.replace(/\.(NS|BO)$/i, '');
      try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=summaryDetail,calendarEvents`;
        const r   = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(7000) });
        if (!r.ok) return { symbol: bare, ex_div_date: null, div_yield: null, annual_div_per_share: null, days_to_ex: null };

        const d  = await r.json() as {
          quoteSummary?: { result?: Array<{
            summaryDetail?: {
              dividendYield?:  { raw?: number };
              dividendRate?:   { raw?: number };
              exDividendDate?: { raw?: number };
            };
            calendarEvents?: {
              dividendDate?: { raw?: number };
            };
          }> }
        };

        const qs  = d?.quoteSummary?.result?.[0];
        const sd  = qs?.summaryDetail;
        const cal = qs?.calendarEvents;

        // ex-div date (prefer summaryDetail, fallback calendarEvents.dividendDate)
        const exRaw = sd?.exDividendDate?.raw ?? cal?.dividendDate?.raw ?? null;
        let exDate: string | null  = null;
        let daysTo: number | null = null;
        if (exRaw) {
          const ms = exRaw * 1000;
          exDate  = new Date(ms).toISOString().split('T')[0];
          daysTo  = Math.ceil((ms - Date.now()) / 86_400_000);
        }

        const divYield = sd?.dividendYield?.raw ? +(sd.dividendYield.raw * 100).toFixed(2) : null;
        const divRate  = sd?.dividendRate?.raw  ?? null;

        return { symbol: bare, ex_div_date: exDate, div_yield: divYield, annual_div_per_share: divRate, days_to_ex: daysTo };
      } catch {
        return { symbol: bare, ex_div_date: null, div_yield: null, annual_div_per_share: null, days_to_ex: null };
      }
    })
  );

  // Only return stocks that have dividend data
  const withData = results.filter(r => r.div_yield != null || r.ex_div_date != null);

  return Response.json({ results: withData }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800' },
  });
}
