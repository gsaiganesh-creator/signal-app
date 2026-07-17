// Node.js runtime — needs longer timeout for 100-stock scan
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runScan, type Signal } from '@/lib/india-scan';
import { getCachedOrRun } from '@/lib/scan-cache';

const CACHE_TTL = 15 * 60_000; // 15 minutes — durable across instances, see lib/scan-cache.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  try {
    const { data: picks, computedAt, cached } = await getCachedOrRun<Signal[]>('india_top20', CACHE_TTL, runScan);
    return Response.json(
      { signals: picks.slice(0, limit), count: picks.slice(0, limit).length, cached, computed_at: computedAt, next_run_at: new Date(new Date(computedAt).getTime() + CACHE_TTL).toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } }
    );
  } catch (e) {
    return Response.json({ error: String(e), signals: [], count: 0 }, { status: 500 });
  }
}
