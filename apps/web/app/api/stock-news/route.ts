// Stock-specific news via Yahoo Finance v2 news API — tagged to the ticker, not keyword search.
export const runtime = 'edge';

interface YNewsItem {
  title?: string; link?: string; url?: string;
  providerPublishTime?: number; publisher?: string; type?: string;
}
interface SearchNewsItem {
  title?: string; link?: string;
  providerPublishTime?: number; publisher?: string; type?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS` : exchange === 'BSE' ? `${symbol}.BO` : symbol;
  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
  };

  function mapItem(n: { title?: string; link?: string; url?: string; providerPublishTime?: number; publisher?: string }) {
    return {
      title:        n.title ?? '',
      url:          n.link ?? n.url ?? '',
      publisher:    n.publisher ?? '',
      published_at: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
    };
  }

  try {
    // Primary: v2 news endpoint — returns news specifically tagged to this ticker
    const v2url = `https://query1.finance.yahoo.com/v2/finance/news?symbol=${encodeURIComponent(ySym)}&count=8`;
    const v2res = await fetch(v2url, { headers: hdrs, signal: AbortSignal.timeout(5000) });

    if (v2res.ok) {
      const data = await v2res.json() as { items?: { result?: YNewsItem[] } };
      const raw  = data?.items?.result ?? [];
      const news = raw.filter(n => n.title && (n.link ?? n.url)).slice(0, 6).map(mapItem);
      if (news.length > 0) {
        return Response.json({ symbol, news }, {
          headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
        });
      }
    }

    // Fallback: v1 search with company name query — better than symbol-only
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ySym)}&lang=en-US&region=IN&quotesCount=1&newsCount=8&enableFuzzyQuery=false`;
    const sres = await fetch(searchUrl, { headers: hdrs, signal: AbortSignal.timeout(5000) });
    if (!sres.ok) return Response.json({ news: [] });

    const sdata = await sres.json() as { news?: SearchNewsItem[] };
    const news = (sdata?.news ?? [])
      .filter(n => n.type === 'STORY' || !n.type)
      .slice(0, 6)
      .map(mapItem)
      .filter(n => n.title && n.url);

    return Response.json({ symbol, news }, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
    });
  } catch (e) {
    return Response.json({ symbol, news: [], error: String(e) });
  }
}
