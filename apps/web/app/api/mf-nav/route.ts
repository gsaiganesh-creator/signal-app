import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '';
  if (!code) return Response.json({ error: 'no code' }, { status: 400 });

  const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(code)}/latest`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return Response.json({ error: 'mfapi error' }, { status: 502 });
  const data = await res.json();
  const nav  = parseFloat(data?.data?.[0]?.nav ?? '');
  const date = data?.data?.[0]?.date ?? '';
  const name = data?.meta?.scheme_name ?? '';
  return Response.json(
    { nav: isNaN(nav) ? null : nav, date, name },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800' } },
  );
}
