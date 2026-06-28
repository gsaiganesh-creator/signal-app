// SIGNAL Market Mood Index (MMI) — 3 inputs, 100pt scale
// Nifty vs 200D EMA (40pts) + India VIX inverted (35pts) + FII 5d net (25pts)
export const runtime = 'edge';

const HDR = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function calcEma(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let v = prices.slice(0, period).reduce((a, b) => a + b) / period;
  for (let i = period; i < prices.length; i++) v = prices[i] * k + v * (1 - k);
  return v;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function mmiLabel(s: number): string {
  if (s <= 20) return 'Extreme Fear';
  if (s <= 40) return 'Fear';
  if (s <= 60) return 'Neutral';
  if (s <= 80) return 'Greed';
  return 'Extreme Greed';
}

export async function GET() {
  try {
    const [niftyRes, vixRes, fiiRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1y',
        { headers: HDR, signal: AbortSignal.timeout(8000) }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=1mo',
        { headers: HDR, signal: AbortSignal.timeout(8000) }),
      fetch(`${SUPA_URL}/rest/v1/fii_dii_history?select=fii_net,date&order=date.desc&limit=5`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      }).catch(() => null),
    ]);

    // ── Component 1: Nifty vs 200D EMA (40 pts) ─────────────────────────────
    // +5% above EMA = 40pts, at EMA = 20pts, -5% below = 0pts
    let niftyScore = 20;
    let niftyPrice: number | null = null, ema200: number | null = null, pctVsEma: number | null = null;

    if (niftyRes.ok) {
      const d = await niftyRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } };
      const closes = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
        .filter((c): c is number => c != null && isFinite(c));
      niftyPrice = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? null;
      if (closes.length >= 200 && niftyPrice) {
        ema200    = calcEma(closes, 200);
        pctVsEma  = ((niftyPrice - ema200) / ema200) * 100;
        niftyScore = clamp(((pctVsEma + 5) / 10) * 40, 0, 40);
      }
    }

    // ── Component 2: India VIX inverted (35 pts) ─────────────────────────────
    // VIX 11 → 35pts (calm), VIX 25 → 0pts (panic)
    let vixScore = 17.5;
    let vixLevel: number | null = null;

    if (vixRes.ok) {
      const d = await vixRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
      vixLevel = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
      if (vixLevel != null) vixScore = clamp(((25 - vixLevel) / 14) * 35, 0, 35);
    }

    // ── Component 3: FII 5-day net flow (25 pts) ─────────────────────────────
    // Net +3000 Cr → 25pts (buying), Net -3000 Cr → 0pts (selling)
    let fiiScore = 12.5;
    let fii5dNet: number | null = null;

    if (fiiRes?.ok) {
      const rows = await fiiRes.json() as { fii_net: number }[];
      if (rows.length > 0) {
        fii5dNet  = rows.reduce((s, r) => s + (r.fii_net ?? 0), 0);
        fiiScore  = clamp(((fii5dNet + 3000) / 6000) * 25, 0, 25);
      }
    }

    const score = Math.round(niftyScore + vixScore + fiiScore);

    return Response.json({
      score,
      label: mmiLabel(score),
      components: {
        nifty: {
          label: 'Nifty vs 200 EMA',
          score: Math.round(niftyScore),
          max: 40,
          price: niftyPrice ? +niftyPrice.toFixed(0) : null,
          ema200: ema200 ? +ema200.toFixed(0) : null,
          pct_vs_ema: pctVsEma ? +pctVsEma.toFixed(2) : null,
          signal: pctVsEma != null ? (pctVsEma > 0 ? 'bullish' : 'bearish') : 'unknown',
        },
        vix: {
          label: 'India VIX',
          score: Math.round(vixScore),
          max: 35,
          level: vixLevel ? +vixLevel.toFixed(1) : null,
          signal: vixLevel != null ? (vixLevel < 15 ? 'calm' : vixLevel < 20 ? 'normal' : 'elevated') : 'unknown',
        },
        fii: {
          label: 'FII 5d Flow',
          score: Math.round(fiiScore),
          max: 25,
          net_5d_cr: fii5dNet ? +fii5dNet.toFixed(0) : null,
          signal: fii5dNet != null ? (fii5dNet > 0 ? 'buying' : 'selling') : 'unknown',
        },
      },
      computed_at: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' },
    });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
