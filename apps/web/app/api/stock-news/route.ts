// Stock-specific news via Yahoo Finance — ticker-tagged first, name-search fallback with title filter.
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
  const name     = (searchParams.get('name') ?? '').trim();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS` : exchange === 'BSE' ? `${symbol}.BO` : symbol;

  // Build relevance keywords from symbol + first meaningful word of company name
  const shortSym = symbol.replace(/\.(NS|BO)$/i, '');
  const nameWord = name
    ? name.replace(/\s+(ltd\.?|limited|india|industries|enterprises?|corp\.?|inc\.?)$/gi, '').split(/\s+/)[0]
    : '';
  const kws = [shortSym, nameWord].filter(Boolean).map(k => k.toLowerCase());

  function titleRelevant(title: string): boolean {
    if (kws.length === 0) return true;
    const t = title.toLowerCase();
    return kws.some(k => t.includes(k));
  }

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
    // Primary: v2 ticker-tagged news — most relevant, accept without keyword filter
    const v2url = `https://query1.finance.yahoo.com/v2/finance/news?symbol=${encodeURIComponent(ySym)}&count=10`;
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

    // Fallback: search by trimmed company name (e.g. "Reliance Industries" not "RELIANCE.NS")
    const searchQ = name
      ? name.replace(/\s+(ltd\.?|limited|india|industries|enterprises?|corp\.?|inc\.?)$/gi, '').trim()
      : ySym;

    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQ)}&lang=en-US&region=IN&quotesCount=1&newsCount=10&enableFuzzyQuery=false`;
    const sres = await fetch(searchUrl, { headers: hdrs, signal: AbortSignal.timeout(5000) });

    if (sres.ok) {
      const sdata = await sres.json() as { news?: SearchNewsItem[] };
      const news = (sdata?.news ?? [])
        .filter(n => (n.type === 'STORY' || !n.type) && n.title && n.link)
        .map(mapItem)
        .filter(n => n.title && n.url && titleRelevant(n.title))
        .slice(0, 6);
      if (news.length > 0) {
        return Response.json({ symbol, news }, {
          headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
        });
      }
    }

    // Last resort: raw ticker symbol search, no title filter
    if (searchQ !== ySym) {
      const tickerUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ySym)}&lang=en-US&region=IN&quotesCount=1&newsCount=10&enableFuzzyQuery=false`;
      const tres = await fetch(tickerUrl, { headers: hdrs, signal: AbortSignal.timeout(5000) });
      if (tres.ok) {
        const tdata = await tres.json() as { news?: SearchNewsItem[] };
        const news = (tdata?.news ?? [])
          .filter(n => (n.type === 'STORY' || !n.type) && n.title && n.link)
          .map(mapItem)
          .filter(n => n.title && n.url)
          .slice(0, 6);
        return Response.json({ symbol, news }, {
          headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
        });
      }
    }

    return Response.json({ symbol, news: [] });
  } catch (e) {
    return Response.json({ symbol, news: [], error: String(e) });
  }
}
