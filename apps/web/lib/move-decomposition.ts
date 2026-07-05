// apps/web/lib/move-decomposition.ts
// Explains whether a commodity's INR price move is driven by the global
// USD futures price or by USDINR strength/weakness. Pure arithmetic on
// two independent change_pct values already fetched elsewhere — no I/O.

export type MoveDriver = 'commodity' | 'rupee' | 'flat';

export interface MoveDecomposition {
  dominant: MoveDriver;
  narrative: string;
}

const FLAT_THRESHOLD = 0.05; // % — below this, treat a factor as negligible

export function decomposeMove(usdPct: number | null, fxPct: number | null): MoveDecomposition | null {
  if (usdPct == null || fxPct == null) return null;

  const usdAbs = Math.abs(usdPct);
  const fxAbs = Math.abs(fxPct);

  if (usdAbs < FLAT_THRESHOLD && fxAbs < FLAT_THRESHOLD) {
    return { dominant: 'flat', narrative: 'Flat — no significant move today' };
  }

  const dominant: MoveDriver = usdAbs >= fxAbs ? 'commodity' : 'rupee';
  const usdSign = usdPct >= 0 ? '+' : '';
  const fxSign = fxPct >= 0 ? '+' : '';
  const usdStr = `global ${usdSign}${usdPct.toFixed(2)}%`;
  const fxStr = `₹ ${fxSign}${fxPct.toFixed(2)}%`;

  const narrative = dominant === 'commodity'
    ? `Mostly commodity-driven (${usdStr}, ${fxStr})`
    : `Mostly rupee-driven (${fxStr}, ${usdStr})`;

  return { dominant, narrative };
}
