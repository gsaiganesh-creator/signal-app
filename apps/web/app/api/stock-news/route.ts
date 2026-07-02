// Stock-specific news via Yahoo Finance — all sources title-filtered.
// Yahoo v2 tags generic sector news to NSE tickers, so we filter everything by keyword.
export const runtime = 'edge';

interface YNewsItem {
  title?: string; link?: string; url?: string;
  providerPublishTime?: number; publisher?: string; type?: string;
}
interface SearchNewsItem {
  title?: string; link?: string;
  providerPublishTime?: number; publisher?: string; type?: string;
}
type MappedItem = { title: string; url: string; publisher: string; published_at: string | null };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  const name     = (searchParams.get('name') ?? '').trim();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS` : exchange === 'BSE' ? `${symbol}.BO` : symbol;

  // Build relevance keywords: symbol + first two meaningful words of company name
  const shortSym = symbol.replace(/\.(NS|BO)$/i, '');
  const trimmedName = name
    ? name.replace(/\s+(ltd\.?|limited|india|industries|enterprises?|corp\.?|inc\.?|pvt\.?)$/gi, '').trim()
    : '';
  const nameWords = trimmedName ? trimmedName.split(/\s+/).slice(0, 2) : [];
  const kws = [...new Set([shortSym, ...nameWords].map(k => k.toLowerCase()))].filter(k => k.length > 2);

  function relevant(title: string): boolean {
    if (kws.length === 0) return true;
    const t = title.toLowerCase();
    return kws.some(k => t.includes(k));
  }

  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
  };

  function mapItem(n: { title?: string; link?: string; url?: string; providerPublishTime?: number; publisher?: string }): MappedItem {
    return {
      title:        n.title ?? '',
      url:          n.link ?? n.url ?? '',
      publisher:    n.publisher ?? '',
      published_at: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
    };
  }

  function dedupe(arr: MappedItem[]): MappedItem[] {
    const seen = new Set<string>();
    return arr.filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true; });
  }

  try {
    const filtered: MappedItem[] = [];
    const unfiltered: MappedItem[] = []; // last resort pool

    // Source 1: v2 ticker-tagged — title filter required (returns generic sector news otherwise)
    try {
      const v2res = await fetch(
        `https://query1.finance.yahoo.com/v2/finance/news?symbol=${encodeURIComponent(ySym)}&count=12`,
        { headers: hdrs, signal: AbortSignal.timeout(5000) }
      );
      if (v2res.ok) {
        const data = await v2res.json() as { items?: { result?: YNewsItem[] } };
        for (const n of (data?.items?.result ?? [])) {
          if (!n.title || !(n.link ?? n.url)) continue;
          const item = mapItem(n);
          unfiltered.push(item);
          if (relevant(item.title)) filtered.push(item);
        }
      }
    } catch { /* timeout ok */ }

    // Source 2: company name search — always run to supplement v2
    const searchQ = trimmedName || ySym;
    try {
      const sres = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQ)}&lang=en-US&region=IN&quotesCount=1&newsCount=12&enableFuzzyQuery=false`,
        { headers: hdrs, signal: AbortSignal.timeout(5000) }
      );
      if (sres.ok) {
        const sdata = await sres.json() as { news?: SearchNewsItem[] };
        for (const n of (sdata?.news ?? [])) {
          if ((n.type !== 'STORY' && n.type) || !n.title || !n.link) continue;
          const item = mapItem(n);
          unfiltered.push(item);
          if (relevant(item.title)) filtered.push(item);
        }
      }
    } catch { /* timeout ok */ }

    // Return title-filtered results sorted by recency
    const news = dedupe(filtered)
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, 6);

    if (news.length >= 1) {
      return Response.json({ symbol, news }, {
        headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
      });
    }

    // Last resort: unfiltered — at least query was company-related, better than empty
    const fallback = dedupe(unfiltered).slice(0, 5);
    return Response.json({ symbol, news: fallback }, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
    });

  } catch (e) {
    return Response.json({ symbol, news: [], error: String(e) });
  }
}
