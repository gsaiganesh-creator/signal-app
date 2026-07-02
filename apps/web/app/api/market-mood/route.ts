// SIGNAL-MMI — Market Mood Index
// 5 inputs, each normalized 0-100, weighted composite.
// Inputs: Nifty vs 200EMA · India VIX · FII 5d flow · Sector breadth · US VIX
export const runtime = 'edge';

const HDR = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Sector indices for breadth calculation
const SECTOR_TICKERS = ['^CNXENERGY','^CNXFIN','^CNXIT','^CNXPHARMA','^CNXAUTO','^CNXFMCG','^CNXMETAL'];

function calcEma(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let v = prices.slice(0, period).reduce((a, b) => a + b) / period;
  for (let i = period; i < prices.length; i++) v = prices[i] * k + v * (1 - k);
  return v;
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function norm(x: number, lo: number, hi: number) { return clamp((x - lo) / (hi - lo) * 100); }
function invNorm(x: number, lo: number, hi: number) { return 100 - norm(x, lo, hi); }

function zone(s: number): { label: string; color: string; hint: string } {
  if (s <= 24) return { label: 'Extreme Fear',  color: '#FF3B5C', hint: 'Historically a buying zone — fear peaks near bottoms' };
  if (s <= 44) return { label: 'Fear',           color: '#FF5C1A', hint: 'Caution but watch for reversal signals' };
  if (s <= 55) return { label: 'Neutral',        color: '#FFB800', hint: 'Mixed signals — breadth and flow are balanced' };
  if (s <= 74) return { label: 'Greed',          color: '#7FD957', hint: 'Market optimism — stay selective, manage risk' };
  return              { label: 'Extreme Greed',  color: '#00D4A0', hint: 'Froth zone — consider trimming overweight positions' };
}

type SubKey = 'momentum' | 'vix' | 'fii' | 'breadth' | 'global';
interface Sub { key: SubKey; label: string; score: number; weight: number; raw: number | null; rawUnit: string; ok: boolean }

function redistribute(subs: Sub[]): Sub[] {
  const failedWeight = subs.filter(s => !s.ok).reduce((a, s) => a + s.weight, 0);
  if (failedWeight === 0) return subs;
  const ok = subs.filter(s => s.ok);
  const total = ok.reduce((a, s) => a + s.weight, 0);
  return subs.map(s => s.ok
    ? { ...s, weight: total > 0 ? s.weight + (s.weight / total) * failedWeight : 1 / ok.length }
    : { ...s, weight: 0 }
  );
}

export async function GET() {
  try {
    const t0 = Date.now();

    // ── Fetch all sources in parallel ────────────────────────────────────────
    const yf = (ticker: string, range = '1y') =>
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`,
        { headers: HDR, signal: AbortSignal.timeout(8000) }).catch(() => null);

    const [niftyRes, vixRes, usVixRes, ...sectorRess] = await Promise.all([
      yf('^NSEI', '1y'),
      yf('^INDIAVIX', '1mo'),
      yf('^VIX', '1mo'),
      ...SECTOR_TICKERS.map(t => yf(t, '5d')),
    ]);

    // FII from Supabase (populated by /api/fii-dii cron)
    const fiiRes = await fetch(
      `${SUPA_URL}/rest/v1/fii_dii_history?select=fii_net,date&order=date.desc&limit=5`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    ).catch(() => null);

    // ── 1. Nifty vs 200D EMA ─────────────────────────────────────────────────
    let S_mom = 50; let raw_mom: number | null = null; let ok_mom = false;
    if (niftyRes?.ok) {
      const d = await niftyRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } };
      const closes = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null && isFinite(c));
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? closes.at(-1);
      if (closes.length >= 200 && price) {
        const ema200 = calcEma(closes, 200);
        raw_mom = ((price - ema200) / ema200) * 100;
        S_mom = norm(raw_mom, -10, 10);           // -10% → 0, +10% → 100
        ok_mom = true;
      }
    }

    // ── 2. India VIX (level + 5d direction blended) ──────────────────────────
    let S_vix = 50; let raw_vix: number | null = null; let ok_vix = false;
    if (vixRes?.ok) {
      const d = await vixRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } };
      const closes = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null && isFinite(c));
      const level = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? closes.at(-1);
      if (level != null) {
        const chg5d = closes.length >= 5 ? ((level - closes.at(-5)!) / closes.at(-5)!) * 100 : 0;
        const S_level = invNorm(level, 11, 25);   // vix 11 → calm(100), 25 → panic(0)
        const S_chg   = invNorm(chg5d, -20, 20);  // VIX rising 20% → fear(0), falling → calm(100)
        S_vix = 0.6 * S_chg + 0.4 * S_level;
        raw_vix = level;
        ok_vix = true;
      }
    }

    // ── 3. FII 5-day rolling net flow ────────────────────────────────────────
    let S_fii = 50; let raw_fii: number | null = null; let ok_fii = false;
    if (fiiRes?.ok) {
      const rows = await fiiRes.json() as { fii_net: number }[];
      if (rows.length > 0) {
        raw_fii = rows.reduce((a, r) => a + (r.fii_net ?? 0), 0);
        S_fii = norm(raw_fii, -15000, 15000);     // -15000cr → 0, +15000cr → 100
        ok_fii = true;
      }
    }

    // ── 4. Sector breadth (% of sector indices that are positive today) ──────
    let S_breadth = 50; let raw_breadth: number | null = null; let ok_breadth = false;
    let green = 0, total = 0;
    for (const res of sectorRess) {
      if (!res?.ok) continue;
      const d = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number } }> } };
      const meta = d?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice && meta?.previousClose) {
        total++;
        if (meta.regularMarketPrice > meta.previousClose) green++;
      }
    }
    if (total >= 3) {
      raw_breadth = green / total;
      S_breadth = raw_breadth * 100;              // 0% green → 0, 100% green → 100
      ok_breadth = true;
    }

    // ── 5. US VIX (global fear barometer) ────────────────────────────────────
    let S_global = 50; let raw_global: number | null = null; let ok_global = false;
    if (usVixRes?.ok) {
      const d = await usVixRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
      const level = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (level != null) {
        S_global = invNorm(level, 13, 30);        // us vix 13 → calm(100), 30 → panic(0)
        raw_global = level;
        ok_global = true;
      }
    }

    // ── Weighted composite ───────────────────────────────────────────────────
    const subs: Sub[] = [
      { key:'momentum', label:'Nifty vs 200 EMA', score: clamp(S_mom),      weight: 0.30, raw: raw_mom,     rawUnit:'% vs EMA',    ok: ok_mom      },
      { key:'vix',      label:'India VIX',         score: clamp(S_vix),      weight: 0.25, raw: raw_vix,     rawUnit:'level',       ok: ok_vix      },
      { key:'fii',      label:'FII 5d Net Flow',   score: clamp(S_fii),      weight: 0.20, raw: raw_fii,     rawUnit:'₹ Cr',        ok: ok_fii      },
      { key:'breadth',  label:'Sector Breadth',    score: clamp(S_breadth),  weight: 0.15, raw: raw_breadth, rawUnit:'% sectors +', ok: ok_breadth  },
      { key:'global',   label:'US VIX',            score: clamp(S_global),   weight: 0.10, raw: raw_global,  rawUnit:'level',       ok: ok_global   },
    ];
    const final = redistribute(subs);
    const score = Math.round(final.reduce((a, s) => a + s.score * s.weight, 0) * 10) / 10;
    const z = zone(score);

    return Response.json({
      score,
      zone:      z.label,
      zoneColor: z.color,
      hint:      z.hint,
      subScores: final.map(s => ({ ...s, weight: Math.round(s.weight * 100), score: Math.round(s.score) })),
      asOf:      new Date().toISOString(),
      latencyMs: Date.now() - t0,
      sources:   { momentum: ok_mom, vix: ok_vix, fii: ok_fii, breadth: ok_breadth, global: ok_global },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
