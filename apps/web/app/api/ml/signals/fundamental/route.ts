// "ML Fundamental Strong" — quality/value composite scan. See
// lib/india-fundamental-scan.ts for the scoring. Durable cache, but a
// longer TTL than the technical scans — fundamentals (PE, ROE, debt/equity,
// revenue growth) don't meaningfully change intraday, unlike RSI/EMA.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runFundamentalTopScan, type FundamentalSignal } from '@/lib/india-fundamental-scan';
import { getCachedOrRun } from '@/lib/scan-cache';

const CACHE_TTL = 60 * 60_000; // 1 hour — fundamentals move much slower than price/RSI

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  try {
    const { data: picks, computedAt, cached } = await getCachedOrRun<FundamentalSignal[]>('india_fundamental', CACHE_TTL, runFundamentalTopScan);
    return Response.json(
      { signals: picks.slice(0, limit), count: picks.slice(0, limit).length, cached, computed_at: computedAt, next_run_at: new Date(new Date(computedAt).getTime() + CACHE_TTL).toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (e) {
    return Response.json({ error: String(e), signals: [], count: 0 }, { status: 500 });
  }
}
