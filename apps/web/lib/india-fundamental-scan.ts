// "ML Fundamental Strong" — quality/value composite ranking on top of the
// existing manual fundamental screener's own fetch + universe (fetchFund,
// NSE_SCAN_UNIVERSE in lib/fundamental-scan-types.ts). That screener is a
// configure-your-own-filters table; this produces an auto-ranked "best N"
// list, same UX pattern as the Top 20 / Beta technical scans, just scored
// on fundamentals instead of price action. Opposite lens on purpose — a
// momentum pick can easily fail this screen and vice versa.
import { NSE_SCAN_UNIVERSE, fetchFund, type FundStock } from './fundamental-scan-types';

export interface FundamentalSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number;
  trailing_pe: number | null; roe: number | null; debt_to_equity: number | null; revenue_growth: number | null;
  quality_score: number;
}

// Min-max normalize a metric across the batch (0-1, higher = better after
// `invert`), skipping nulls into a neutral 0.5 rather than penalizing a
// stock just because one field wasn't available from Yahoo.
function normalize(values: (number | null)[], invert: boolean): number[] {
  const nums = values.filter((v): v is number => v != null && isFinite(v));
  if (nums.length < 2) return values.map(() => 0.5);
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min;
  return values.map(v => {
    if (v == null || !isFinite(v)) return 0.5;
    const n = range > 0 ? (v - min) / range : 0.5;
    return invert ? 1 - n : n;
  });
}

export async function runFundamentalTopScan(): Promise<FundamentalSignal[]> {
  const BATCH = 8; // quoteSummary is heavier than the chart endpoint — smaller batches
  const raw: FundStock[] = [];

  for (let i = 0; i < NSE_SCAN_UNIVERSE.length; i += BATCH) {
    const batch = NSE_SCAN_UNIVERSE.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(u => fetchFund(u.sym, u.sector)));
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      const f = s.value;
      // Exclude no-price and negative/zero trailing PE (loss-making on a
      // trailing basis) — "cheap because there are no earnings" isn't quality.
      if (!f.price || (f.trailing_pe != null && f.trailing_pe <= 0)) continue;
      raw.push(f);
    }
  }

  if (raw.length === 0) return [];

  const peScores     = normalize(raw.map(r => r.trailing_pe), true);
  const roeScores     = normalize(raw.map(r => r.roe), false);
  const deScores      = normalize(raw.map(r => r.debt_to_equity), true);
  const growthScores  = normalize(raw.map(r => r.revenue_growth), false);

  const results: FundamentalSignal[] = raw.map((s, i) => ({
    symbol: `${s.symbol}.NS`, name: s.name, sector: s.sector,
    cmp: s.price ?? 0, chg: s.change_pct ? +s.change_pct.toFixed(2) : 0,
    trailing_pe: s.trailing_pe, roe: s.roe, debt_to_equity: s.debt_to_equity, revenue_growth: s.revenue_growth,
    quality_score: Math.round((peScores[i] * 25 + roeScores[i] * 30 + deScores[i] * 20 + growthScores[i] * 25) * 100) / 100,
  }));

  return results.sort((a, b) => b.quality_score - a.quality_score);
}
