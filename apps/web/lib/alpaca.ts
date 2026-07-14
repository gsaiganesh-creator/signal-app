// Alpaca Market Data API (free tier — real-time IEX feed, not the 15min-delayed
// Yahoo data). US equities only — does not cover NSE/BSE, forex, or commodities,
// so callers must route those to Yahoo as before. Needs ALPACA_API_KEY_ID +
// ALPACA_API_SECRET_KEY env vars (free signup at alpaca.markets, market data
// works even on a paper/unfunded account — no broker funding required).

export interface PriceResult {
  price: number | null;
  change_pct: number | null;
  prev_close: number | null;
}

interface AlpacaSnapshot {
  latestTrade?: { p?: number };
  prevDailyBar?: { c?: number };
  dailyBar?: { c?: number };
}

const ALPACA_KEY    = process.env.ALPACA_API_KEY_ID ?? '';
const ALPACA_SECRET = process.env.ALPACA_API_SECRET_KEY ?? '';
const BATCH_SIZE = 50; // Alpaca snapshots endpoint — stay well under its per-request symbol cap

export function hasAlpacaKeys(): boolean {
  return !!ALPACA_KEY && !!ALPACA_SECRET;
}

export async function fetchAlpacaPrices(symbols: string[]): Promise<Record<string, PriceResult>> {
  const results: Record<string, PriceResult> = {};
  if (!hasAlpacaKeys() || !symbols.length) return results;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    try {
      const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(batch.join(','))}&feed=iex`;
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET,
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json() as Record<string, AlpacaSnapshot>;
      for (const sym of batch) {
        const snap = data[sym];
        const price      = snap?.latestTrade?.p ?? snap?.dailyBar?.c ?? null;
        const prev_close = snap?.prevDailyBar?.c ?? null;
        const change_pct = (price != null && prev_close != null && prev_close > 0)
          ? ((price - prev_close) / prev_close) * 100
          : null;
        results[sym] = { price, change_pct, prev_close };
      }
    } catch {
      // leave this batch's symbols unset — caller falls back to Yahoo for anything missing
    }
  }

  return results;
}

// US equity = no India suffix (.NS/.BO), no forex (=X) or commodity (=F) suffix.
// Everything else stays on Yahoo, which Alpaca can't serve anyway.
export function isUsEquitySymbol(sym: string): boolean {
  return !sym.endsWith('.NS') && !sym.endsWith('.BO') && !sym.includes('=X') && !sym.includes('=F');
}
