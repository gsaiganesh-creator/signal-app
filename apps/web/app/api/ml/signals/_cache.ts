// Shared scan cache pinned to Node.js `global` so it survives across
// Next.js route bundles (each route gets its own module scope, but global is shared).

export interface ScanSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

type Cache = { data: ScanSignal[]; ts: number } | null;
const g = global as typeof global & { __signalScanCache?: Cache };

export const SCAN_TTL = 3_600_000; // 1 hour

export function setScanCache(data: ScanSignal[]) {
  g.__signalScanCache = { data, ts: Date.now() };
}

export function getScanCache(): Cache {
  return g.__signalScanCache ?? null;
}

export function isCacheFresh(): boolean {
  const c = g.__signalScanCache;
  return !!c && Date.now() - c.ts < SCAN_TTL;
}

export function findInScan(sym: string): ScanSignal | null {
  const c = g.__signalScanCache;
  if (!c) return null;
  const key = sym.toUpperCase();
  return c.data.find(s => s.symbol.toUpperCase() === key) ?? null;
}
