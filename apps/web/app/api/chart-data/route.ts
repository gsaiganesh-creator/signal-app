export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  const range    = searchParams.get('range') ?? '3mo';   // 1mo | 3mo | 6mo | 1y

  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS`
             : exchange === 'BSE' ? `${symbol}.BO`
             : symbol;

  const interval = range === '1mo' ? '1d' : '1d';   // always daily candles
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ error: `yahoo ${res.status}` }, { status: 502 });

    const data = await res.json() as {
      chart?: { result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{
          open?:   (number | null)[];
          high?:   (number | null)[];
          low?:    (number | null)[];
          close?:  (number | null)[];
          volume?: (number | null)[];
        }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    if (!result) return Response.json({ error: 'no data' }, { status: 404 });

    const ts  = result.timestamp ?? [];
    const q   = result.indicators?.quote?.[0] ?? {};
    const opens   = q.open   ?? [];
    const highs   = q.high   ?? [];
    const lows    = q.low    ?? [];
    const closes  = q.close  ?? [];
    const volumes = q.volume ?? [];

    const candles = ts
      .map((t, i) => ({
        time:   t as number,
        open:   opens[i]   ?? null,
        high:   highs[i]   ?? null,
        low:    lows[i]    ?? null,
        close:  closes[i]  ?? null,
        volume: volumes[i] ?? null,
      }))
      .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)
      .map(c => ({
        time:   c.time,
        open:   +c.open!.toFixed(2),
        high:   +c.high!.toFixed(2),
        low:    +c.low!.toFixed(2),
        close:  +c.close!.toFixed(2),
        volume: c.volume ?? 0,
      }));

    return Response.json({ candles }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=120' },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
