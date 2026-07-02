// Batch dividend data for portfolio holdings — ex-date, yield, annual div.
// Primary: quoteSummary summaryDetail+calendarEvents
// Fallback: chart API dividends events (better coverage for Indian NSE stocks)
export const runtime = 'edge';

interface DivResult {
  symbol: string;
  ex_div_date: string | null;
  div_yield: number | null;          // % e.g. 1.5 = 1.5%
  annual_div_per_share: number | null; // INR/USD
  days_to_ex: number | null;
  source?: 'live' | 'history';       // 'history' = past ex-date from chart events
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('symbols') ?? '').trim();
  if (!raw) return Response.json({ error: 'symbols required' }, { status: 400 });

  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
  const hdrs = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

  const results: DivResult[] = await Promise.all(
    symbols.map(async (ySym): Promise<DivResult> => {
      const bare = ySym.replace(/\.(NS|BO)$/i, '');
      try {
        // --- Primary: quoteSummary ---
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=summaryDetail,calendarEvents`;
        const r   = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(6000) });

        let exDate: string | null  = null;
        let daysTo: number | null  = null;
        let divYield: number | null = null;
        let divRate: number | null  = null;

        if (r.ok) {
          const d = await r.json() as {
            quoteSummary?: { result?: Array<{
              summaryDetail?: {
                dividendYield?:  { raw?: number };
                dividendRate?:   { raw?: number };
                exDividendDate?: { raw?: number };
              };
              calendarEvents?: { dividendDate?: { raw?: number } };
            }> }
          };

          const qs  = d?.quoteSummary?.result?.[0];
          const sd  = qs?.summaryDetail;
          const cal = qs?.calendarEvents;

          const exRaw = sd?.exDividendDate?.raw ?? cal?.dividendDate?.raw ?? null;
          if (exRaw) {
            const ms = exRaw * 1000;
            exDate = new Date(ms).toISOString().split('T')[0];
            daysTo = Math.ceil((ms - Date.now()) / 86_400_000);
          }
          divYield = sd?.dividendYield?.raw ? +(sd.dividendYield.raw * 100).toFixed(2) : null;
          divRate  = sd?.dividendRate?.raw  ?? null;
        }

        // --- Fallback: chart dividends events (better for Indian stocks) ---
        if (divYield == null && divRate == null) {
          try {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?events=dividends&range=2y&interval=1mo`;
            const cr = await fetch(chartUrl, { headers: hdrs, signal: AbortSignal.timeout(6000) });
            if (cr.ok) {
              const cd = await cr.json() as {
                chart?: { result?: Array<{
                  meta?: { regularMarketPrice?: number };
                  events?: { dividends?: Record<string, { amount: number; date: number }> };
                }> }
              };
              const res0    = cd?.chart?.result?.[0];
              const divEvts = res0?.events?.dividends;
              if (divEvts) {
                const allDivs      = Object.values(divEvts);
                const oneYearAgo   = Date.now() / 1000 - 365 * 86400;
                const recentDivs   = allDivs.filter(d => d.date > oneYearAgo);
                if (recentDivs.length > 0) {
                  const totalAnnual = recentDivs.reduce((s, d) => s + d.amount, 0);
                  divRate = +totalAnnual.toFixed(2);
                  // Use most recent past ex-date (days_to_ex will be negative)
                  if (exDate == null) {
                    const latest = allDivs.sort((a, b) => b.date - a.date)[0];
                    exDate = new Date(latest.date * 1000).toISOString().split('T')[0];
                    daysTo = Math.ceil((latest.date * 1000 - Date.now()) / 86_400_000);
                  }
                  // Compute yield from current price if available
                  const price = res0?.meta?.regularMarketPrice;
                  if (price && price > 0 && divYield == null) {
                    divYield = +(totalAnnual / price * 100).toFixed(2);
                  }
                  return { symbol: bare, ex_div_date: exDate, div_yield: divYield, annual_div_per_share: divRate, days_to_ex: daysTo, source: 'history' };
                }
              }
            }
          } catch {
            // chart fallback failed — return whatever we have from quoteSummary
          }
        }

        return { symbol: bare, ex_div_date: exDate, div_yield: divYield, annual_div_per_share: divRate, days_to_ex: daysTo, source: 'live' };
      } catch {
        return { symbol: bare, ex_div_date: null, div_yield: null, annual_div_per_share: null, days_to_ex: null };
      }
    })
  );

  // Return stocks that have any dividend data (yield, rate, or ex-date)
  const withData = results.filter(r => r.div_yield != null || r.annual_div_per_share != null || r.ex_div_date != null);

  return Response.json({ results: withData }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800' },
  });
}
