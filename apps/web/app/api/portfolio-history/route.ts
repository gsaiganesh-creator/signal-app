import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface HoldingInput { symbol: string; exchange: string; qty: number; avg_price: number; }

function yhTicker(symbol: string, exchange: string) {
  return exchange === 'NSE' ? symbol + '.NS' : exchange === 'BSE' ? symbol + '.BO' : symbol;
}

async function fetchHistory(ticker: string, range: string): Promise<{ time: number; close: number }[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
}

export async function POST(req: NextRequest) {
  const { holdings, range = '3mo' }: { holdings: HoldingInput[]; range: string } = await req.json();
  if (!holdings?.length) return Response.json({ series: [], invested: 0 });

  const valid = holdings.filter(h => h.avg_price >= 1 && h.qty > 0);
  if (!valid.length) return Response.json({ series: [], invested: 0 });

  const invested = valid.reduce((s, h) => s + h.avg_price * h.qty, 0);

  // Fetch all histories in parallel
  const histories = await Promise.all(
    valid.map(h => fetchHistory(yhTicker(h.symbol, h.exchange), range)),
  );

  // Build date map: timestamp → total value
  const dayMap = new Map<number, number>();

  for (let i = 0; i < valid.length; i++) {
    const h = valid[i];
    const hist = histories[i];
    for (const { time, close } of hist) {
      // Normalize to start-of-day UTC
      const day = Math.floor(time / 86400) * 86400;
      dayMap.set(day, (dayMap.get(day) ?? 0) + close * h.qty);
    }
  }

  // Sort and filter days where all holdings contributed (value > 0)
  const series = [...dayMap.entries()]
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time, value }));

  return Response.json(
    { series, invested },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=120' } },
  );
}
