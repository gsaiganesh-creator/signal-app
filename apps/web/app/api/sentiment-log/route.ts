// Aggregate sentiment call accuracy from sentiment_scan_log — read-only, cheap, cacheable.
// "Accuracy" = % of closed (7d-outcome-known) bullish/bearish calls that moved the
// predicted direction. Neutral calls are excluded (no directional claim to score).

export const runtime = 'edge';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LogRow { label: string; return_7d: number | null; }

export async function GET() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?select=label,return_7d&return_7d=not.is.null`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  );
  if (!res.ok) return Response.json({ closed: 0, accuracy: null });

  const rows: LogRow[] = await res.json();
  const relevant = rows.filter(r => r.label === 'bullish' || r.label === 'bearish');
  const correct = relevant.filter(r =>
    (r.label === 'bullish' && (r.return_7d ?? 0) > 0) ||
    (r.label === 'bearish' && (r.return_7d ?? 0) < 0)
  );
  const accuracy = relevant.length > 0 ? Math.round((correct.length / relevant.length) * 100) : null;

  return Response.json(
    { closed: relevant.length, accuracy },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
  );
}
