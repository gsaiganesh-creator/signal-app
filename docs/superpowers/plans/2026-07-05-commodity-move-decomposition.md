# Commodity Move Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-line "Move Driver" explanation to each expanded commodity card, showing whether today's INR price move is mostly from the global USD price or from rupee strength/weakness.

**Architecture:** One new pure function (`decomposeMove`) in a new small lib file, called inline at render time in the commodities page using `change_pct` data already in state — no new fetch, no new endpoint.

**Tech Stack:** Next.js 15 App Router, TypeScript. No test framework in this repo (verification is manual: `tsc --noEmit` + `next build` + arithmetic spot-check, matching the project's established convention from the two prior Trade View plans).

**Spec:** `docs/superpowers/specs/2026-07-05-commodity-move-decomposition-design.md`

---

## Task 1: `decomposeMove` pure function

**Files:**
- Create: `apps/web/lib/move-decomposition.ts`

- [ ] **Step 1: Write the function**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification — spot-check the arithmetic**

This function has no runtime dependency (pure, no fetch), so verify it directly with a quick
throwaway Node check rather than a browser:

```bash
cd apps/web && npx tsx -e "
import { decomposeMove } from './lib/move-decomposition';
console.log(decomposeMove(0.9, 0.3));   // expect dominant: 'commodity', narrative mentions 'commodity-driven'
console.log(decomposeMove(0.2, 0.8));   // expect dominant: 'rupee', narrative mentions 'rupee-driven'
console.log(decomposeMove(0.01, -0.02)); // expect dominant: 'flat', narrative 'Flat — no significant move today'
console.log(decomposeMove(null, 0.5));   // expect null
console.log(decomposeMove(-0.6, 0.4));   // expect dominant: 'commodity' (0.6 > 0.4), narrative shows negative sign correctly (no '+' prefix)
"
```

Expected output: 5 lines — first two show the correct `dominant` field per the comments above,
third shows `dominant: 'flat'` with the flat narrative, fourth is `null`, fifth shows
`dominant: 'commodity'` with `narrative` containing `global -0.60%` (no `+` prefix on a negative
number) and `₹ +0.40%`. If `npx tsx` isn't available, use
`npx ts-node --compiler-options '{"module":"commonjs"}' -e "..."` with an equivalent
`require`-based script instead, or temporarily add a `console.log` block at the bottom of the
file and run it through `npx tsc && node` — any of these confirms the same 5 cases.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/move-decomposition.ts
git commit -m "feat: add decomposeMove — explains commodity vs rupee driven price moves

Pure function, no I/O. Compares a commodity's own USD change_pct
against USDINR's change_pct to determine which factor dominated
today's INR price move."
```

---

## Task 2: Wire into the commodities page

**Files:**
- Modify: `apps/web/app/dashboard/commodities/page.tsx`

- [ ] **Step 1: Import the function**

Near the top of `apps/web/app/dashboard/commodities/page.tsx`, alongside the existing
`import { TechTiles } from '@/components/TechTiles';` line, add:

```typescript
import { decomposeMove } from '@/lib/move-decomposition';
```

- [ ] **Step 2: Render the decomposition line below `<TechTiles>`**

Find this block inside the `COMMODITIES.map(com => { ... })` render (currently the last line
before the closing `</div>` of the card):

```typescript
                {isOpen && <TechTiles tech={tech} />}
              </div>
            );
          })}
```

Replace it with:

```typescript
                {isOpen && (
                  <>
                    <TechTiles tech={tech} />
                    {(() => {
                      const decomp = decomposeMove(chg ?? null, prices[USDINR_SYM]?.change_pct ?? null);
                      return decomp && (
                        <div style={{ marginTop:8, fontSize:11, color:'var(--dim)' }}>
                          {decomp.narrative}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
```

(`chg` is the existing `const chg = prices[com.sym]?.change_pct;` declared a few lines above in
the same `.map()` callback, and `USDINR_SYM` is the existing top-of-file constant
`const USDINR_SYM = 'USDINR=X';` — both already in scope, no new state or fetch needed.)

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

```bash
cd apps/web && npm run dev &
sleep 3
curl -s "http://localhost:3000/api/prices?symbols=GC=F,USDINR=X" | python3 -m json.tool
```

Expected: JSON with `change_pct` present (non-null) for both `GC=F` and `USDINR=X` — confirms
the two inputs `decomposeMove` needs are actually available from the already-existing
`/api/prices` call this page makes (no regression, no new endpoint needed).

Then, if you have a way to drive a browser: open `http://localhost:3000/dashboard/commodities`,
click a commodity card, confirm the expanded view shows the `TechTiles` row followed by a new
dim-colored line reading something like "Mostly rupee-driven (₹ +0.41%, global -0.12%)" (exact
numbers depend on live market data). If the page is auth-gated and no test credentials/browser
tool are available (as was the case for the forex and commodities Trade View tasks previously),
state that explicitly and rely on: `tsc --noEmit`, a full `next build` compiling the route, and
the curl check above, matching the fallback approach used in the prior two plans for this app.

Also run:

```bash
npx next build
```

Expected: succeeds, `/dashboard/commodities` compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/commodities/page.tsx
git commit -m "feat: show move-driver narrative on expanded commodity cards

Explains whether today's INR price move is mostly commodity-driven
or rupee-driven, using decomposeMove() on data already fetched via
/api/prices — no new API calls."
```

---

## Self-Review Notes

**Spec coverage:**
- `decomposeMove` function, threshold logic, narrative templates, `MoveDriver`/`MoveDecomposition`
  types (spec §"Architecture 1") → Task 1.
- No-new-fetch requirement, reuse of existing `chg` and `prices[USDINR_SYM]?.change_pct` (spec
  §"Data source") → Task 2, explicitly reuses the existing `chg` variable rather than
  re-deriving it.
- Placement below `<TechTiles>`, full-width line, not a 4th grid tile (spec §"Architecture 2")
  → Task 2 Step 2.
- Forex page correctly untouched (spec §"Scope") — no task references
  `apps/web/app/dashboard/forex/page.tsx`.
- Error handling — `decomposeMove` returns `null` on missing data, page renders nothing extra
  (spec §"Error Handling") → built into both the function (Task 1) and the `decomp &&` guard in
  the JSX (Task 2).
- Compliance language (factual, no buy/sell/signal) — the narrative templates in Task 1 use only
  "commodity-driven"/"rupee-driven" framing, consistent with spec.

**Type consistency check:** `MoveDecomposition` (Task 1) is consumed as `decomp` in Task 2 with
`decomp.narrative` — matches the interface exactly. `decomposeMove(usdPct: number | null, fxPct:
number | null)` signature matches the call site's arguments (`chg ?? null`,
`prices[USDINR_SYM]?.change_pct ?? null`) — both nullable numbers, matches.

**Placeholder scan:** none found — both tasks contain complete, runnable code.
