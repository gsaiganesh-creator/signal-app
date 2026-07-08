/**
 * SignalGenie API stress test
 * Usage: node stress-test.mjs [base_url]
 * Default: https://signal-app-api.vercel.app
 */

const BASE = process.argv[2] ?? 'https://signal-app-api.vercel.app';
const CONCURRENCY = 10;
const REPEAT = 3;

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  grn: '\x1b[32m', red: '\x1b[31m', ylw: '\x1b[33m', dim: '\x1b[2m', cyn: '\x1b[36m',
};

function badge(ms) {
  if (ms < 500)  return `${c.grn}${ms}ms${c.reset}`;
  if (ms < 1500) return `${c.ylw}${ms}ms${c.reset}`;
  return `${c.red}${ms}ms${c.reset}`;
}

async function hit(url, label, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const ms = Date.now() - t0;
    const body = await r.json().catch(() => ({}));
    clearTimeout(t);
    return { label, url, ok: r.ok, status: r.status, ms, size: JSON.stringify(body).length };
  } catch (e) {
    const ms = Date.now() - t0;
    clearTimeout(t);
    return { label, url, ok: false, status: e.name === 'AbortError' ? 'TIMEOUT' : 'ERROR', ms, size: 0, err: e.message };
  }
}

// ── Test definitions ──────────────────────────────────────────────────────────
const TESTS = [
  // Core price APIs
  { label: 'Prices — small batch (5)',
    url: () => `${BASE}/api/prices?symbols=RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,ICICIBANK.NS` },
  { label: 'Prices — large batch (20)',
    url: () => `${BASE}/api/prices?symbols=RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,ICICIBANK.NS,WIPRO.NS,KOTAKBANK.NS,AXISBANK.NS,LT.NS,BAJFINANCE.NS,MARUTI.NS,SUNPHARMA.NS,TITAN.NS,TATAMOTORS.NS,HINDUNILVR.NS,ITC.NS,BHARTIARTL.NS,NTPC.NS,COALINDIA.NS,DLF.NS` },
  { label: 'Prices — US stocks',
    url: () => `${BASE}/api/prices?symbols=AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,AVGO` },
  { label: 'Prices — Forex (9 pairs)',
    url: () => `${BASE}/api/prices?symbols=USDINR=X,EURINR=X,GBPINR=X,JPYINR=X,AEDINR=X,SGDINR=X,AUDINR=X,CADINR=X,CHFINR=X` },
  { label: 'Prices — Commodities (6)',
    url: () => `${BASE}/api/prices?symbols=GC=F,SI=F,CL=F,NG=F,HG=F,ALI=F` },

  // Heavy endpoints
  { label: 'Stock detail — RELIANCE',
    url: () => `${BASE}/api/stock-detail?symbol=RELIANCE&exchange=NSE`, timeout: 20000 },
  { label: 'Stock detail — TCS',
    url: () => `${BASE}/api/stock-detail?symbol=TCS&exchange=NSE`, timeout: 20000 },
  { label: 'Stock detail — AAPL (US)',
    url: () => `${BASE}/api/stock-detail?symbol=AAPL&exchange=NASDAQ`, timeout: 20000 },

  // Scan APIs
  { label: 'Fundamental scan — 10 stocks',
    url: () => `${BASE}/api/fundamental-scan?symbols=TCS,INFY,RELIANCE,HDFCBANK,ICICIBANK,WIPRO,AXISBANK,LT,MARUTI,SUNPHARMA`, timeout: 25000 },

  // Market data
  { label: 'FII/DII data',
    url: () => `${BASE}/api/fii-dii` },
  { label: 'IPO calendar',
    url: () => `${BASE}/api/ipo` },

  // Sector
  { label: 'Sector data — IT',
    url: () => `${BASE}/api/sector-data?sector=it`, timeout: 20000 },

  // Scan log (Supabase)
  { label: 'Scan log — recent',
    url: () => `${BASE}/api/scan-log?limit=20` },
];

// ── Run single test ───────────────────────────────────────────────────────────
async function runTest(t) {
  const results = [];
  for (let i = 0; i < REPEAT; i++) {
    const r = await hit(t.url(), t.label, t.timeout ?? 15000);
    results.push(r);
  }
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  const min = Math.min(...results.map(r => r.ms));
  const max = Math.max(...results.map(r => r.ms));
  const errors = results.filter(r => !r.ok).length;
  return { label: t.label, avg, min, max, errors, total: REPEAT, size: results[0].size, status: results[0].status };
}

// ── Concurrent load test ──────────────────────────────────────────────────────
async function concurrentTest(t, n = CONCURRENCY) {
  const url = t.url();
  const t0 = Date.now();
  const promises = Array.from({ length: n }, () => hit(url, t.label, t.timeout ?? 15000));
  const results = await Promise.all(promises);
  const elapsed = Date.now() - t0;
  const errors = results.filter(r => !r.ok).length;
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  return { label: t.label, concurrent: n, elapsed, avg, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n${c.bold}SignalGenie API Stress Test${c.reset}`);
console.log(`${c.dim}Target: ${BASE}${c.reset}`);
console.log(`${c.dim}Repeat: ${REPEAT}x per endpoint · Concurrent load: ${CONCURRENCY} req${c.reset}\n`);

console.log(`${c.bold}── Sequential latency tests (${REPEAT} runs each) ──${c.reset}`);
const seqResults = [];
for (const t of TESTS) {
  process.stdout.write(`  ${t.label.padEnd(45)} `);
  const r = await runTest(t);
  seqResults.push(r);
  const errStr = r.errors > 0 ? ` ${c.red}${r.errors}/${r.total} errors${c.reset}` : '';
  const sizeKb = (r.size / 1024).toFixed(1);
  console.log(`avg:${badge(r.avg)} min:${c.dim}${r.min}ms${c.reset} max:${c.dim}${r.max}ms${c.reset} size:${c.dim}${sizeKb}KB${c.reset}${errStr}`);
}

console.log(`\n${c.bold}── Concurrent load test (${CONCURRENCY} simultaneous requests) ──${c.reset}`);
// Test the top 4 most-used endpoints concurrently
const concTargets = TESTS.slice(0, 4);
const concResults = [];
for (const t of concTargets) {
  process.stdout.write(`  ${t.label.padEnd(45)} `);
  const r = await concurrentTest(t, CONCURRENCY);
  concResults.push(r);
  const errStr = r.errors > 0 ? ` ${c.red}${r.errors}/${CONCURRENCY} errors${c.reset}` : `${c.grn} 0 errors${c.reset}`;
  console.log(`${CONCURRENCY} req in ${badge(r.elapsed)} · avg/req:${badge(r.avg)}${errStr}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${c.bold}── Summary ──${c.reset}`);
const slow = seqResults.filter(r => r.avg > 1500);
const errors = seqResults.filter(r => r.errors > 0);
const allOk = seqResults.filter(r => r.avg < 500);

if (allOk.length)   console.log(`  ${c.grn}✓ Fast (<500ms):${c.reset}  ${allOk.map(r => r.label.split('—')[0].trim()).join(', ')}`);
if (slow.length)    console.log(`  ${c.ylw}⚠ Slow (>1.5s):${c.reset}   ${slow.map(r => `${r.label.split('—')[0].trim()} (${r.avg}ms)`).join(', ')}`);
if (errors.length)  console.log(`  ${c.red}✗ Errors:${c.reset}          ${errors.map(r => `${r.label.split('—')[0].trim()} (${r.errors}/${r.total})`).join(', ')}`);
if (!slow.length && !errors.length) console.log(`  ${c.grn}All endpoints healthy${c.reset}`);

console.log(`\n${c.dim}Note: Yahoo Finance has no API key — Vercel shared IPs may get rate-limited (HTTP 429) under sustained load.`);
console.log(`Supabase free tier: 60 direct connections. Watch for connection pool exhaustion at 50+ concurrent users.${c.reset}\n`);
