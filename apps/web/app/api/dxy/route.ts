// DXY (US Dollar Index) trend — same logic as mstock-automation's
// trading/scanner.py market-pulse check: compares the 5-day moving average
// now vs 3 trading days ago to classify rising/falling/flat, and derives
// the "FII headwind" score penalty applied to Indian stock scans.
export const runtime = 'edge';

function sma(values: number[], period: number, endIndexExclusive: number): number | null {
  const start = endIndexExclusive - period;
  if (start < 0) return null;
  const slice = values.slice(start, endIndexExclusive);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export async function GET() {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1mo';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ dxy: null, trend: null, penalty: 0 });

    const data = await res.json() as {
      chart?: { result?: Array<{
        meta?: { regularMarketPrice?: number };
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null && isFinite(c));
    const dxy = result?.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? null;

    // Mirrors scanner.py exactly: 5-day SMA "now" (last 5 closes) vs the 5-day
    // SMA as of 3 trading days ago (last 5 closes ending 3 days back).
    const ma5Now = sma(closes, 5, closes.length);
    const ma5_3dAgo = sma(closes, 5, closes.length - 3);

    let trend: 'rising' | 'falling' | 'flat' | null = null;
    let penalty = 0;
    if (ma5Now != null && ma5_3dAgo != null) {
      if (ma5Now > ma5_3dAgo * 1.005) { trend = 'rising'; penalty = 1; }
      else if (ma5Now < ma5_3dAgo * 0.995) { trend = 'falling'; penalty = 0; }
      else { trend = 'flat'; penalty = 0; }
    }

    return Response.json(
      { dxy: dxy != null ? +dxy.toFixed(2) : null, trend, penalty },
      { headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' } },
    );
  } catch {
    return Response.json({ dxy: null, trend: null, penalty: 0 });
  }
}
