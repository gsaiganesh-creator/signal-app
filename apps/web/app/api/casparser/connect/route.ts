export const runtime = 'nodejs';

export async function GET(req: Request) {
  const apiKey = (process.env.CAS_PARSER_API_KEY ?? '').trim();
  if (!apiKey) {
    return Response.json({ error: 'CAS_PARSER_API_KEY not configured on server' }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/casparser-callback`;

  let res: Response;
  try {
    res = await fetch('https://api.casparser.in/v4/inbox/connect', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ redirect_uri: redirectUri }),
    });
  } catch (e) {
    return Response.json({ error: `Fetch failed: ${String(e)}` }, { status: 502 });
  }

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    return Response.json({ error: `CASParser ${res.status}: ${err.slice(0, 300)}` }, { status: 502 });
  }

  const data = await res.json() as { oauth_url?: string; status?: string };
  if (!data.oauth_url) {
    return Response.json({ error: `No OAuth URL — response: ${JSON.stringify(data)}` }, { status: 502 });
  }

  return Response.json({ oauth_url: data.oauth_url });
}
