// Ticker TA detail via query param — avoids Next.js dynamic segment issues.
// Called as: /api/ml/signals/detail?ticker=SBIN.NS
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function r(v: number, d = 2) { return +v.toFixed(d); }

interface ScanSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('ticker') ?? '';
  if (!raw) return Response.json({ error: 'ticker required' }, { status: 400 });
  const sym = raw.toUpperCase().endsWith('.NS') ? raw.toUpperCase() : `${raw.toUpperCase()}.NS`;

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const scanRes = await fetch(`${base}/api/ml/signals?limit=50`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!scanRes.ok) return Response.json({ error: 'scan unavailable' }, { status: 502 });

    const { signals } = await scanRes.json() as { signals: ScanSignal[] };
    const hit = signals.find(s => s.symbol.toUpperCase() === sym);
    if (!hit) return Response.json({ error: `${sym} not in current scan` }, { status: 404 });

    const cmp = hit.cmp;
    const bullish = hit.confidence >= 70 || hit.rsi < 50;

    return Response.json({
      symbol: sym, name: hit.name,
      price: cmp, change_pct: hit.chg,
      ema5: 0, ema20: hit.ema20, ema50: 0, sma200: null,
      rsi: hit.rsi, macd: 0, macd_signal: 0,
      bb_upper: 0, bb_lower: 0,
      support_1: r(hit.sl * 1.01, 1), support_2: r(hit.sl, 1),
      resistance_1: r(hit.entry_high * 1.02, 1), resistance_2: r(hit.target * 0.97, 1),
      entry_lo: hit.entry_low, entry_hi: hit.entry_high,
      target_1: hit.target, target_2: r(hit.target * 1.04, 1), stop: hit.sl,
      w52_high: 0, w52_low: 0, pct_from_52h: 0,
      vol_ratio: 1, bias: bullish ? 'BULLISH' : 'NEUTRAL',
      signals: [
        { type: hit.signal, reason: `RSI ${hit.rsi} · EMA dist ${hit.ema_dist_pct}% · Confidence ${hit.confidence}%` },
        ...(hit.rsi < 50 ? [{ type: 'BULLISH', reason: 'RSI below midline — momentum building' }] : []),
        ...(hit.ema_dist_pct < 2 ? [{ type: 'NEAR EMA20', reason: `Price within ${hit.ema_dist_pct}% of EMA20 — tight entry zone` }] : []),
      ],
    }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
