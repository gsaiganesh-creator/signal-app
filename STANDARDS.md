# Signal App — Design & Coding Standards

> **READ THIS BEFORE MAKING ANY CHANGE.**
> Every new page, component, or API route must follow these standards exactly.

---

## 1. Fonts

| Use | Font | Weight |
|-----|------|--------|
| All body / UI text | **Inter** | 400, 500, 600, 700, 800, 900 |
| Code / numbers / monospace | **JetBrains Mono** | 400, 500, 700 |

Both loaded via Google Fonts in `globals.css`. **Never** add a third font without updating this doc.

Typical sizes:
- Page title: `28–36px`, `font-weight: 700–800`
- Section header: `18–22px`, `font-weight: 700`
- Card label / metric: `13px`, `font-weight: 600`
- Body / table: `14px`, `font-weight: 400–500`
- Caption / dim: `12px`, `color: var(--dim)`
- Monospace numbers: `font-family: 'JetBrains Mono', monospace`

---

## 2. Color System

All colors via CSS variables. **Never hardcode hex in component files** — always use `var(--name)`.

### Dark theme (default)
```
--bg       #050B16   Page background
--surf     #0B1830   Card / panel surface
--surf2    #0E2050   Nested card / hover surface
--bdr      rgba(79,111,250,0.28)   Default border

--txt      #FFFFFF   Primary text
--dim      #7A8BAA   Secondary / muted text
--dim2     #3A4E6A   Tertiary / placeholder

--blu      #1740F5   Primary blue (CTAs, active)
--bluL     #4F6FFA   Blue lighter (badges, highlights)
--grn      #00D4A0   Positive / bullish / success
--red      #FF3B5C   Negative / bearish / error
--ylw      #FFB800   Warning / watch / caution
--pur      #8B5CF6   Purple (ML class, accumulate)
--org      #FF5C1A   Orange accent
--orgL     #FF7D46   Orange lighter
```

### Light theme overrides
Defined in `globals.css` under `[data-theme="light"]`. Same variable names, adjusted values.
Never check `data-theme` in component logic — always use `var(--color)` and let CSS handle it.

### Signal / direction colors
| Meaning | Color |
|---------|-------|
| Bullish / up / positive | `var(--grn)` `#00D4A0` |
| Bearish / down / negative | `var(--red)` `#FF3B5C` |
| Neutral / hold / watch | `var(--ylw)` `#FFB800` |
| Primary action | `var(--blu)` `#1740F5` |

**VIX + USD/INR are inverted:** VIX UP = red (bad). USD/INR UP = red (rupee weakens).

---

## 3. Card Templates

### Standard glass card
Use for most dashboard cards.
```tsx
const card: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-bdr)',
  borderRadius: 16,
  padding: '18px 20px',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'var(--card-shadow)',
};
```

### Colorful gradient card
Use for KPI / metric cards that need emphasis. Pick accent color per metric type.
```tsx
const colorCard = (grad: string, bdr: string): React.CSSProperties => ({
  background: grad,
  border: `1px solid ${bdr}`,
  borderRadius: 16,
  padding: '18px 20px',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'var(--card-shadow)',
});

// Common gradient recipes:
// Blue:   'linear-gradient(135deg,rgba(23,64,245,0.18),rgba(79,111,250,0.08))', 'rgba(79,111,250,0.35)'
// Green:  'linear-gradient(135deg,rgba(0,212,160,0.18),rgba(0,212,160,0.06))',  'rgba(0,212,160,0.35)'
// Red:    'linear-gradient(135deg,rgba(255,59,92,0.18),rgba(255,59,92,0.06))',  'rgba(255,59,92,0.35)'
// Purple: 'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(139,92,246,0.06))','rgba(139,92,246,0.35)'
// Orange: 'linear-gradient(135deg,rgba(255,92,26,0.18),rgba(255,92,26,0.06))',  'rgba(255,92,26,0.35)'
// Gold:   'linear-gradient(135deg,rgba(255,184,0,0.18),rgba(255,184,0,0.06))',  'rgba(255,184,0,0.35)'
```

### Compact inline card (no blur)
For table rows, list items, or dense layouts:
```tsx
style={{ background:'var(--surf)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px' }}
```

---

## 4. Grid / Bento Layouts

All grids use `display: grid` with a CSS utility class for columns. **Never hardcode `grid-template-columns` inline** — use these classes and let the responsive breakpoints handle the rest.

```css
.g6   /* 6 col → 3 col (≤900) → 2 col (≤480) */
.g4   /* 4 col → 2 col (≤900) → 2 col (≤480) */
.g3   /* 3 col → 2 col (≤900) → 1 col (≤480) */
.g2   /* 2 col → 2 col (≤900) → 1 col (≤480) */
.g-side        /* 1fr + 340px sidebar → 1fr (≤900) */
.g-analytics   /* 1fr + 210–270px → 1fr (≤900) */
.g-brief       /* 1fr 1fr → 1fr (≤900) */
```

Usage pattern:
```tsx
<div style={{ display:'grid', gap:16 }} className="g4">
  <CardA />
  <CardB />
  <CardC />
  <CardD />
</div>
```

### Bento grid (landing page)
```tsx
<div className="lp-bento" style={{ gap:14 }}>
  <div className="span2"> {/* spans 2 columns */} </div>
  <div className="tall">  {/* spans 2 rows */}   </div>
  <div> {/* normal 1×1 cell */} </div>
</div>
```
Breakpoints: 3-col → 2-col (≤900) → 1-col (≤600).

---

## 5. Spacing System

No strict spacing scale enforced — but use these conventions:

| Context | Value |
|---------|-------|
| Page padding (desktop) | `clamp(16px, 3vw, 32px)` |
| Section gap | `24–32px` |
| Card padding | `18px 20px` (standard), `12px 14px` (compact) |
| Grid gap (cards) | `14–16px` |
| Grid gap (tight) | `10–12px` |
| Border radius (card) | `16px` |
| Border radius (button/badge) | `8–10px` |
| Border radius (pill) | `999px` |

---

## 6. Responsive Breakpoints

```
≤ 900px  — Tablet: sidebar hidden, bottom nav shown, 2-col grids
≤ 600px  — Phone: table columns hidden (.mob-hide), compact cards
≤ 480px  — Small phone: single-col grids, tighter nav
≤ 360px  — Tiny: hide portfolio switcher
```

Main content must always have `padding-bottom: calc(80px + env(safe-area-inset-bottom))` on mobile (bottom nav clearance). This is enforced globally in `globals.css` — don't override `main` padding-bottom on mobile.

---

## 7. Animation Classes

Add these CSS classes (defined in `globals.css`) to elements — don't reimplement:

```css
.hover-lift       /* translateY(-3px) + shadow on hover — use on clickable cards */
.shimmer          /* skeleton loading placeholder */
.glow-blue        /* pulsing blue box-shadow — use on primary CTA buttons */
.live-dot         /* green blinking dot — market open indicator */
.anim-gradient    /* animated gradient background — hero sections only */
```

Page entrance animation is automatic on `main > *` children (slide-in-up staggered). No extra code needed.

---

## 8. ML Class Badge System

`MlClass = 'Momentum' | 'Swing' | 'Accumulate' | 'Hold' | 'Exit' | 'Dead' | 'Watch'`

Canonical badge colors — use `BUCKET_META` from `dashboard/portfolio/page.tsx` or replicate this exact mapping:

| Class | Label | Color | Background | Border |
|-------|-------|-------|------------|--------|
| Momentum | 🚀 Momentum | `var(--grn)` | `rgba(0,212,160,0.10)` | `rgba(0,212,160,0.25)` |
| Swing | 🔄 Swing | `var(--bluL)` | `rgba(23,64,245,0.10)` | `rgba(23,64,245,0.25)` |
| Accumulate | 📦 Accumulate | `var(--pur)` | `rgba(139,92,246,0.10)` | `rgba(139,92,246,0.25)` |
| Hold | 🏛️ Hold | `var(--txt)` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.1)` |
| Exit | ⚠️ Exit | `var(--red)` | `rgba(255,59,92,0.10)` | `rgba(255,59,92,0.25)` |
| Dead | 💀 Dead | `var(--dim)` | `rgba(100,100,100,0.08)` | `rgba(100,100,100,0.2)` |
| Watch | ⏳ Watch | `var(--ylw)` | `rgba(255,184,0,0.08)` | `rgba(255,184,0,0.2)` |

---

## 9. Signal Strength Labels

API signals from `/api/ml/signals` and `/api/stock-detail`:

| Signal | Display | Color |
|--------|---------|-------|
| STRONG_BUY | Strong Buy | `var(--grn)` |
| BUY | Buy | `#4ade80` (lighter green) |
| HOLD | Hold | `var(--ylw)` |
| SELL | Sell | `#f97316` (orange) |
| STRONG_SELL | Strong Sell | `var(--red)` |

---

## 10. Coding Standards

### TypeScript
- Strict mode always on (`tsconfig.json: strict: true`).
- Explicit types on function parameters and return values.
- Use `type` for object shapes, `interface` only when extending.
- `Num = number | null` alias for nullable numerics (avoid `number | undefined | null`).
- No `any` — use `unknown` if type is truly unknown.

### Import aliases
```ts
@/components/Foo     // apps/web/components/
@/lib/bar            // apps/web/lib/
// Never use relative ../../../ paths in app/ or components/
```

### Client vs Server components
- Default: **Server Component** (no `'use client'`).
- Add `'use client'` only when: `useState`, `useEffect`, `useRef`, browser APIs, event handlers.
- Charts / heavy client libs: wrap in `dynamic(() => import(...), { ssr: false })`.
- Never import server-only code (e.g. `createServerClient`) from a client component.

### API routes
Standard pattern for all edge routes:
```ts
export const runtime = 'edge';  // default for data routes
// OR
export const runtime = 'nodejs'; // only when needed (Razorpay, web-push, Supabase server client)

export async function GET(req: Request) {
  try {
    // ... fetch data
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
```

Cache-Control guidelines:
| Data type | max-age | s-w-r |
|-----------|---------|-------|
| Live prices | 120s | 60s |
| Stock detail / technicals | 120s | 60s |
| Financials / fundamentals | 3600s | 1800s |
| Static lists (sectors, IPO) | 86400s | 3600s |
| ML signals batch | 300s | 900s |

### Supabase rules (CRITICAL)
- **Frontend**: always `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never service_role in browser.
- **Server routes**: use `createServerClient` from `@/lib/supabase/server`.
- All queries scoped to authenticated user via RLS. Never bypass RLS.
- Supabase REST API pattern (client-side):
```ts
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const res = await fetch(`${SUPA_URL}/rest/v1/holdings?portfolio_id=eq.${id}`, {
  headers: {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

---

## 11. Page Structure Template

Every dashboard page follows this shell:

```tsx
'use client';
import { usePlan } from '@/lib/use-plan';
// imports...

export default function FooPage() {
  const { plan, canAccess } = usePlan();
  // state, effects...

  return (
    <main style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Page Title</h1>
        <p style={{ color: 'var(--dim)', fontSize: 14, marginTop: 4 }}>Subtitle</p>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gap:14, marginBottom:24 }} className="g4">
        <KpiCard />
      </div>

      {/* Main content */}
      <div style={{ display:'grid', gap:16 }} className="g-side">
        <MainPanel />
        <SidePanel />
      </div>

      {/* Disclaimer */}
      <p style={{ color:'var(--dim)', fontSize:11, marginTop:32, textAlign:'center' }}>
        Not SEBI registered · Algorithmic scan output — not investment advice · DYOR
      </p>
    </main>
  );
}
```

---

## 12. KPI Card Template

```tsx
function KpiCard({ label, value, sub, color = 'var(--txt)' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background:'var(--card-bg)', border:'1px solid var(--card-bdr)',
      borderRadius:16, padding:'18px 20px',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      boxShadow:'var(--card-shadow)',
    }}>
      <div style={{ fontSize:12, color:'var(--dim)', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize:28, fontWeight:800, color, fontFamily:"'JetBrains Mono', monospace" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}
```

---

## 13. Data Table Template

```tsx
<div style={{ overflowX:'auto' }}>
  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
    <thead>
      <tr style={{ borderBottom:'1px solid var(--bdr)' }}>
        <th style={{ textAlign:'left', padding:'10px 12px', color:'var(--dim)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Symbol
        </th>
        {/* more headers */}
        <th className="mob-hide">Hidden on mobile</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr
          key={r.id}
          style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}
          onClick={() => setSelected(r)}
        >
          <td style={{ padding:'12px', fontWeight:700 }}>{r.symbol}</td>
          <td className="mob-hide">{r.extra}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 14. Button Templates

### Primary CTA
```tsx
<button style={{
  background:'var(--blu)', color:'#fff', border:'none',
  borderRadius:10, padding:'10px 20px', fontSize:14, fontWeight:600,
  cursor:'pointer',
}} className="hover-lift">
  Action
</button>
```

### Ghost / secondary
```tsx
<button style={{
  background:'transparent', color:'var(--txt)',
  border:'1px solid var(--bdr)',
  borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600,
  cursor:'pointer',
}}>
  Secondary
</button>
```

### Filter pill (active / inactive toggle)
```tsx
<button style={{
  background: active ? 'rgba(79,111,250,0.18)' : 'rgba(255,255,255,0.04)',
  color: active ? 'var(--bluL)' : 'var(--dim)',
  border: `1px solid ${active ? 'rgba(79,111,250,0.4)' : 'var(--bdr)'}`,
  borderRadius: 999,
  padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}}>
  Filter
</button>
```

---

## 15. Badge Template

```tsx
function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 10px',
      background: bg, color, border:`1px solid ${border}`,
      borderRadius:999, fontSize:11, fontWeight:700,
    }}>
      {label}
    </span>
  );
}
```

---

## 16. Loading / Skeleton State

```tsx
// Skeleton line
<div className="shimmer" style={{ height:18, width:'60%', marginBottom:8 }} />

// Spinner
<div style={{ width:20, height:20, border:'2px solid var(--bdr)', borderTopColor:'var(--bluL)', borderRadius:'50%' }} className="spin" />
// add to globals.css: .spin { animation: spin 0.8s linear infinite; }
```

---

## 17. Plan Gating

Use `ProGate` to wrap any feature that requires a plan tier:

```tsx
import { ProGate } from '@/components/ProGate';

export default function AlgoBuilderPage() {
  return (
    <ProGate feature="algo-builder">
      {/* page content */}
    </ProGate>
  );
}
```

Features and minimum plans:

| Feature key | Minimum plan |
|-------------|-------------|
| `signals-unlimited` | starter |
| `signals-detail` | starter |
| `signals-portfolio` | starter |
| `signals-us` | pro |
| `us-portfolio-multi` | pro |
| `algo-builder` | pro |
| `backtest` | pro |
| `equity-comp` | pro |
| `paper-trading-full` | starter |
| `track-record` | starter |

Founders (`gsaiganesh@gmail.com`, `gsai0905@gmail.com`, `bskumar.obiee@gmail.com`) always get `admin` plan — never gate anything for them.

---

## 18. StockDetailSheet Usage

The unified stock detail modal. Always use this — never build a custom one.

```tsx
import { StockDetailSheet } from '@/components/StockDetailSheet';

// Minimal (no holding context):
<StockDetailSheet symbol="RELIANCE" exchange="NSE" onClose={() => setOpen(false)} />

// With holding context (portfolio page):
<StockDetailSheet
  symbol={h.symbol}
  exchange={h.exchange}
  onClose={() => setSelected(null)}
  holding={{
    qty: h.qty,
    avgPrice: h.avg_price,
    currency: 'INR',
    portfolioName: activePortfolio?.name,
    mlBadge: h.ml_class,
    mlSignal: h.signal,
    isEtf: h.is_etf,
    onDelete: () => handleDelete(h.id),
  }}
/>
```

---

## 19. Legal / Compliance Rules

Every page that shows prices, signals, or stock data **must** have a disclaimer. No exceptions.

### India (NSE/BSE) stocks
```
Not SEBI registered · Algorithmic scan output — not investment advice · DYOR
```

### US stocks
```
Not SEC registered · Prices delayed 15–20 min · Algorithmic scan output — not investment advice · DYOR
```

### Paper trading
```
Virtual only — no real orders placed
```

Place at bottom of page, `fontSize:11, color:'var(--dim)', textAlign:'center', marginTop:32`.

**Signal naming**: Call outputs "Scan Result", "Momentum Score", or "Technical Indicator" — **not** "Buy recommendation" or "Signal" in user-facing text until SEBI RA registration is complete.

---

## 20. Adding a New Dashboard Page

Checklist when adding any new page under `/dashboard/`:

- [ ] Add to `DashboardSidebar.tsx` under the correct tab (Home / Tools / Markets / Account)
- [ ] Add to `MobileBottomNav.tsx` More drawer under the correct section
- [ ] Wrap with `ProGate` if feature-gated
- [ ] Add SEBI/SEC disclaimer at bottom
- [ ] Add to `sitemap.ts` if SEO-indexable (public pages only)
- [ ] Follow card template, grid classes, and color system above
- [ ] Test at 480px mobile width (check More drawer accessibility)
- [ ] `padding-bottom: calc(80px + env(safe-area-inset-bottom))` on `main` (comes from `globals.css` automatically)

---

## 21. Adding a New API Route

Checklist:

- [ ] Place under `app/api/<feature>/route.ts`
- [ ] Set `export const runtime = 'edge'` (default) or `'nodejs'` if using Node-only libs
- [ ] Set appropriate `Cache-Control` header (see section 10)
- [ ] Never use `SUPABASE_SERVICE_ROLE_KEY` in edge routes
- [ ] Return `Content-Type: application/json` always
- [ ] Wrap in try/catch, return `{ error: string }` with status 500 on failure
- [ ] Add to `vercel.json` crons if it needs scheduled execution

---

## 22. Vercel Cron Jobs

Crons defined in `apps/web/vercel.json`. Current jobs:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/scan-log/backfill` | `0 12 * * *` | Fill 30d/60d return data |
| `/api/paper-trading/auto-scan` | `0 4 * * 1-5` | Weekday auto-scan |
| `/api/push/check-alerts` | `*/15 4-10 * * 1-5` | Push price alerts |

All crons secured with `CRON_SECRET` env var. Check header `x-vercel-cron-secret` in route.

---

## 23. Env Vars Reference

| Variable | Used in | Never in |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | anywhere | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anywhere | — |
| `SUPABASE_SERVICE_ROLE_KEY` | server routes only | browser / edge |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client SW | — |
| `VAPID_PRIVATE_KEY` | server only | browser |
| `RAZORPAY_KEY_ID` | server only | browser |
| `RAZORPAY_KEY_SECRET` | server only | browser |
| `CRON_SECRET` | server only | browser |
| `PLAID_CLIENT_ID` | server only | browser |
| `PLAID_SECRET` | server only | browser |

---

## 24. Yahoo Finance API Notes

- Prices: `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
- Historicals (3mo for technicals): same with `range=3mo`
- Fundamentals: `quoteSummary` with modules param
- NSE suffix: `.NS` | BSE: `.BO` | US: no suffix
- Forex: `USDINR=X`, `JPYINR=X`, etc.
- Commodities: `GC=F` (Gold), `SI=F` (Silver), `CL=F` (Crude), `NG=F` (Nat Gas)
- **JPY**: Yahoo returns per-1-JPY rate (~0.55). Display as per-100-JPY × 100.
- **MCX proxy**: always label "NOT MCX official — proxy only"

---

*Last updated: 2026-07-03*
*Maintained by: Sai Ganesh + Sai Kumar Bethala*
