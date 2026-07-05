# Commodity Move Decomposition — Design

## Context

Every commodity price on `apps/web/app/dashboard/commodities/page.tsx` is computed as
`usdPrice × usdInrRate` (see each `COMMODITIES[].convFn`). This means a day's INR price move is
never a pure commodity move — it's always a blend of two independent factors: the global USD
futures price change, and the USDINR exchange-rate change. The page currently shows only the
blended result (`chg` from `prices[com.sym]?.change_pct`, which is actually the USD futures
change_pct, displayed next to the INR price) with no way for a user to tell which factor drove
today's move.

This matters concretely for India because of a real macro link: crude oil (India imports ~85%
of consumption) feeds directly into the rupee's strength via the current account, so "crude up"
and "rupee weaker" often reinforce each other. Similarly, gold's INR price can rise either from
genuine global gold demand or from pure rupee weakness — two very different situations that look
identical on the page today.

This is a companion feature to `docs/superpowers/specs/2026-07-05-commodities-trade-view-design.md`
(the RSI/EMA/Bias Trade View, already shipped) — this spec adds a "Move Driver" line to the same
expanded-card surface.

## Scope

Commodities page only. The forex page is explicitly out of scope: a forex pair (e.g. USDINR
itself) has no separate "global commodity price" to decompose from — the concept doesn't apply
there.

## Data source: no new fetch required

`fetchPrices()` in `commodities/page.tsx` already requests both `COMMODITIES[].sym` (e.g.
`GC=F`) and `USDINR_SYM` (`USDINR=X`) from `/api/prices`, and the response already includes
`change_pct` for every requested symbol (confirmed: `PriceMap = Record<string, { price: number |
null; change_pct: number | null }>`). Today the page reads `prices[com.sym]?.change_pct` (the
commodity's own USD change) but never reads `prices[USDINR_SYM]?.change_pct`. This feature is
pure client-side arithmetic on data already in state — zero new API calls, zero new endpoint.

## Architecture

### 1. New pure function: `apps/web/lib/move-decomposition.ts`

```typescript
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
```

`usdPct`/`fxPct` are the two independently-fetched `change_pct` values (commodity's own, and
USDINR's). The combined INR move is approximately `usdPct + fxPct` (the compounding cross-term
`usdPct × fxPct / 100` is negligible at daily-percent scale) — this function does not compute or
display that combined number itself (the page already shows the real INR price/change
elsewhere); it only explains which of the two factors dominates.

### 2. Commodities page wiring

In `apps/web/app/dashboard/commodities/page.tsx`, inside the existing `isOpen && (...)` expand
block (currently rendering `<TechTiles tech={tech} />`), add a full-width line below it:

```typescript
{isOpen && (
  <>
    <TechTiles tech={tech} />
    {(() => {
      const decomp = decomposeMove(chg, prices[USDINR_SYM]?.change_pct ?? null);
      return decomp && (
        <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>
          {decomp.narrative}
        </div>
      );
    })()}
  </>
)}
```

(`chg` is the existing `const chg = prices[com.sym]?.change_pct;` already declared earlier in
the same `.map()` callback — reused, not refetched.)

No new state, no new `useEffect`, no new fetch — `decomposeMove` is called inline at render
time from data already in the `prices` state map.

### 3. Compliance / language

Purely factual/explanatory framing ("driven by X") — never "buy"/"sell"/"signal", consistent
with the existing Bias-language discipline on this page and the forex page.

## Error Handling

If either `change_pct` is `null` (API hadn't returned it, or Yahoo omitted it for that symbol),
`decomposeMove` returns `null` and the page renders nothing extra for that card — no crash, no
`—` placeholder needed since this is a supplementary line, not a required field.

## Testing

No automated test infra exists in this repo (consistent with the rest of the app). Verify by:

- Spot-checking 2-3 commodities against known-good numbers: manually compute `usd_pct + fx_pct`
  from the raw `/api/prices` response and confirm the narrative correctly labels the larger-
  magnitude factor as dominant.
- Confirming the `flat` case: temporarily feed `decomposeMove(0.01, -0.02)` (both under threshold)
  and confirm it returns the "Flat" narrative, not a dominant-factor sentence.
- Confirming graceful degrade: confirm no crash and no line rendered when `USDINR=X`'s
  `change_pct` is null (e.g. simulate by checking behavior when `/api/prices` is slow/offline,
  same as the existing `chg == null` handling elsewhere on the page).

## Out of scope

- Forex page (no analogous decomposition applies).
- Any DXY/global-dollar-index correlation, gold-vs-DXY specific narrative, or crude-oil-vs-INR
  causal narrative beyond the generic dominant-factor line — those are richer, separate ideas
  (e.g. a dedicated cross-asset correlation dashboard) not built here.
- Exact combined INR % change display (the page's existing displayed change already serves that
  role) — this feature only explains attribution, not a new headline number.
