// Grok-powered AI narrative for a single signal (NSE or US) — Elite tier only.
// Called from DetailDrawer / USDetailDrawer when isElite=true.
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol     = searchParams.get('symbol') ?? '';
  const name       = searchParams.get('name') ?? symbol;
  const sector     = searchParams.get('sector') ?? '';
  const rsi        = searchParams.get('rsi') ?? '';
  const emaDist    = searchParams.get('ema_dist') ?? '';
  const signal     = searchParams.get('signal') ?? '';
  const confidence = searchParams.get('confidence') ?? '';
  const market     = searchParams.get('market') === 'us' ? 'us' : 'india';

  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return Response.json({ narrative: null, error: 'XAI_API_KEY not set' });

  const userPrompt =
    `${market === 'us' ? 'US Stock' : 'NSE Stock'}: ${name} (${symbol})\n` +
    `Sector: ${sector}\n` +
    `RSI-14: ${rsi} | EMA20 distance: ${emaDist}% | Signal: ${signal} | Confidence: ${confidence}%\n\n` +
    `Give a concise 3-line analysis:\n` +
    `📈 Catalyst: [why this stock looks interesting right now technically]\n` +
    `⚠️ Risk: [key risk to watch for this setup]\n` +
    `⏰ Timing: [entry timing guidance based on the indicators]\n\n` +
    `Each line must start with exactly those emojis. 1 sentence per line. Be specific to the stock/sector.`;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4.3',
        messages: [
          { role: 'system', content: `You are a concise ${market === 'us' ? 'US stock market' : 'Indian stock market'} technical analyst. Respond only with the 3-line analysis requested. No preamble, no extra text.` },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 180,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return Response.json({ narrative: null });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const narrative = data.choices?.[0]?.message?.content?.trim() ?? null;
    return Response.json({ narrative }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return Response.json({ narrative: null });
  }
}
