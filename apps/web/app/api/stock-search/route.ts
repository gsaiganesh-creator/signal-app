export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 1) return Response.json({ results: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&newsCount=0&quotesCount=10&enableFuzzyQuery=true&enableCb=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal/1.0)', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ results: [] });
    const data = await res.json() as {
      quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string; sector?: string }>;
    };

    const results = (data.quotes ?? [])
      .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || (!q.symbol.includes('.') && q.quoteType === 'EQUITY')))
      .slice(0, 8)
      .map(q => ({
        symbol: q.symbol!.replace('.NS', '').replace('.BO', ''),
        ticker: q.symbol!,
        name:   q.longname ?? q.shortname ?? q.symbol!,
        exchange: q.symbol!.endsWith('.BO') ? 'BSE' : 'NSE',
      }));

    return Response.json({ results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return Response.json({ results: [] });
  }
}
