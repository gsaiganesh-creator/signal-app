# Forex Trade View (Pillar A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expandable technical-analysis rows (RSI/EMA-gap/Bias) to the forex page's Live Rates grid, reusing the RSI/EMA/Supertrend math already built for stock pages.

**Architecture:** Extract the pure indicator functions out of `stock-detail/route.ts` into a shared `lib/technicals.ts`. Add a new edge endpoint `/api/forex-technical` that runs those functions against Yahoo chart data for the 9 FX pairs. Wire the existing forex page's rate cards to fetch that data once and expand-on-click to show it.

**Tech Stack:** Next.js 15 App Router edge routes, TypeScript, no test framework in this repo (verification is manual: `tsc --noEmit` + curl + browser check, matching existing project convention).

**Spec:** `docs/superpowers/specs/2026-07-05-forex-trade-view-design.md`

---

## Task 1: Extract technical indicator functions into a shared lib

**Files:**
- Create: `apps/web/lib/technicals.ts`
- Modify: `apps/web/app/api/stock-detail/route.ts:1-91`

- [ ] **Step 1: Create `apps/web/lib/technicals.ts` with the extracted functions**

Move `ema`, `rsi`, `bollinger`, `atr`, `supertrend` out of `stock-detail/route.ts` verbatim (no logic changes) and export them:

```typescript
// apps/web/lib/technicals.ts
// Shared technical-indicator math — pure functions over price arrays.
// Used by /api/stock-detail (stocks) and /api/forex-technical (currency pairs).

export function ema(prices: number[], period: number): number {
  if (!prices.length) return 0;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, prices.length);
  for (let i = Math.min(period, prices.length); i < prices.length; i++) val = prices[i] * k + val * (1 - k);
  return val;
}

export function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]; else avgLoss -= changes[i];
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0, changes[i])) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -changes[i])) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

export function bollinger(prices: number[], period = 20) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: mid + 2 * sd, lower: mid - 2 * sd, mid };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (highs.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Supertrend (period=10, multiplier=3) — Wilder smoothed ATR
export function supertrend(
  highs: number[], lows: number[], closes: number[],
  period = 10, mult = 3,
): { value: number; direction: 1 | -1 } | null {
  if (highs.length < period + 2) return null;
  // Compute true ranges
  const trs: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
  }
  // Wilder smoothed ATR
  const atrArr: number[] = new Array(closes.length).fill(0);
  let seed = 0;
  for (let i = 1; i <= period; i++) seed += trs[i];
  atrArr[period] = seed / period;
  for (let i = period + 1; i < closes.length; i++) {
    atrArr[i] = (atrArr[i-1] * (period - 1) + trs[i]) / period;
  }
  // Supertrend bands
  const upper: number[] = new Array(closes.length).fill(0);
  const lower: number[] = new Array(closes.length).fill(0);
  const dir:   number[] = new Array(closes.length).fill(1);
  for (let i = period; i < closes.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    let rawUp = hl2 + mult * atrArr[i];
    let rawLo = hl2 - mult * atrArr[i];
    // Band tightening
    upper[i] = (i > period && rawUp < upper[i-1]) || closes[i-1] > upper[i-1] ? rawUp : upper[i-1];
    lower[i] = (i > period && rawLo > lower[i-1]) || closes[i-1] < lower[i-1] ? rawLo : lower[i-1];
    // Direction
    if (i === period) { dir[i] = 1; continue; }
    if (closes[i] > upper[i-1])       dir[i] = 1;
    else if (closes[i] < lower[i-1])  dir[i] = -1;
    else                               dir[i] = dir[i-1];
  }
  const last = closes.length - 1;
  const d = dir[last] as 1 | -1;
  return { value: +(d === 1 ? lower[last] : upper[last]).toFixed(2), direction: d };
}
```

- [ ] **Step 2: Update `stock-detail/route.ts` to import from the shared lib instead of defining locally**

Replace lines 1-91 (the header comment through the end of the `supertrend` function) with:

```typescript
// Comprehensive stock detail: price, technicals (RSI, EMA, MACD, BB, ATR),
// 52W range, signals — plus US fundamentals from Yahoo quoteSummary.

import { ema, rsi, bollinger, atr, supertrend } from '@/lib/technicals';

export const runtime = 'edge';
```

Everything from the original `// ─── Types ──...` comment (previously line 93) onward stays unchanged.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/gsaiganesh/signal-app/apps/web" && npx tsc --noEmit`
Expected: no new errors (this is a pure refactor — function bodies are unchanged, only their location moved).

- [ ] **Step 4: Manual regression check against a live symbol**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npm run dev &
sleep 3
curl -s "http://localhost:3000/api/stock-detail?symbol=RELIANCE&exchange=NSE" | head -c 500
```

Expected: JSON response with `rsi14`, `ema20`, `ema50`, `supertrend_value`, `supertrend_dir` populated with numbers (not all null) — confirms the extracted functions still produce output identical in shape to before the refactor. Leave the dev server running for Task 2.

- [ ] **Step 5: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/lib/technicals.ts apps/web/app/api/stock-detail/route.ts
git commit -m "refactor: extract technical indicator math into shared lib.ts

Pure move, no logic change — RSI/EMA/Bollinger/ATR/Supertrend are now
importable by the new forex-technical endpoint instead of being
duplicated."
```

---

## Task 2: New `/api/forex-technical` endpoint

**Files:**
- Create: `apps/web/app/api/forex-technical/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// apps/web/app/api/forex-technical/route.ts
// RSI/EMA/Supertrend for FX pairs, reusing the same math as /api/stock-detail.
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

    if (closes.length < 51 || highs.length < 12) return EMPTY;

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

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/gsaiganesh/signal-app/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verify against the running dev server** (from Task 1 Step 4; restart with `npm run dev &` if it's no longer running)

```bash
curl -s "http://localhost:3000/api/forex-technical?symbols=USDINR=X,EURINR=X" | python3 -m json.tool
```

Expected: JSON like

```json
{
  "USDINR=X": { "rsi14": 58.2, "ema_gap_pct": 0.81, "bias": "bullish" },
  "EURINR=X": { "rsi14": 47.6, "ema_gap_pct": -0.32, "bias": "bearish" }
}
```

(exact numbers will differ — check shape and that values are non-null, not the specific numbers). Also verify the error path:

```bash
curl -s "http://localhost:3000/api/forex-technical" 
```

Expected: `{"error":"symbols required"}` with 400 status.

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/api/forex-technical/route.ts
git commit -m "feat: add /api/forex-technical endpoint

RSI(14), vs-50D-EMA%, and Supertrend-derived bias for FX pairs,
reusing the indicator math extracted in the previous commit."
```

---

## Task 3: Expandable technical rows on the forex page

**Files:**
- Modify: `apps/web/app/dashboard/forex/page.tsx`

- [ ] **Step 1: Add the technicals type, state, and fetch function**

In `apps/web/app/dashboard/forex/page.tsx`, after the existing `type PriceMap = ...` line (line 34), add:

```typescript
type TechMap = Record<string, { rsi14: number | null; ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null }>;
```

Inside the `ForexPage` component, after the existing `const [ratesLoading, setRL] = useState(true);` line (line 41), add:

```typescript
  const [technicals, setTechnicals] = useState<TechMap>({});
  const [expandedPair, setExpandedPair] = useState<string | null>(null);
```

After the existing `fetchRates` callback (ends at line 54, before the `useEffect` on line 56), add:

```typescript
  const fetchTechnicals = useCallback(async () => {
    try {
      const syms = LIVE_PAIRS.map(p => p.sym).join(',');
      const res = await fetch(`/api/forex-technical?symbols=${encodeURIComponent(syms)}`);
      if (res.ok) setTechnicals(await res.json());
    } catch { /* offline */ }
  }, []);
```

Replace the existing `useEffect(() => { fetchRates(); }, [fetchRates]);` (line 56) with:

```typescript
  useEffect(() => { fetchRates(); fetchTechnicals(); }, [fetchRates, fetchTechnicals]);
```

- [ ] **Step 2: Wire the Refresh button to also refresh technicals**

Find the Refresh button (around line 119-122):

```typescript
          <button onClick={fetchRates} disabled={ratesLoading}
            style={{ height:36, padding:'0 14px', borderRadius:9, background:'var(--surf2)', border:'1px solid var(--card-bdr)', color:'var(--txt)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: ratesLoading ? 0.6 : 1 }}>
            {ratesLoading ? '⏳' : '🔄'} Refresh
          </button>
```

Change `onClick={fetchRates}` to:

```typescript
          <button onClick={() => { fetchRates(); fetchTechnicals(); }} disabled={ratesLoading}
```

- [ ] **Step 3: Make each pair card expandable with the 3 technical tiles**

Find the pair card render inside `LIVE_PAIRS.map(pair => { ... })` (lines 156-181):

```typescript
          {LIVE_PAIRS.map(pair => {
            const rate = getRate(pair.sym);
            const chg  = getChg(pair.sym);
            const scale = pair.scale ?? 1;
            const displayRate = rate != null ? rate / scale : null;
            return (
              <div key={pair.code} style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{pair.flag}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800 }}>{pair.code}</div>
                    <div style={{ fontSize:10, color:'var(--dim)' }}>{pair.name}</div>
                  </div>
                  {chg != null && (
                    <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </div>
                  )}
                </div>
                <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.3 }}>
                  {displayRate != null ? `₹${displayRate.toFixed(pair.code === 'JPY' ? 4 : 2)}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>per 1 {pair.code}{scale > 1 ? ` (÷${scale})` : ''}</div>
              </div>
            );
          })}
```

Replace with:

```typescript
          {LIVE_PAIRS.map(pair => {
            const rate = getRate(pair.sym);
            const chg  = getChg(pair.sym);
            const scale = pair.scale ?? 1;
            const displayRate = rate != null ? rate / scale : null;
            const tech = technicals[pair.sym];
            const isOpen = expandedPair === pair.code;
            return (
              <div key={pair.code} onClick={() => setExpandedPair(isOpen ? null : pair.code)}
                style={{ background:'var(--surf2)', border:'1px solid var(--card-bdr)', borderRadius:10, padding:'12px 14px', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{pair.flag}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800 }}>{pair.code}</div>
                    <div style={{ fontSize:10, color:'var(--dim)' }}>{pair.name}</div>
                  </div>
                  {chg != null && (
                    <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color: chg >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                      {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                    </div>
                  )}
                </div>
                <div style={{ fontSize:18, fontWeight:900, letterSpacing:-0.3 }}>
                  {displayRate != null ? `₹${displayRate.toFixed(pair.code === 'JPY' ? 4 : 2)}` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>per 1 {pair.code}{scale > 1 ? ` (÷${scale})` : ''}</div>
                {isOpen && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--card-bdr)', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>RSI(14)</div>
                      <div style={{ fontSize:13, fontWeight:800 }}>{tech?.rsi14 != null ? tech.rsi14.toFixed(1) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--dim)', textTransform:'uppercase' }}>vs 50D EMA</div>
                      <div style={{ fontSize:13, fontWeight:800, color: tech?.ema_gap_pct != null ? (tech.ema_gap_pct >= 0 ? 'var(--grn)' : 'var(--red)') : 'var(--txt)' }}>
                        {tech?.ema_gap_pct != null ? `${tech.ema_gap_pct >= 0 ? '+' : ''}${tech.ema_gap_pct}%` : '—'}
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

Run: `cd "/Users/gsaiganesh/signal-app/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual browser verification (required for this UI change per project convention — do not skip)**

With `npm run dev` running (from Task 1/2), open `http://localhost:3000/dashboard/forex` in a browser:
- Confirm the 9 rate cards render as before (no visual regression when collapsed).
- Click a card (e.g. USD) → confirm it expands showing RSI(14) / vs 50D EMA / Bias tiles with real numbers, not stuck on `—` (unless the API genuinely returned null, in which case confirm no crash).
- Click it again → confirm it collapses.
- Click Refresh → confirm both rates and technicals reload (no console errors in devtools).
- Resize to mobile width (~400px) → confirm the 3-tile grid still fits without overflow (card uses `g3` grid class elsewhere in the page, but this inner 3-column grid is fixed `1fr 1fr 1fr` — confirm it doesn't overflow at 400px; if it does, drop to `gridTemplateColumns:'1fr'` and stack, but only if actually observed broken).

- [ ] **Step 6: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/dashboard/forex/page.tsx
git commit -m "feat: expandable RSI/EMA/Bias rows on forex page

Click a currency card to reveal technical read on that pair, sourced
from /api/forex-technical. Collapsed view unchanged."
```

---

## Self-Review Notes

**Spec coverage:**
- Shared lib extraction (spec §1) → Task 1.
- New endpoint + response shape + cache header (spec §2) → Task 2.
- Expandable rows, fetched-once-alongside-rates, fixed order, Bias language (spec §3-4) → Task 3.
- Error handling (all-null entries, graceful `—` degrade) → built into Task 2 Step 1 (`EMPTY` fallback) and Task 3 Step 3 (`tech?.field != null` checks).
- Testing section (manual spot-check vs reference, graceful-degrade check) → Task 2 Step 3 and Task 3 Step 5.
- Out-of-scope items (Pillar B, sort/reorder, charts) — correctly not present in any task.

**Type consistency check:** `TechResult` (Task 2, forex-technical/route.ts) and `TechMap` (Task 3, forex page) both use `{ rsi14: number | null; ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null }` — matches exactly.

**Placeholder scan:** none found — all steps contain complete code, no "TODO"/"similar to above".
