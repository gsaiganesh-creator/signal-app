// Node.js runtime — needs longer timeout for 100-stock scan
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runScan, type Signal } from '@/lib/india-scan';

// ─── Global in-memory cache ───────────────────────────────────────────────────
let _cache: { data: Signal[]; ts: number } | null = null;
const CACHE_TTL = 3_600_000; // 1 hour

// ─── Route handler ────────────────────────────────────────────────────────────
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
    const picks = await runScan();
    _cache = { data: picks, ts: Date.now() };
    return Response.json(
      { signals: picks.slice(0, limit), count: picks.slice(0, limit).length, cached: false },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (e) {
    return Response.json({ error: String(e), signals: [], count: 0 }, { status: 500 });
  }
}
