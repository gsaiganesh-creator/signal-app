// apps/web/lib/move-decomposition.ts
// Explains whether a commodity's INR price move is driven by the global
// USD futures price or by USDINR strength/weakness. Pure arithmetic on
// two independent change_pct values already fetched elsewhere — no I/O.

export type MoveDriver = 'commodity' | 'rupee' | 'flat';

export interface MoveDecomposition {
  dominant: MoveDriver;
  narrative: string;
}

const FLAT_THRESHOLD = 0.05; // % — typical daily USDINR/futures noise floor; below this, treat a factor as negligible

export function decomposeMove(usdPct: number | null, fxPct: number | null): MoveDecomposition | null {
  if (usdPct == null || fxPct == null) return null;

  const usdAbs = Math.abs(usdPct);
  const fxAbs = Math.abs(fxPct);

  if (usdAbs < FLAT_THRESHOLD && fxAbs < FLAT_THRESHOLD) {
    return { dominant: 'flat', narrative: 'Flat — no significant move today' };
  }

  // Tie (usdAbs === fxAbs) defaults to 'commodity' via >= — near-zero-probability case, intentional, not a bug.
  const dominant: MoveDriver = usdAbs >= fxAbs ? 'commodity' : 'rupee';
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const usdStr = `global ${fmtPct(usdPct)}`;
  const fxStr = `₹ ${fmtPct(fxPct)}`;

  const narrative = dominant === 'commodity'
    ? `Mostly commodity-driven (${usdStr}, ${fxStr})`
    : `Mostly rupee-driven (${fxStr}, ${usdStr})`;

  return { dominant, narrative };
}
