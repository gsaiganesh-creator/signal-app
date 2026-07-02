export const runtime = 'edge';

interface CASFile {
  message_id: string; filename: string; original_filename: string;
  message_date: string; cas_type: string; sender_email: string;
  size: number; url: string; expires_in: number;
}

export async function POST(req: Request) {
  const body = await req.json() as { inbox_token?: string };
  if (!body.inbox_token) return Response.json({ error: 'inbox_token required' }, { status: 400 });

  const res = await fetch('https://api.casparser.in/v4/inbox/cas', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CAS_PARSER_API_KEY!,
      'x-inbox-token': body.inbox_token,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    return Response.json({ error: `CASParser error: ${err}` }, { status: 502 });
  }

  const data = await res.json() as { status: string; files: CASFile[]; count: number };
  return Response.json({ files: data.files ?? [], count: data.count ?? 0 });
}
