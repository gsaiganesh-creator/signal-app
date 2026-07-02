export const runtime = 'edge';

export async function GET(req: Request) {
  if (!process.env.CAS_PARSER_API_KEY) {
    return Response.json({ error: 'CAS_PARSER_API_KEY not configured on server' }, { status: 500 });
  }
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/casparser-callback`;

  const res = await fetch('https://api.casparser.in/v4/inbox/connect', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CAS_PARSER_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    return Response.json({ error: `CASParser error: ${err}` }, { status: 502 });
  }

  const data = await res.json() as { oauth_url?: string };
  if (!data.oauth_url) return Response.json({ error: 'No OAuth URL returned' }, { status: 502 });

  return Response.json({ oauth_url: data.oauth_url });
}
