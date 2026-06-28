// Live IPO data from Supabase `ipo_calendar` table (admin-updated weekly).
// SQL to create + seed: see CLAUDE.md → IPO Calendar.
// Update rows via Supabase dashboard → Table Editor → ipo_calendar.
export const runtime = 'edge';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface IpoRow {
  company: string; symbol?: string;
  open_date?: string; close_date?: string; allotment_date?: string; listing_date?: string;
  price_band?: string; lot_size?: number; issue_size?: string; gmp?: string;
  status?: string; type?: string; sector?: string;
}

export async function GET() {
  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/ipo_calendar?select=*&order=open_date.asc&limit=60`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return Response.json({ ipos: [] });

    const rows = await r.json() as IpoRow[];
    if (!Array.isArray(rows) || rows.length === 0) return Response.json({ ipos: [] });

    const ipos = rows.map(row => ({
      company:    row.company,
      symbol:     row.symbol     ?? undefined,
      open:       row.open_date  ?? '',
      close:      row.close_date ?? '',
      allotment:  row.allotment_date ?? undefined,
      listing:    row.listing_date   ?? undefined,
      price_band: row.price_band ?? 'TBA',
      lot_size:   row.lot_size   ?? 0,
      issue_size: row.issue_size ?? '',
      gmp:        row.gmp        ?? undefined,
      status:     (row.status ?? 'upcoming') as 'upcoming'|'open'|'allotment'|'listed'|'closed',
      type:       (row.type   ?? 'mainboard') as 'mainboard'|'sme',
      sector:     row.sector  ?? undefined,
    }));

    return Response.json({ ipos }, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
    });
  } catch {
    return Response.json({ ipos: [] });
  }
}
