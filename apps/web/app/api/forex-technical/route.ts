// apps/web/app/api/forex-technical/route.ts
// RSI/EMA/Supertrend for FX pairs, reusing the same math as /api/stock-detail.
import { rsi, ema, supertrend } from '@/lib/technicals';

export const runtime = 'edge';

interface TechResult {
  rsi14: number | null;
  ema_gap_pct: number | null;
  bias: 'bullish' | 'bearish' | null;
}

const EMPTY: TechResult = { rsi14: null, ema_gap_pct: null, bias: null };

async function fetchOne(sym: string): Promise<TechResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return EMPTY;

    const data = await res.json() as {
      chart?: { result?: Array<{
        indicators?: { quote?: Array<{
          close?: (number | null)[];
          high?:  (number | null)[];
          low?:   (number | null)[];
        }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    const q0 = result?.indicators?.quote?.[0] ?? {};
    const closes = (q0.close ?? []).filter((c): c is number => c != null && isFinite(c));
    const highs  = (q0.high  ?? []).filter((c): c is number => c != null && isFinite(c));
    const lows   = (q0.low   ?? []).filter((c): c is number => c != null && isFinite(c));

    if (closes.length < 51 || highs.length < 12) return EMPTY;

    const rsi14 = rsi(closes, 14);
    const ema50 = ema(closes, 50);
    const lastClose = closes[closes.length - 1];
    const ema_gap_pct = ema50 ? +((lastClose - ema50) / ema50 * 100).toFixed(2) : null;
    const st = supertrend(highs, lows, closes, 10, 3);
    const bias: TechResult['bias'] = st ? (st.direction === 1 ? 'bullish' : 'bearish') : null;

    return {
      rsi14: rsi14 != null ? +rsi14.toFixed(1) : null,
      ema_gap_pct,
      bias,
    };
  } catch {
    return EMPTY;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (!symbols.length) return Response.json({ error: 'symbols required' }, { status: 400 });

  const entries = await Promise.all(symbols.map(async sym => [sym, await fetchOne(sym)] as const));
  const out: Record<string, TechResult> = {};
  for (const [sym, tech] of entries) out[sym] = tech;

  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } });
}
