// Stock news via Google News RSS — aggregates ET, MoneyControl, Business Today, LiveMint.
// Replaced Yahoo Finance v2 which returned generic world/sector news for NSE tickers.
export const runtime = 'edge';

type MappedItem = { title: string; url: string; publisher: string; published_at: string | null };

function parseRSS(xml: string): MappedItem[] {
  const items: MappedItem[] = [];
  const blocks = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of blocks) {
    const b = m[1];
    const title = (
      b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
      b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
    ).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();

    // Google News wraps actual URL in <link> before closing tag OR after <title>
    const link = (
      b.match(/<link>(https?:\/\/[^\s<]+)<\/link>/)?.[1] ??
      b.match(/<link\/>([^<]+)/)?.[1] ??
      b.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1] ?? ''
    ).trim();

    const pubDate = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const source  = (
      b.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ??
      b.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1] ?? 'News'
    ).replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();

    if (!title || !link) continue;
    items.push({
      title,
      url: link,
      publisher: source,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }
  return items;
}

function dedupe(arr: MappedItem[]): MappedItem[] {
  const seen = new Set<string>();
  return arr.filter(n => { if (seen.has(n.title)) return false; seen.add(n.title); return true; });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const name     = (searchParams.get('name') ?? '').trim();
  const exchange = (searchParams.get('exchange') ?? 'NSE').trim().toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const isIndia = exchange === 'NSE' || exchange === 'BSE';

  // Build clean company name — strip legal suffixes for better search
  const cleanName = name
    ? name.replace(/\s+(ltd\.?|limited|india|industries|enterprises?|corp\.?|inc\.?|pvt\.?|solutions?|technologies?|services?)$/gi, '').trim()
    : symbol;

  // Two Google News RSS queries — run in parallel
  // Q1: exact company name + market context
  // Q2: symbol fallback in case name query is too narrow
  const q1 = isIndia ? `"${cleanName}" NSE stock` : `"${cleanName}" stock`;
  const q2 = isIndia ? `${cleanName} NSE India share` : `${cleanName} ${symbol} shares`;

  const gnUrl = (q: string) =>
    isIndia
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  };

  try {
    const [r1, r2] = await Promise.allSettled([
      fetch(gnUrl(q1), { headers: hdrs, signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.text() : ''),
      fetch(gnUrl(q2), { headers: hdrs, signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.text() : ''),
    ]);

    const xml1 = r1.status === 'fulfilled' ? r1.value : '';
    const xml2 = r2.status === 'fulfilled' ? r2.value : '';

    const all = dedupe([...parseRSS(xml1), ...parseRSS(xml2)])
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .slice(0, 6);

    return Response.json({ symbol, news: all }, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
    });
  } catch (e) {
    return Response.json({ symbol, news: [], error: String(e) });
  }
}
