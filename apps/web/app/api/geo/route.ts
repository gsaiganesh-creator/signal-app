// Country detection for INR/USD pricing — Vercel injects this header at the
// edge on every request, no external geo-IP service/API key needed. Falls
// back to 'IN' (not 'US') on localhost/anywhere the header is missing, since
// the overwhelming majority of current users are India-based — a failed
// detection should default to the pricing that's actually correct for most
// people, not silently show the wrong currency to them.
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') ?? 'IN';
  return Response.json(
    { country, currency: country === 'IN' ? 'INR' : 'USD' },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );
}
