// Historical closing price for a symbol on/near a given date — used to
// backfill RSU/ESPP grant price when the source document has no FMV
// (e.g. Fidelity's "Get to know your award" summary PDF).
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const dateStr = (searchParams.get('date') ?? '').trim();

  if (!symbol || !dateStr) return Response.json({ error: 'symbol and date required' }, { status: 400 });

  const target = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(target.getTime())) return Response.json({ error: 'invalid date' }, { status: 400 });

  // Window a few days either side of the target to land on the nearest
  // trading day (weekends/holidays land on non-trading dates).
  const period1 = Math.floor(target.getTime() / 1000) - 5 * 86_400;
  const period2 = Math.floor(target.getTime() / 1000) + 5 * 86_400;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ price: null });

    const data = await res.json() as {
      chart?: { result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const targetSec = Math.floor(target.getTime() / 1000);

    // First trading day on/after the target date with a valid close.
    let price: number | null = null;
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] >= targetSec && closes[i] != null && isFinite(closes[i] as number)) {
        price = closes[i] as number;
        break;
      }
    }
    // Fallback: nearest close before the target date, if none on/after.
    if (price == null) {
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (closes[i] != null && isFinite(closes[i] as number)) { price = closes[i] as number; break; }
      }
    }

    return Response.json({ price: price != null ? +price.toFixed(2) : null }, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return Response.json({ price: null });
  }
}
