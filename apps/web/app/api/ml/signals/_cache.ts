// Shared in-process cache — both the scan route and the ticker route
// run in the same Node.js process in Docker, so this module is a singleton.

export interface ScanSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number; ema20: number;
  ema_dist_pct: number; entry_low: number; entry_high: number;
  target: number; sl: number; signal: string; confidence: number; score: number;
}

let _cache: { data: ScanSignal[]; ts: number } | null = null;
export const SCAN_TTL = 3_600_000; // 1 hour

export function setScanCache(data: ScanSignal[]) {
  _cache = { data, ts: Date.now() };
}

export function getScanCache(): { data: ScanSignal[]; ts: number } | null {
  return _cache;
}

export function isCacheFresh(): boolean {
  return !!_cache && Date.now() - _cache.ts < SCAN_TTL;
}

export function findInScan(sym: string): ScanSignal | null {
  if (!_cache) return null;
  const key = sym.toUpperCase();
  return _cache.data.find(s => s.symbol.toUpperCase() === key) ?? null;
}
