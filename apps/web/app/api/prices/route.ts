// Batch price fetch. India (NSE/.NS, BSE/.BO) + forex/commodities (=X/=F) stay
// on Yahoo Finance (15min delayed, but Alpaca can't serve these markets anyway).
// US equities route through Alpaca's free real-time IEX feed instead — genuinely
// live, not delayed, if ALPACA_API_KEY_ID/ALPACA_API_SECRET_KEY are configured.
// Falls back to Yahoo per-symbol for any US ticker Alpaca didn't return (missing
// keys, rate limit, or a symbol IEX doesn't carry).

export const runtime = 'edge';

import { fetchAlpacaPrices, isUsEquitySymbol, type PriceResult } from '@/lib/alpaca';

async function fetchYahooPrice(sym: string): Promise<PriceResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { price: null, change_pct: null, prev_close: null };
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
    return { price, change_pct, prev_close };
  } catch {
    return { price: null, change_pct: null, prev_close: null };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbols') ?? '';
  // Sort symbols so identical sets share the same Vercel CDN cache key
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).sort();

  if (!symbols.length) return Response.json({});

  const results: Record<string, PriceResult> = {};

  // US equities first, via Alpaca (batched, real-time IEX) — Yahoo fills any gaps below
  const usSymbols = symbols.filter(isUsEquitySymbol);
  if (usSymbols.length) {
    const alpacaResults = await fetchAlpacaPrices(usSymbols);
    for (const [sym, r] of Object.entries(alpacaResults)) {
      if (r.price != null) results[sym] = r; // only trust Alpaca rows that actually resolved
    }
  }

  const remaining = symbols.filter(sym => !(sym in results));
  await Promise.allSettled(remaining.map(async (sym) => {
    results[sym] = await fetchYahooPrice(sym);
  }));

  return Response.json(results, {
    // Alpaca rows are real-time; Yahoo rows (India/forex/commodities/fallback) are
    // 15min delayed. Cache window sized for the slower/majority case either way.
    headers: { 'Cache-Control': 'public, max-age=180, stale-while-revalidate=600' },
  });
}
