# AI Sentiment Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Coming Q3 2026" X API placeholder on `/dashboard/feed` with a real AI-generated sentiment scan (Grok, no live search) for stocks the user holds or watches, plus a decoupled accuracy-tracking layer so we can periodically check whether the sentiment calls are actually useful.

**Architecture:** A daily Vercel Cron hits a nodejs API route that reads distinct symbols from `holdings`+`watchlist` (service role, all users), calls Grok (`grok-4.3`, plain chat call, no live search) per symbol capped at 200/day, upserts `{symbol, exchange, label, blurb}` into `sentiment_scores` (current-state, one row per symbol), and appends a row to `sentiment_scan_log` (history, one row per symbol per day) for later accuracy backfill. A second, fully independent cron backfills 7d/30d outcome prices into `sentiment_scan_log`. A small aggregate route exposes accuracy %, surfaced as an optional chip on the feed page. The feed page itself (converted to a client component) reads the logged-in user's own holdings+watchlist symbols and displays matching sentiment rows from `sentiment_scores`.

**Tech Stack:** Next.js 15 App Router API routes (nodejs runtime for crons needing service role; edge for the read-only stats route), Supabase REST (service role for cron writes, anon key for reads), xAI Grok REST API via plain `fetch` (no new npm dependency), direct Yahoo Finance chart API for price backfill (same approach as `apps/web/app/api/scan-log/backfill/route.ts`).

**Reference spec:** `docs/superpowers/specs/2026-07-04-ai-sentiment-feed-design.md` (including the "Addendum" section on accuracy tracking)

**Note on testing:** This repo has no test framework configured (`apps/web/package.json` has no `test` script, no jest/vitest config, no `.test.`/`.spec.` files anywhere). Every other API route is verified manually via `curl`/dev server rather than automated tests. This plan follows that convention — each code step is followed by a manual verification step with an exact command and expected output, in place of unit tests.

**Status:** Tasks 1-2 (Supabase table + env vars) done by user. Task 3 (sentiment-scan cron, base version) in progress.

---

### Task 1: Create `sentiment_scores` Supabase table — DONE

```sql
CREATE TABLE IF NOT EXISTS public.sentiment_scores (
  symbol      text primary key,
  exchange    text not null default 'NSE',
  label       text not null,
  blurb       text not null,
  scanned_at  timestamptz not null default now()
);
ALTER TABLE public.sentiment_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_sentiment" ON public.sentiment_scores FOR SELECT USING (true);
```

### Task 2: Add required env vars — DONE

`XAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` added to `apps/web/.env.local`.

---

### Task 3: Build the sentiment-scan cron route (base version)

**Files:**
- Create: `apps/web/app/api/cron/sentiment-scan/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// Vercel Cron: daily before market open, scans distinct symbols from holdings+watchlist
// and stores an AI sentiment take per symbol (Grok, no live search — not real-time tweets).
// Requires env: SUPABASE_SERVICE_ROLE_KEY, XAI_API_KEY, CRON_SECRET
// Add to vercel.json crons: { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" }
// (2:00 UTC = 7:30 AM IST, Mon–Fri, before market open)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const XAI_KEY     = process.env.XAI_API_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const MAX_SYMBOLS = 200;

interface Row { symbol: string; exchange: string; }
interface SentimentResult { label: 'bullish' | 'bearish' | 'neutral'; blurb: string; }

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function grokSentiment(symbol: string, exchange: string): Promise<SentimentResult | null> {
  const prompt = `You're a stock market sentiment analyst. In one short sentence (max 120 chars), ` +
    `give current retail/market sentiment for ${symbol} (${exchange} listed stock). ` +
    `Reply as JSON: {"label":"bullish"|"bearish"|"neutral","blurb":"..."}`;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-4.3',
        max_tokens: 80,
        messages: [
          { role: 'system', content: 'You are a stock sentiment engine. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const clean = raw.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean) as { label?: string; blurb?: string };
    if (parsed.label !== 'bullish' && parsed.label !== 'bearish' && parsed.label !== 'neutral') return null;
    return { label: parsed.label, blurb: String(parsed.blurb ?? '').slice(0, 160) };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (!SERVICE_KEY) return Response.json({ error: 'SERVICE_KEY missing' }, { status: 500 });
  if (!XAI_KEY) return Response.json({ error: 'XAI_KEY missing' }, { status: 500 });

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  const [holdingsRes, watchlistRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/holdings?select=symbol,exchange`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/watchlist?select=symbol,exchange`, { headers }),
  ]);
  const holdings: Row[]  = holdingsRes.ok  ? await holdingsRes.json()  : [];
  const watchlist: Row[] = watchlistRes.ok ? await watchlistRes.json() : [];

  // Dedupe by symbol (table PK is symbol alone); count occurrences to prioritize
  // most-held/watched symbols first when over the daily cap.
  const counts = new Map<string, { symbol: string; exchange: string; count: number }>();
  for (const r of [...holdings, ...watchlist]) {
    const existing = counts.get(r.symbol);
    if (existing) existing.count++;
    else counts.set(r.symbol, { symbol: r.symbol, exchange: r.exchange, count: 1 });
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, MAX_SYMBOLS);

  let scanned = 0, failed = 0;
  for (const { symbol, exchange } of ranked) {
    const result = await grokSentiment(symbol, exchange);
    if (result) {
      const upsertRes = await fetch(`${SUPA_URL}/rest/v1/sentiment_scores`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ symbol, exchange, label: result.label, blurb: result.blurb, scanned_at: new Date().toISOString() }),
      });
      if (upsertRes.ok) scanned++; else failed++;
    } else {
      failed++;
    }
    await sleep(200);
  }

  return Response.json({ candidates: ranked.length, scanned, failed });
}
```

- [ ] **Step 2: Start the dev server**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npm run dev
```

Expected: server starts on `http://localhost:3000` with no compile errors for the new route.

- [ ] **Step 3: Verify the route rejects a missing/wrong secret**

```bash
curl -s "http://localhost:3000/api/cron/sentiment-scan"
```

Expected: `{"error":"forbidden"}`

- [ ] **Step 4: Verify the route runs end-to-end with the correct secret**

```bash
curl -s "http://localhost:3000/api/cron/sentiment-scan?secret=<CRON_SECRET value>"
```

Expected: JSON like `{"candidates":1,"scanned":1,"failed":0}`

- [ ] **Step 5: Verify the row landed in Supabase**

```bash
curl -s "<SUPA_URL>/rest/v1/sentiment_scores?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: array with at least one object shaped like `{"symbol":"RELIANCE","exchange":"NSE","label":"neutral","blurb":"...","scanned_at":"..."}`

- [ ] **Step 6: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/api/cron/sentiment-scan/route.ts
git commit -m "$(cat <<'EOF'
Add daily Grok sentiment-scan cron for holdings+watchlist symbols

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire the main scan cron into `vercel.json`

**Files:**
- Modify: `apps/web/vercel.json`

- [ ] **Step 1: Add the cron entry**

Current `crons` array:
```json
  "crons": [
    { "path": "/api/scan-log/backfill", "schedule": "0 12 * * *" },
    { "path": "/api/paper-trading/auto-scan", "schedule": "0 4 * * 1-5" },
    { "path": "/api/push/check-alerts", "schedule": "0 4 * * 1-5" }
  ]
```

Change it to:
```json
  "crons": [
    { "path": "/api/scan-log/backfill", "schedule": "0 12 * * *" },
    { "path": "/api/paper-trading/auto-scan", "schedule": "0 4 * * 1-5" },
    { "path": "/api/push/check-alerts", "schedule": "0 4 * * 1-5" },
    { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" }
  ]
```

- [ ] **Step 2: Verify the JSON is valid**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/vercel.json
git commit -m "$(cat <<'EOF'
Schedule sentiment-scan cron at 7:30 AM IST weekdays

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create `sentiment_scan_log` table (accuracy tracking)

**Files:** None (Supabase SQL editor — manual step, user performs this)

- [ ] **Step 1: Run this SQL in the Supabase SQL editor**

```sql
CREATE TABLE IF NOT EXISTS public.sentiment_scan_log (
  id          uuid primary key default gen_random_uuid(),
  scanned_at  date not null,
  symbol      text not null,
  exchange    text not null default 'NSE',
  label       text not null,
  price_at    numeric not null,
  price_7d    numeric,
  return_7d   numeric,
  price_30d   numeric,
  return_30d  numeric,
  created_at  timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.sentiment_scan_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_sentiment_log" ON public.sentiment_scan_log FOR SELECT USING (true);
CREATE POLICY "anon_insert_sentiment_log" ON public.sentiment_scan_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_sentiment_log" ON public.sentiment_scan_log FOR UPDATE USING (true);
```

- [ ] **Step 2: Verify the table is readable**

```bash
curl -s "<SUPA_URL>/rest/v1/sentiment_scan_log?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: `[]`

---

### Task 6: Add logging to the sentiment-scan cron

**Files:**
- Modify: `apps/web/app/api/cron/sentiment-scan/route.ts` (full rewrite of the file from Task 3)

**Depends on:** Task 3 committed, Task 5 (table) done.

- [ ] **Step 1: Replace the file contents**

```typescript
// Vercel Cron: daily before market open, scans distinct symbols from holdings+watchlist
// and stores an AI sentiment take per symbol (Grok, no live search — not real-time tweets).
// Also appends a row to sentiment_scan_log for later accuracy backfill — see
// /api/cron/sentiment-scan/backfill. That backfill is fully decoupled: it never
// blocks or is blocked by this cron.
// Requires env: SUPABASE_SERVICE_ROLE_KEY, XAI_API_KEY, CRON_SECRET
// Add to vercel.json crons: { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" }
// (2:00 UTC = 7:30 AM IST, Mon–Fri, before market open)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const XAI_KEY     = process.env.XAI_API_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const MAX_SYMBOLS = 200;

interface Row { symbol: string; exchange: string; }
interface SentimentResult { label: 'bullish' | 'bearish' | 'neutral'; blurb: string; }

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function grokSentiment(symbol: string, exchange: string): Promise<SentimentResult | null> {
  const prompt = `You're a stock market sentiment analyst. In one short sentence (max 120 chars), ` +
    `give current retail/market sentiment for ${symbol} (${exchange} listed stock). ` +
    `Reply as JSON: {"label":"bullish"|"bearish"|"neutral","blurb":"..."}`;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-4.3',
        max_tokens: 80,
        messages: [
          { role: 'system', content: 'You are a stock sentiment engine. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const clean = raw.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean) as { label?: string; blurb?: string };
    if (parsed.label !== 'bullish' && parsed.label !== 'bearish' && parsed.label !== 'neutral') return null;
    return { label: parsed.label, blurb: String(parsed.blurb ?? '').slice(0, 160) };
  } catch {
    return null;
  }
}

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number | null> {
  const suffix = exchange === 'BSE' ? '.BO' : exchange === 'NYSE' || exchange === 'NASDAQ' ? '' : '.NS';
  const ySym = `${symbol}${suffix}`;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    const d = await r.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
    return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (!SERVICE_KEY) return Response.json({ error: 'SERVICE_KEY missing' }, { status: 500 });
  if (!XAI_KEY) return Response.json({ error: 'XAI_KEY missing' }, { status: 500 });

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  const [holdingsRes, watchlistRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/holdings?select=symbol,exchange`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/watchlist?select=symbol,exchange`, { headers }),
  ]);
  const holdings: Row[]  = holdingsRes.ok  ? await holdingsRes.json()  : [];
  const watchlist: Row[] = watchlistRes.ok ? await watchlistRes.json() : [];

  const counts = new Map<string, { symbol: string; exchange: string; count: number }>();
  for (const r of [...holdings, ...watchlist]) {
    const existing = counts.get(r.symbol);
    if (existing) existing.count++;
    else counts.set(r.symbol, { symbol: r.symbol, exchange: r.exchange, count: 1 });
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, MAX_SYMBOLS);

  const today = new Date().toISOString().split('T')[0];
  let scanned = 0, failed = 0, logged = 0;

  for (const { symbol, exchange } of ranked) {
    const result = await grokSentiment(symbol, exchange);
    if (result) {
      const upsertRes = await fetch(`${SUPA_URL}/rest/v1/sentiment_scores`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ symbol, exchange, label: result.label, blurb: result.blurb, scanned_at: new Date().toISOString() }),
      });
      if (upsertRes.ok) scanned++; else failed++;

      const price = await fetchCurrentPrice(symbol, exchange);
      if (price != null) {
        const logRes = await fetch(`${SUPA_URL}/rest/v1/sentiment_scan_log`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ scanned_at: today, symbol, exchange, label: result.label, price_at: price }),
        });
        if (logRes.ok) logged++;
      }
    } else {
      failed++;
    }
    await sleep(200);
  }

  return Response.json({ candidates: ranked.length, scanned, failed, logged });
}
```

- [ ] **Step 2: Verify locally**

```bash
curl -s "http://localhost:3000/api/cron/sentiment-scan?secret=<CRON_SECRET value>"
```

Expected: `{"candidates":N,"scanned":N,"failed":0,"logged":N}` with `logged` roughly matching `scanned` (may be lower if Yahoo price lookup fails for a symbol).

- [ ] **Step 3: Verify the log row landed in Supabase**

```bash
curl -s "<SUPA_URL>/rest/v1/sentiment_scan_log?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: array with objects shaped like `{"scanned_at":"2026-07-04","symbol":"RELIANCE","exchange":"NSE","label":"neutral","price_at":1450.2,"price_7d":null,"return_7d":null,"price_30d":null,"return_30d":null}`

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/api/cron/sentiment-scan/route.ts
git commit -m "$(cat <<'EOF'
Log sentiment-scan results to sentiment_scan_log for accuracy backfill

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Build the sentiment accuracy backfill cron

**Files:**
- Create: `apps/web/app/api/cron/sentiment-scan/backfill/route.ts`
- Modify: `apps/web/vercel.json`

**Depends on:** Task 6 committed (log rows must exist to backfill).

- [ ] **Step 1: Write the backfill route**

```typescript
// Backfill 7d and 30d outcome prices for sentiment_scan_log rows.
// Fully decoupled from /api/cron/sentiment-scan — runs on its own schedule,
// a failure here never blocks the daily sentiment scan or the feed page.
// Call daily (Vercel Cron or manual): GET /api/cron/sentiment-scan/backfill
// Safe to call multiple times — only updates rows where the price is still null.

export const runtime = 'nodejs';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LogRow {
  id: string; symbol: string; exchange: string; scanned_at: string;
  price_at: number; price_7d: number | null; price_30d: number | null;
}

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number | null> {
  const suffix = exchange === 'BSE' ? '.BO' : exchange === 'NYSE' || exchange === 'NASDAQ' ? '' : '.NS';
  const ySym = `${symbol}${suffix}`;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    const d = await r.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
    return d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

export async function GET() {
  if (!SUPA_URL || !SUPA_KEY) return Response.json({ error: 'Supabase not configured' }, { status: 503 });

  const today  = new Date();
  const d7ago  = new Date(today.getTime() - 7 * 86_400_000).toISOString().split('T')[0];
  const d30ago = new Date(today.getTime() - 30 * 86_400_000).toISOString().split('T')[0];

  const need7 = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?scanned_at=lte.${d7ago}&price_7d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_7d,price_30d&limit=200`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<LogRow[]> : [] as LogRow[]);

  const need30 = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?scanned_at=lte.${d30ago}&price_30d=is.null&select=id,symbol,exchange,scanned_at,price_at,price_7d,price_30d&limit=200`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  ).then(r => r.ok ? r.json() as Promise<LogRow[]> : [] as LogRow[]);

  const allRows = [...need7, ...need30];
  const uniqueSymbols = [...new Set(allRows.map(r => `${r.symbol}:${r.exchange}`))];

  const priceCache: Record<string, number | null> = {};
  for (const key of uniqueSymbols) {
    const [sym, exch] = key.split(':');
    priceCache[key] = await fetchCurrentPrice(sym, exch);
    await new Promise(r => setTimeout(r, 200));
  }

  let updated7 = 0, updated30 = 0;

  for (const row of need7) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price == null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/sentiment_scan_log?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ price_7d: price, return_7d: ret }),
    });
    updated7++;
  }

  for (const row of need30) {
    const price = priceCache[`${row.symbol}:${row.exchange}`];
    if (price == null) continue;
    const ret = +((price - row.price_at) / row.price_at * 100).toFixed(2);
    await fetch(`${SUPA_URL}/rest/v1/sentiment_scan_log?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ price_30d: price, return_30d: ret }),
    });
    updated30++;
  }

  return Response.json({
    ok: true, updated_7d: updated7, updated_30d: updated30,
    skipped: allRows.length - updated7 - updated30, ran_at: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Verify it runs (no rows old enough yet is expected on day 1)**

```bash
curl -s "http://localhost:3000/api/cron/sentiment-scan/backfill"
```

Expected: `{"ok":true,"updated_7d":0,"updated_30d":0,"skipped":0,"ran_at":"..."}` (0 updates is correct until log rows are ≥7 days old — this is NOT a failure)

- [ ] **Step 3: Add the cron entry to `apps/web/vercel.json`**

Add to the `crons` array (after the `sentiment-scan` entry added in Task 4):
```json
    { "path": "/api/cron/sentiment-scan/backfill", "schedule": "0 3 * * *" }
```

Full array should now read:
```json
  "crons": [
    { "path": "/api/scan-log/backfill", "schedule": "0 12 * * *" },
    { "path": "/api/paper-trading/auto-scan", "schedule": "0 4 * * 1-5" },
    { "path": "/api/push/check-alerts", "schedule": "0 4 * * 1-5" },
    { "path": "/api/cron/sentiment-scan", "schedule": "0 2 * * 1-5" },
    { "path": "/api/cron/sentiment-scan/backfill", "schedule": "0 3 * * *" }
  ]
```

- [ ] **Step 4: Verify JSON validity**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 5: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/api/cron/sentiment-scan/backfill/route.ts apps/web/vercel.json
git commit -m "$(cat <<'EOF'
Add sentiment accuracy backfill cron (7d/30d outcome prices)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Build the sentiment accuracy stats route

**Files:**
- Create: `apps/web/app/api/sentiment-log/route.ts`

**Depends on:** Task 5 (table exists). Does not depend on Task 7 completing real backfills — returns `closed: 0, accuracy: null` gracefully until outcomes exist.

- [ ] **Step 1: Write the route**

```typescript
// Aggregate sentiment call accuracy from sentiment_scan_log — read-only, cheap, cacheable.
// "Accuracy" = % of closed (7d-outcome-known) bullish/bearish calls that moved the
// predicted direction. Neutral calls are excluded (no directional claim to score).

export const runtime = 'edge';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LogRow { label: string; return_7d: number | null; }

export async function GET() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/sentiment_scan_log?select=label,return_7d&return_7d=not.is.null`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  );
  if (!res.ok) return Response.json({ closed: 0, accuracy: null });

  const rows: LogRow[] = await res.json();
  const relevant = rows.filter(r => r.label === 'bullish' || r.label === 'bearish');
  const correct = relevant.filter(r =>
    (r.label === 'bullish' && (r.return_7d ?? 0) > 0) ||
    (r.label === 'bearish' && (r.return_7d ?? 0) < 0)
  );
  const accuracy = relevant.length > 0 ? Math.round((correct.length / relevant.length) * 100) : null;

  return Response.json(
    { closed: relevant.length, accuracy },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
  );
}
```

- [ ] **Step 2: Verify**

```bash
curl -s "http://localhost:3000/api/sentiment-log"
```

Expected: `{"closed":0,"accuracy":null}` (correct until outcomes have backfilled — not a bug)

- [ ] **Step 3: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/api/sentiment-log/route.ts
git commit -m "$(cat <<'EOF'
Add sentiment accuracy aggregate stats route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Rewrite the feed page

**Files:**
- Modify: `apps/web/app/dashboard/feed/page.tsx` (full rewrite)

**Depends on:** Task 6 (sentiment_scores populated), Task 8 (`/api/sentiment-log` exists).

- [ ] **Step 1: Replace the file contents**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/lib/portfolio-context';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Label = 'bullish' | 'bearish' | 'neutral';

interface SentimentRow {
  symbol: string;
  exchange: string;
  label: Label;
  blurb: string;
  scanned_at: string;
}

interface WatchRow { symbol: string; exchange: string; }
interface AccuracyStats { closed: number; accuracy: number | null; }

const BADGE: Record<Label, { icon: string; text: string; color: string; bg: string; border: string }> = {
  bullish: { icon: '🟢', text: 'Bullish', color: 'var(--grn)', bg: 'rgba(0,212,160,0.1)',  border: 'rgba(0,212,160,0.3)' },
  bearish: { icon: '🔴', text: 'Bearish', color: 'var(--red)', bg: 'rgba(255,59,92,0.1)',  border: 'rgba(255,59,92,0.3)' },
  neutral: { icon: '🟡', text: 'Neutral', color: 'var(--ylw)', bg: 'rgba(255,184,0,0.1)',  border: 'rgba(255,184,0,0.3)' },
};

export default function SentimentFeedPage() {
  const { session, holdings } = usePortfolio();
  const [watchlist, setWatchlist] = useState<WatchRow[]>([]);
  const [sentiment, setSentiment] = useState<Record<string, SentimentRow>>({});
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWatchlist = useCallback(async () => {
    if (!session) return [] as WatchRow[];
    const res = await fetch(
      `${SUPA_URL}/rest/v1/watchlist?user_id=eq.${session.user.id}&select=symbol,exchange`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } },
    );
    return res.ok ? await res.json() as WatchRow[] : [];
  }, [session]);

  useEffect(() => {
    fetch('/api/sentiment-log')
      .then(r => r.ok ? r.json() as Promise<AccuracyStats> : null)
      .then(d => setAccuracy(d))
      .catch(() => setAccuracy(null));
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError('');
    fetchWatchlist().then(async (wl) => {
      setWatchlist(wl);
      const symbols = [...new Set([...holdings.map(h => h.symbol), ...wl.map(w => w.symbol)])];
      if (!symbols.length) { setLoading(false); return; }
      const list = symbols.map(s => `"${s}"`).join(',');
      const res = await fetch(
        `${SUPA_URL}/rest/v1/sentiment_scores?symbol=in.(${list})&select=*`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) { setError('Failed to load sentiment data.'); setLoading(false); return; }
      const rows: SentimentRow[] = await res.json();
      setSentiment(Object.fromEntries(rows.map(r => [r.symbol, r])));
      setLoading(false);
    });
  }, [session, holdings, fetchWatchlist]);

  const symbolMap = new Map<string, WatchRow>();
  for (const h of holdings) symbolMap.set(h.symbol, { symbol: h.symbol, exchange: h.exchange });
  for (const w of watchlist) symbolMap.set(w.symbol, w);
  const allSymbols = [...symbolMap.values()];

  const card: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-bdr)', borderRadius: 14, padding: 16, marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,rgba(0,0,0,0.04),rgba(23,64,245,0.04))', border: '1px solid var(--card-bdr)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 8 }}>AI Sentiment Scan</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, marginBottom: 8 }}>
            Grok&apos;s daily read on <span style={{ color: 'var(--bluL)' }}>your stocks.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
            One AI-generated sentiment take per stock you hold or watch, refreshed each morning before market open. Not a live tweet feed — Grok&apos;s general read on current mood, not real-time X search.
          </div>
        </div>
        {accuracy && accuracy.closed > 0 && accuracy.accuracy != null && (
          <div style={{ flexShrink: 0, background: accuracy.accuracy >= 50 ? 'rgba(0,212,160,0.1)' : 'rgba(255,59,92,0.1)', border: `1px solid ${accuracy.accuracy >= 50 ? 'rgba(0,212,160,0.3)' : 'rgba(255,59,92,0.3)'}`, borderRadius: 16, padding: '14px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: accuracy.accuracy >= 50 ? 'var(--grn)' : 'var(--red)', letterSpacing: -1, lineHeight: 1 }}>{accuracy.accuracy}%</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>7d accuracy · {accuracy.closed} calls</div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
      ) : !allSymbols.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 32 }}>
          No stocks yet. Add holdings or a watchlist symbol to see sentiment here.
        </div>
      ) : (
        allSymbols.map(({ symbol, exchange }) => {
          const row = sentiment[symbol];
          const badge = row ? BADGE[row.label] : null;
          return (
            <div key={symbol} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{symbol}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{exchange}</div>
              </div>
              {row && badge ? (
                <div style={{ flex: 1, minWidth: 200, textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                    {badge.icon} {badge.text}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>{row.blurb}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim2)', marginTop: 2 }}>
                    Updated {new Date(row.scanned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--dim2)' }}>Not scanned yet</span>
              )}
            </div>
          );
        })
      )}

      <div style={{ fontSize: 11, color: 'var(--dim2)', textAlign: 'center', marginTop: 16 }}>
        Not SEBI registered · AI-generated take, not real-time tweets · DYOR
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start (or confirm) the dev server**

```bash
cd "/Users/gsaiganesh/signal-app/apps/web" && npm run dev
```

Expected: no TypeScript/compile errors.

- [ ] **Step 3: Manually verify in the browser**

Open `http://localhost:3000/dashboard/feed` while logged in as a test user with at least one holding or watchlist symbol that was scanned in Task 6.

Expected:
- Header shows "AI Sentiment Scan" (no 𝕏/Twitter branding)
- Accuracy chip is absent (no closed outcomes exist yet on day 1 — this is correct, not a bug)
- The scanned symbol shows a colored badge (🟢/🔴/🟡) + blurb + "Updated {date}"
- Any unscanned symbol shows "Not scanned yet" instead of crashing
- Footer shows "Not SEBI registered · AI-generated take, not real-time tweets · DYOR"

- [ ] **Step 4: Commit**

```bash
cd "/Users/gsaiganesh/signal-app" && git add apps/web/app/dashboard/feed/page.tsx
git commit -m "$(cat <<'EOF'
Replace X API placeholder on feed page with real Grok sentiment scan

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Production env vars + final verification

**Files:** None (Vercel dashboard — manual step)

- [ ] **Step 1: Add the three env vars to Vercel**

Vercel dashboard → Project Settings → Environment Variables: `XAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (same values as `.env.local`).

- [ ] **Step 2: Deploy and verify both crons are registered**

Vercel dashboard → Project → Cron Jobs. Expected: `/api/cron/sentiment-scan` (`0 2 * * 1-5`) and `/api/cron/sentiment-scan/backfill` (`0 3 * * *`) both listed.

- [ ] **Step 3: Trigger the main scan manually once in production**

```bash
curl -s "https://signal-app-api.vercel.app/api/cron/sentiment-scan?secret=<CRON_SECRET>"
```

Expected: `{"candidates":N,"scanned":N,"failed":0,"logged":N}` with N ≥ 1.

- [ ] **Step 4: Verify the live feed page**

Visit `https://signal-app-api.vercel.app/dashboard/feed` logged in as a real account. Expected: sentiment badges render for held/watched stocks.

- [ ] **Step 5: Note for ~7-10 days out**

Once the backfill cron has had a week to run, revisit `/dashboard/feed` — the accuracy chip should appear in the hero once `closed > 0` in `/api/sentiment-log`. No action needed now; this is a passive check.
