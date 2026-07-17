export const runtime = 'edge';
import type { FundStock } from '@/lib/fundamental-scan-types';
import { NSE_SCAN_UNIVERSE, fetchFund } from '@/lib/fundamental-scan-types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSyms = searchParams.get('symbols');

  let universe: Array<{ sym: string; sector: string }>;
  if (rawSyms) {
    const requested = rawSyms.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 25);
    universe = requested.map(s => {
      const found = NSE_SCAN_UNIVERSE.find(u => u.sym === s);
      return found ?? { sym: s, sector: 'Other' };
    });
  } else {
    universe = NSE_SCAN_UNIVERSE;
  }

  const settled = await Promise.allSettled(universe.map(u => fetchFund(u.sym, u.sector)));
  const results = settled.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as FundStock[];

  return Response.json({ results, scanned_at: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
  });
}
