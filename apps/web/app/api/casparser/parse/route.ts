export const runtime = 'edge';

interface Scheme {
  isin: string; name: string; type: string;
  units: number; nav: number; value: number; cost: number;
  additional_info?: { amfi?: string; rta_code?: string };
}
interface MFFolio { folio_number: string; amc: string; schemes: Scheme[]; }

export async function POST(req: Request) {
  const body = await req.json() as { pdf_url?: string; pan?: string };
  if (!body.pdf_url || !body.pan) {
    return Response.json({ error: 'pdf_url and pan required' }, { status: 400 });
  }

  const res = await fetch('https://api.casparser.in/v4/smart/parse', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CAS_PARSER_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdf_url: body.pdf_url, password: body.pan.toUpperCase().trim() }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    return Response.json({ error: `Parse failed: ${err}` }, { status: 502 });
  }

  const data = await res.json() as { status?: string; mutual_funds?: MFFolio[] };

  const holdings = (data.mutual_funds ?? []).flatMap(folio =>
    (folio.schemes ?? []).map(s => ({
      scheme_code: s.additional_info?.amfi ?? s.isin ?? '',
      scheme_name: s.name,
      units: s.units,
      avg_nav: s.units > 0 ? +(s.cost / s.units).toFixed(4) : s.nav,
      current_nav: s.nav,
    }))
  ).filter(h => h.units > 0 && h.scheme_name);

  return Response.json({ holdings, total: holdings.length });
}
