# Commodities Trade View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expandable RSI/EMA-gap/Bias technical-analysis rows to the commodities page's Live Price grid, reusing the exact pattern already shipped on the forex page — first generalizing the forex-only endpoint into a shared one.

**Architecture:** Rename `apps/web/app/api/forex-technical/` → `apps/web/app/api/technical/` (no internal logic change), update the forex page's one call site to match, then wire the commodities page to the same endpoint with the same expandable-row UI pattern forex already has.

**Tech Stack:** Next.js 15 App Router edge routes, TypeScript, no test framework in this repo (verification is manual: `tsc --noEmit` + curl + browser check, matching existing project convention and the forex plan's precedent).

**Spec:** `docs/superpowers/specs/2026-07-05-commodities-trade-view-design.md`

---

## Task 1: Generalize `/api/forex-technical` into `/api/technical`

**Files:**
- Create: `apps/web/app/api/technical/route.ts` (moved content, updated comment)
- Delete: `apps/web/app/api/forex-technical/route.ts`
- Modify: `apps/web/app/dashboard/forex/page.tsx:62`

- [ ] **Step 1: Create the new route at the new path**

Create `apps/web/app/api/technical/route.ts` with the same content as the current
`apps/web/app/api/forex-technical/route.ts`, only updating the file-header comment (no logic
changes — same guard conditions, same `TechResult` shape, same cache header):

```typescript
// apps/web/app/api/technical/route.ts
// RSI/EMA/Supertrend for any Yahoo Finance symbol (FX pairs, commodity futures, etc.),
// reusing the same math as /api/stock-detail. Consumed by the forex and commodities pages.
import { rsi, ema, supertrend } from '@/lib/technicals';

export const runtime = 'edge';

interface TechResult {
  rsi14: number | null;
  ema_gap_pct: number | null;
  bias: 'bullish' | 'bearish' | null;
}

const EMPTY: TechResult = { rsi14: null, ema_gap_pct: null, bias: null };

async function fetchOne(sym: string): Promise<TechResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return EMPTY;

    const data = await res.json() as {
      chart?: { result?: Array<{
        indicators?: { quote?: Array<{
          close?: (number | null)[];
          high?:  (number | null)[];
          low?:   (number | null)[];
        }> };
      }> };
    };

    const result = data?.chart?.result?.[0];
    const q0 = result?.indicators?.quote?.[0] ?? {};
    const closes = (q0.close ?? []).filter((c): c is number => c != null && isFinite(c));
    const highs  = (q0.high  ?? []).filter((c): c is number => c != null && isFinite(c));
    const lows   = (q0.low   ?? []).filter((c): c is number => c != null && isFinite(c));

    if (closes.length < 51 || highs.length < 12 || lows.length < 12) return EMPTY;

    const rsi14 = rsi(closes, 14);
    const ema50 = ema(closes, 50);
    const lastClose = closes[closes.length - 1];
    const ema_gap_pct = ema50 ? +((lastClose - ema50) / ema50 * 100).toFixed(2) : null;
    const st = supertrend(highs, lows, closes, 10, 3);
    const bias: TechResult['bias'] = st ? (st.direction === 1 ? 'bullish' : 'bearish') : null;

    return {
      rsi14: rsi14 != null ? +rsi14.toFixed(1) : null,
      ema_gap_pct,
      bias,
    };
  } catch {
    return EMPTY;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (!symbols.length) return Response.json({ error: 'symbols required' }, { status: 400 });

  const entries = await Promise.all(symbols.map(async sym => [sym, await fetchOne(sym)] as const));
  const out: Record<string, TechResult> = {};
  for (const [sym, tech] of entries) out[sym] = tech;

  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } });
}
```

- [ ] **Step 2: Delete the old route directory**

```bash
git rm -r apps/web/app/api/forex-technical
```

- [ ] **Step 3: Update the forex page's call site**

In `apps/web/app/dashboard/forex/page.tsx`, line 62, change:

```typescript
      const res = await fetch(`/api/forex-technical?symbols=${encodeURIComponent(syms)}`);
```

to:

```typescript
      const res = await fetch(`/api/technical?symbols=${encodeURIComponent(syms)}`);
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual regression check — both consumers**

```bash
cd apps/web && npm run dev &
sleep 3
curl -s "http://localhost:3000/api/technical?symbols=USDINR=X,GC=F" | python3 -m json.tool
curl -s -o /dev/null -w "old route status: %{http_code}\n" "http://localhost:3000/api/forex-technical?symbols=USDINR=X"
```

Expected: first curl returns `{"USDINR=X": {...}, "GC=F": {...}}` with real non-null values for
both an FX pair and a commodity future (confirms the endpoint is genuinely symbol-agnostic).
Second curl returns `old route status: 404` (confirms the old route is really gone, not just
shadowed). Leave the dev server running for Task 2.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/technical/route.ts apps/web/app/dashboard/forex/page.tsx
git commit -m "refactor: rename forex-technical endpoint to shared /api/technical

No logic change — same route content, moved so it can be reused by
the commodities page without duplicating the file. Forex page's one
call site updated to match."
```

---

## Task 2: Expandable technical rows on the commodities page

**Files:**
- Modify: `apps/web/app/dashboard/commodities/page.tsx`

- [ ] **Step 1: Add the technicals type, state, and fetch function**

In `apps/web/app/dashboard/commodities/page.tsx`, after the existing
`type PriceMap = Record<string, { price: number | null; change_pct: number | null }>;` line, add:

```typescript
type TechMap = Record<string, { rsi14: number | null; ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null }>;
```

Inside the `CommoditiesPage` component, after the existing
`const [loading, setLoading] = useState(true);` line, add:

```typescript
  const [technicals, setTechnicals] = useState<TechMap>({});
  const [expandedCom, setExpandedCom] = useState<string | null>(null);
```

(Named `expandedCom` rather than `expandedPair` since the identifier here is a commodity `id`
like `'gold'`, not a currency pair code — keep the name accurate to what it holds.)

After the existing `fetchPrices` callback (right before the `useEffect` that calls it), add:

```typescript
  const fetchTechnicals = useCallback(async () => {
    try {
      const syms = COMMODITIES.map(c => c.sym).join(',');
      const res = await fetch(`/api/technical?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) setTechnicals(await res.json());
    } catch { /* offline */ }
  }, []);
```

Replace the existing `useEffect(() => { fetchPrices(); }, [fetchPrices]);` with:

```typescript
  useEffect(() => { fetchPrices(); fetchTechnicals(); }, [fetchPrices, fetchTechnicals]);
```

- [ ] **Step 2: Wire the Refresh button to also refresh technicals**

Find the Refresh button:

```typescript
          <button onClick={fetchPrices} disabled={loading}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: loading ? 0.6 : 1 }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
```

Change `onClick={fetchPrices}` to:

```typescript
          <button onClick={() => { fetchPrices(); fetchTechnicals(); }} disabled={loading}
```

- [ ] **Step 3: Make each commodity card expandable with the 3 technical tiles**

Find the card render inside `COMMODITIES.map(com => { ... })`:

```typescript
          {COMMODITIES.map(com => {
            const usdPrice = prices[com.sym]?.price;
            const chg = prices[com.sym]?.change_pct;
            const inrPrice = getInrPrice(com);
            return (
              <div key={com.id} style={{ background:'var(--surf2)', border:`1px solid var(--bdr)`, borderRadius:10, padding:'12px 14px', borderLeft:`3px solid ${com.color}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:16 }}>{com.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>{com.name}</span>
                  </div>
                  {chg != null && (
                    <span style={{ fontSize:10, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.3, color: com.color }}>
                  {inrPrice != null ? `₹${inrPrice.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                  per {com.inrUnit}
                  {usdPrice ? ` · $${usdPrice.toFixed(2)}/${com.unit}` : ''}
                </div>
              </div>
            );
          })}
```

Replace with:

```typescript
          {COMMODITIES.map(com => {
            const usdPrice = prices[com.sym]?.price;
            const chg = prices[com.sym]?.change_pct;
            const inrPrice = getInrPrice(com);
            const tech = technicals[com.sym];
            const isOpen = expandedCom === com.id;
            return (
              <div key={com.id} onClick={() => setExpandedCom(isOpen ? null : com.id)}
                style={{ background:'var(--surf2)', border:`1px solid var(--bdr)`, borderRadius:10, padding:'12px 14px', borderLeft:`3px solid ${com.color}`, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:16 }}>{com.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>{com.name}</span>
                  </div>
                  {chg != null && (
                    <span style={{ fontSize:10, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize:17, fontWeight:900, letterSpacing:-0.3, color: com.color }}>
                  {inrPrice != null ? `₹${inrPrice.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                  per {com.inrUnit}
                  {usdPrice ? ` · $${usdPrice.toFixed(2)}/${com.unit}` : ''}
                </div>
                {isOpen && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--card-bdr)', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>RSI(14)</div>
                      <div style={{ fontSize:13, fontWeight:800 }}>{tech?.rsi14 != null ? tech.rsi14.toFixed(1) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>vs 50D EMA</div>
                      <div style={{ fontSize:13, fontWeight:800, color: tech?.ema_gap_pct != null ? (tech.ema_gap_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
                        {tech?.ema_gap_pct != null ? `${tech.ema_gap_pct >= 0 ? '+' : ''}${tech.ema_gap_pct.toFixed(2)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>Bias</div>
                      <div style={{ fontSize:12, fontWeight:800 }}>
                        {tech?.bias === 'bullish' ? '🟢 Bullish' : tech?.bias === 'bearish' ? '🔴 Bearish' : '⚪ —'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

With `npm run dev` running (from Task 1):
- `curl -s "http://localhost:3000/api/technical?symbols=GC=F,SI=F,CL=F,NG=F,HG=F,ALI=F"` — confirm
  all 6 commodity futures return non-null `rsi14`/`ema_gap_pct`/`bias` (or `null` only if Yahoo
  genuinely has thin data for that symbol — check which before assuming a bug).
- If you have a way to drive a browser: open `http://localhost:3000/dashboard/commodities`,
  confirm the 6 price cards render unchanged when collapsed, click a card to confirm it expands
  with real RSI/EMA/Bias tiles, click again to collapse, click inside the expanded tiles to
  confirm it does NOT collapse (stopPropagation working), click Refresh to confirm both prices
  and technicals reload.
- If the page is auth-gated and you have no test credentials/browser tool (as was the case for
  the forex page in the prior plan), state that explicitly in your report and rely on the
  strongest available substitute: `tsc --noEmit`, a full `next build` compiling the route, and
  the curl checks above. Do not claim visual verification you didn't actually do.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/commodities/page.tsx
git commit -m "feat: expandable RSI/EMA/Bias rows on commodities page

Same pattern as the forex page — click a commodity card to reveal
its technical read, sourced from /api/technical. Collapsed view
unchanged."
```

---

## Self-Review Notes

**Spec coverage:**
- Data-source decision (proxy price, no new MCX feed) — no code task needed, it's a
  non-decision (Task 2 just points at the existing `COMMODITIES[].sym` values, which are already
  the proxy futures symbols).
- Endpoint generalization (spec §1) → Task 1.
- Commodities page wiring, all 6 commodities, fixed order, Bias language, `stopPropagation`
  fix baked in from the start (learned from forex's Task 3 review) → Task 2.
- Error handling (all-null entries, graceful `—` degrade) → inherited from the unchanged
  endpoint logic (Task 1) and the same `tech?.field != null` guard pattern in Task 2.
- Regression risk on forex (spec's Testing section flags this explicitly) → Task 1 Step 5
  curls both the new endpoint AND confirms the old route 404s, plus updates forex's own call
  site in the same task so it's never left pointing at a dead route.
- Out-of-scope items (Pillar B seasonal content, real MCX data, charts) — correctly absent
  from both tasks.

**Type consistency check:** `TechResult` (Task 1, `api/technical/route.ts`) and `TechMap`
(Task 2, commodities page) both use `{ rsi14: number | null; ema_gap_pct: number | null; bias:
'bullish' | 'bearish' | null }` — matches exactly, and matches the forex page's existing
`TechMap` definition too (three independent call sites, one shared shape).

**Placeholder scan:** none found — all steps contain complete code, no "TODO"/"similar to
forex" without the actual code shown.

**Naming note:** used `expandedCom` (not `expandedPair`) in Task 2 since the value held is a
commodity `id` (e.g. `'gold'`), not a currency pair code — avoids a copy-paste-y name that
would misdescribe what the state holds.
