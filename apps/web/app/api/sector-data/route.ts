// Sector index data with period-aware returns
// For 1D: uses regularMarketChangePercent (intraday %)
// For 5D/1M/3M/1Y: fetches OHLCV series and computes first→last close return

export const runtime = 'edge';

type Result = { price: number | null; change_pct: number | null; prev_close: number | null };

async function fetchSector(ticker: string, range: string): Promise<Result> {
  const interval = range === '1d' ? '1d' : range === '5d' ? '1d' : '1wk';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return { price: null, change_pct: null, prev_close: null };

    const data = await res.json() as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; chartPreviousClose?: number };
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>
      }
    };

    const result = data?.chart?.result?.[0];
    if (!result) return { price: null, change_pct: null, prev_close: null };

    const meta       = result.meta ?? {};
    const price      = meta.regularMarketPrice ?? null;
    const prev_close = meta.chartPreviousClose ?? null;

    if (range === '1d') {
      const raw_chg = meta.regularMarketChangePercent ?? null;
      const change_pct = raw_chg != null
        ? raw_chg
        : (price != null && prev_close != null && prev_close > 0)
          ? ((price - prev_close) / prev_close) * 100
          : null;
      return { price, change_pct, prev_close };
    }

    // Multi-period: compute first→last close from OHLCV series
    const closes = result.indicators?.quote?.[0]?.close?.filter((c): c is number => c != null) ?? [];
    if (closes.length < 2) {
      return { price, change_pct: null, prev_close: null };
    }
    const firstClose = closes[0];
    const lastClose  = closes[closes.length - 1];
    const change_pct = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : null;
    return { price: price ?? lastClose, change_pct, prev_close: firstClose };
  } catch {
    return { price: null, change_pct: null, prev_close: null };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = (searchParams.get('tickers') ?? '').split(',').map(t => t.trim()).filter(Boolean);
  const range   = searchParams.get('range') ?? '1d';

  if (!tickers.length) return Response.json({});

  const entries = await Promise.allSettled(
    tickers.map(async ticker => ({ ticker, data: await fetchSector(ticker, range) }))
  );

  const out: Record<string, Result> = {};
  for (const e of entries) {
    if (e.status === 'fulfilled') out[e.value.ticker] = e.value.data;
  }

  return Response.json(out, {
    headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' },
  });
}
