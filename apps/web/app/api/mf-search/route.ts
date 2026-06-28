import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return Response.json([]);

  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return Response.json([]);
  const data: { schemeCode: string; schemeName: string }[] = await res.json();
  return Response.json(
    data.slice(0, 12),
    { headers: { 'Cache-Control': 'public, max-age=120' } },
  );
}
