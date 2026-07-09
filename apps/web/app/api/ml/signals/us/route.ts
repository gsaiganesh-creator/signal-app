// Live US momentum scan — mirrors api/ml/signals/route.ts (India) exactly:
// on-demand Yahoo Finance scan + 1hr in-memory cache, so US Signals behaves
// just like India Signals during market hours (fresh on cache-miss, any time
// someone visits, not gated behind a once-daily snapshot).
//
// This route used to fall through to [ticker]/route.ts's dynamic catch-all
// (ticker="us" isn't a real symbol) — a pure routing bug, not a timing one —
// so US Signals silently returned an empty array on every request since this
// was first built. Fixed by adding this static route (Next.js resolves static
// segments before dynamic ones at the same path).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runUsScan, type USScanSignal } from '@/lib/us-scan';

let _cache: { data: USScanSignal[]; ts: number } | null = null;
const CACHE_TTL = 3_600_000; // 1 hour — matches india-scan.ts's cache window

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return Response.json(
      { signals: _cache.data.slice(0, limit), count: _cache.data.slice(0, limit).length, cached: true },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  }

  try {
    const picks = await runUsScan();
    _cache = { data: picks, ts: Date.now() };
    return Response.json(
      { signals: picks.slice(0, limit), count: picks.slice(0, limit).length, cached: false },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (e) {
    return Response.json({ error: String(e), signals: [], count: 0 }, { status: 500 });
  }
}
