// Batch price fetch from Yahoo Finance — no ML backend needed, always available.
// Indian NSE stocks: SYMBOL.NS  |  BSE: SYMBOL.BO  |  US: SYMBOL

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbols') ?? '';
  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (!symbols.length) return Response.json({});

  const results: Record<string, { price: number | null; change_pct: number | null; prev_close: number | null }> = {};

  await Promise.allSettled(symbols.map(async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) { results[sym] = { price: null, change_pct: null, prev_close: null }; return; }
      const data = await res.json() as {
        chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; chartPreviousClose?: number } }> }
      };
      const meta = data?.chart?.result?.[0]?.meta;
      const price      = meta?.regularMarketPrice        ?? null;
      const prev_close = meta?.chartPreviousClose         ?? null;
      // Yahoo sometimes returns null change% even when price + prevClose are present — compute fallback
      const raw_chg    = meta?.regularMarketChangePercent ?? null;
      const change_pct = raw_chg != null
        ? raw_chg
        : (price != null && prev_close != null && prev_close > 0)
          ? ((price - prev_close) / prev_close) * 100
          : null;
      results[sym] = { price, change_pct, prev_close };
    } catch {
      results[sym] = { price: null, change_pct: null, prev_close: null };
    }
  }));

  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' },
  });
}
