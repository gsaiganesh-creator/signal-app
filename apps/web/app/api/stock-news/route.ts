// Stock-specific news via Yahoo Finance search API — no key needed.
export const runtime = 'edge';

interface YahooNewsItem {
  title?: string;
  link?: string;
  providerPublishTime?: number;
  publisher?: string;
  type?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS` : exchange === 'BSE' ? `${symbol}.BO` : symbol;
  const hdrs = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)', Accept: 'application/json' };

  try {
    // Yahoo Finance v1 search returns news items in quoteSummary-adjacent endpoint
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ySym)}&lang=en-US&region=IN&quotesCount=0&newsCount=8&enableFuzzyQuery=false&enableCb=true&enableNavLinks=false`;
    const res = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return Response.json({ news: [] }, { status: 200 });

    const data = await res.json() as { news?: YahooNewsItem[] };
    const raw  = data?.news ?? [];

    const news = raw
      .filter(n => n.type === 'STORY' || !n.type)
      .slice(0, 6)
      .map(n => ({
        title:     n.title ?? '',
        url:       n.link  ?? '',
        publisher: n.publisher ?? '',
        published_at: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : null,
      }))
      .filter(n => n.title && n.url);

    return Response.json({ symbol, news }, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
    });
  } catch (e) {
    return Response.json({ symbol, news: [], error: String(e) });
  }
}
