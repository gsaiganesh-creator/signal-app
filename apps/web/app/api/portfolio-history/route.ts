import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface HoldingInput { symbol: string; exchange: string; qty: number; avg_price: number; }

function yhTicker(symbol: string, exchange: string) {
  return exchange === 'NSE' ? symbol + '.NS' : exchange === 'BSE' ? symbol + '.BO' : symbol;
}

async function fetchHistory(ticker: string, range: string): Promise<{ time: number; close: number }[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000), // 4s per ticker — prevents stalling on slow tickers
    });
    if (!res.ok) return [];
    const j = await res.json();
    const result = j?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const out: { time: number; close: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c != null && !isNaN(c)) out.push({ time: timestamps[i], close: c });
    }
    return out;
  } catch {
    return []; // timeout or fetch error — skip this ticker gracefully
  }
}

export async function POST(req: NextRequest) {
  const { holdings, range = '3mo' }: { holdings: HoldingInput[]; range: string } = await req.json();
  if (!holdings?.length) return Response.json({ series: [], invested: 0 });

  const allValid = holdings.filter(h => h.avg_price >= 1 && h.qty > 0);
  if (!allValid.length) return Response.json({ series: [], invested: 0 });

  // Invested = full portfolio cost basis
  const invested = allValid.reduce((s, h) => s + h.avg_price * h.qty, 0);

  // Cap at top 25 by invested value — 169 holdings = 169 API calls = edge timeout
  // Top 25 typically cover 85%+ of portfolio value
  const top25 = [...allValid]
    .sort((a, b) => (b.avg_price * b.qty) - (a.avg_price * a.qty))
    .slice(0, 25);

  // Fetch in parallel with individual timeouts
  const histories = await Promise.all(
    top25.map(h => fetchHistory(yhTicker(h.symbol, h.exchange), range)),
  );

  // Build date map: timestamp → total value of top-25
  const dayMap = new Map<number, number>();

  for (let i = 0; i < top25.length; i++) {
    const h    = top25[i];
    const hist = histories[i];
    for (const { time, close } of hist) {
      const day = Math.floor(time / 86400) * 86400;
      dayMap.set(day, (dayMap.get(day) ?? 0) + close * h.qty);
    }
  }

  if (!dayMap.size) return Response.json({ series: [], invested });

  // Scale up: if top-25 < total portfolio, proportionally scale the line
  const top25Invested = top25.reduce((s, h) => s + h.avg_price * h.qty, 0);
  const scale = top25Invested > 0 ? invested / top25Invested : 1;

  const series = [...dayMap.entries()]
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time, value: value * scale }));

  return Response.json(
    { series, invested },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=120' } },
  );
}
