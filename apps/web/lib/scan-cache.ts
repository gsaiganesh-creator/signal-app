// Durable, cross-instance scan cache backed by Supabase — replaces the
// module-level `let _cache` pattern that used to live in each scan route.
// That in-memory approach doesn't actually work on Vercel: serverless
// functions aren't guaranteed a warm container between requests, so on
// anything but heavy sustained traffic every request was a cold instance
// with `_cache === null`, meaning the "1hr cache" ran a fresh 100-stock
// scan on effectively every click. This table makes the cache survive
// across instances/cold-starts, and exposes `computed_at` so the UI can
// show a real "last run / next run" timer instead of just "cached: true".
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ScanCacheResult<T> {
  data: T;
  computedAt: string; // ISO timestamp
  cached: boolean;
}

export async function getCachedOrRun<T>(
  scanKey: string,
  ttlMs: number,
  run: () => Promise<T>,
): Promise<ScanCacheResult<T>> {
  if (SRVC_KEY) {
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/scan_cache?scan_key=eq.${encodeURIComponent(scanKey)}&select=results,computed_at`,
        { headers: { apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}` } },
      );
      if (res.ok) {
        const rows = await res.json() as Array<{ results: T; computed_at: string }>;
        const row = rows[0];
        if (row && Date.now() - new Date(row.computed_at).getTime() < ttlMs) {
          return { data: row.results, computedAt: row.computed_at, cached: true };
        }
      }
    } catch { /* fall through to a fresh run — a cache read failure shouldn't break the scan */ }
  }

  const data = await run();
  const computedAt = new Date().toISOString();

  if (SRVC_KEY) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/scan_cache`, {
        method: 'POST',
        headers: {
          apikey: SRVC_KEY, Authorization: `Bearer ${SRVC_KEY}`, 'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ scan_key: scanKey, results: data, computed_at: computedAt }),
      });
    } catch { /* non-critical — the scan result is still returned below even if the write fails */ }
  }

  return { data, computedAt, cached: false };
}
