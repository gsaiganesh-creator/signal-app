// Placeholder — returns empty so the IPO page falls back to static seed data.
// Replace body with NSE scrape or Supabase-backed table when ready.
export const runtime = 'edge';

export async function GET() {
  return Response.json({ ipos: [] }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  });
}
