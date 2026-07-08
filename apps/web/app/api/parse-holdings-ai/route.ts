// Last-resort AI fallback for holdings statements the heuristic column-matcher
// (parseRows/parsePdf in dashboard/portfolio/page.tsx) can't recognize —
// new/unlisted brokerages, renamed columns, unusual layouts. Only called
// when every hand-coded broker format has already failed to parse.
export const runtime = 'nodejs';

interface AIRow { symbol?: string; company_name?: string; qty?: number; avg_price?: number; exchange?: string }

const MAX_ROWS = 80;
const MAX_TEXT_CHARS = 6000;

function buildPrompt(rows?: string[][], text?: string): string {
  const body = rows
    ? rows.slice(0, MAX_ROWS).map(r => r.join(' | ')).join('\n')
    : (text ?? '').slice(0, MAX_TEXT_CHARS);

  return (
    `Below is raw content extracted from a stockbroker holdings/portfolio statement ` +
    `(exact broker/layout unknown — could be any Indian or US brokerage export).\n\n` +
    `${body}\n\n` +
    `Extract every actual stock/ETF holding row (skip section titles, column headers, ` +
    `subtotal/total rows, blank rows, and non-equity instruments like bonds/G-Secs/NCDs/FDs ` +
    `unless clearly an ETF or mutual fund unit holding).\n\n` +
    `Return ONLY a JSON array (no markdown fences, no commentary), one object per holding:\n` +
    `[{"symbol":"<best-guess exchange ticker, e.g. RELIANCE or AAPL>","company_name":"<name as printed>",` +
    `"qty":<number>,"avg_price":<number, 0 if not present in statement>,"exchange":"<NSE|BSE|NYSE|NASDAQ, best guess>"}]\n` +
    `If you cannot confidently parse any holdings, return [].`
  );
}

function extractJsonArray(raw: string): unknown[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return Response.json({ result: [], debug: 'AI_FALLBACK: XAI_API_KEY not set' });

  let body: { rows?: string[][]; text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ result: [], debug: 'AI_FALLBACK: invalid request body' });
  }
  if (!body.rows?.length && !body.text?.trim()) {
    return Response.json({ result: [], debug: 'AI_FALLBACK: no content provided' });
  }

  const prompt = buildPrompt(body.rows, body.text);

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'grok-4.3',
        messages: [
          { role: 'system', content: 'You extract structured holdings data from messy brokerage statement text. Respond with strict JSON only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return Response.json({ result: [], debug: `AI_FALLBACK: grok HTTP ${res.status}` });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const rawRows = extractJsonArray(content) as AIRow[];

    const VALID_EXCH = new Set(['NSE', 'BSE', 'NYSE', 'NASDAQ']);
    const result = rawRows
      .map(r => {
        const symbol = String(r.symbol ?? r.company_name ?? '').trim().toUpperCase().replace(/[^A-Z0-9&.-]/g, '');
        const qty = Number(r.qty);
        const avg_price = Number(r.avg_price ?? 0);
        const exchange = VALID_EXCH.has(String(r.exchange ?? '').toUpperCase()) ? String(r.exchange).toUpperCase() : 'NSE';
        if (!symbol || symbol.length < 1 || symbol.length > 20 || !Number.isFinite(qty) || qty <= 0) return null;
        return {
          symbol,
          company_name: String(r.company_name ?? '').trim(),
          qty: Math.round(qty),
          avg_price: Number.isFinite(avg_price) && avg_price >= 0 ? avg_price : 0,
          exchange,
        };
      })
      .filter(Boolean);

    return Response.json({
      result,
      debug: `AI_FALLBACK: grok parsed ${result.length} row(s) — verify carefully before saving`,
    });
  } catch (e) {
    return Response.json({ result: [], debug: `AI_FALLBACK: ${e instanceof Error ? e.message : String(e)}` });
  }
}
