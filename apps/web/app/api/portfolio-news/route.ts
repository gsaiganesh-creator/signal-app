// Batch portfolio news — fetches Yahoo Finance news for multiple portfolio tickers and deduplicates.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface YNewsItem {
  title?: string; link?: string; publisher?: string;
  providerPublishTime?: number; type?: string;
}

const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 900_000; // 15 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('symbols') ?? '';
  const symbols = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 12);
  if (!symbols.length) return Response.json({ news: [] });

  const key = [...symbols].sort().join(',');
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Response.json({ ...hit.data as object, cached: true });

  const seen = new Set<string>();
  const all: { title: string; publisher: string; link: string; providerPublishTime: number; ticker: string }[] = [];

  await Promise.allSettled(symbols.slice(0, 10).map(async sym => {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&lang=en-US&quotesCount=0&newsCount=5&enableFuzzyQuery=false`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signalgenie/1.0)', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('json')) return;
      const json = await res.json() as { news?: YNewsItem[] };
      for (const n of json.news ?? []) {
        if (n.link && n.title && !seen.has(n.link) && (n.type === 'STORY' || !n.type)) {
          seen.add(n.link);
          all.push({ title: n.title, publisher: n.publisher ?? '', link: n.link, providerPublishTime: n.providerPublishTime ?? 0, ticker: sym });
        }
      }
    } catch { /* skip */ }
  }));

  all.sort((a, b) => b.providerPublishTime - a.providerPublishTime);
  const news = all.slice(0, 12).map(n => ({
    title: n.title, publisher: n.publisher, link: n.link,
    published_at: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
    ticker: n.ticker,
  }));

  const data = { news };
  _cache.set(key, { data, ts: Date.now() });
  return Response.json({ ...data, cached: false }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
}
