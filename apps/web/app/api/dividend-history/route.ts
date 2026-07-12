// Per-symbol dividend payout history — real past ex-dates + amounts, for the
// StockDetailSheet Dividends tab. Distinct from /api/dividends (batch, many
// symbols, discards individual payouts after summing into an annual total) —
// this returns the raw per-event list for one symbol.
export const runtime = 'edge';

interface Payout {
  date: string;   // YYYY-MM-DD
  amount: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') ?? '').trim();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const ySym = exchange === 'NSE' ? `${symbol}.NS`
             : exchange === 'BSE' ? `${symbol}.BO`
             : symbol;
  const currency: 'INR' | 'USD' = (exchange === 'NSE' || exchange === 'BSE') ? 'INR' : 'USD';

  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?events=dividends&range=3y&interval=1mo`;
    const r = await fetch(chartUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return Response.json({ payouts: [], currency }, { status: 200 });

    const data = await r.json() as {
      chart?: { result?: Array<{
        events?: { dividends?: Record<string, { amount: number; date: number }> };
      }> }
    };
    const divEvts = data?.chart?.result?.[0]?.events?.dividends;
    const payouts: Payout[] = divEvts
      ? Object.values(divEvts)
          .map(d => ({ date: new Date(d.date * 1000).toISOString().split('T')[0], amount: +d.amount.toFixed(2) }))
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];

    return Response.json({ payouts, currency }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800' },
    });
  } catch {
    return Response.json({ payouts: [], currency }, { status: 200 });
  }
}
