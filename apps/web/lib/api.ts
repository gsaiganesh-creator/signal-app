const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface LiveQuote {
  ticker: string;
  current_price: number | null;
  change_pct: number | null;
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  rsi: number | null;
  indicators?: Record<string, unknown>;
}

export interface MarketIndex {
  price: number;
  change: number;
  change_pct: number;
}

export interface MarketIndices {
  NIFTY50?: MarketIndex;
  SENSEX?: MarketIndex;
  BANKNIFTY?: MarketIndex;
  NIFTYIT?: MarketIndex;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export function fetchQuote(symbol: string): Promise<LiveQuote | null> {
  return apiFetch<LiveQuote>(`/api/signals/${symbol.toUpperCase()}`);
}

export function fetchMarketIndices(): Promise<MarketIndices | null> {
  return apiFetch<MarketIndices>('/api/market/indices');
}

export function fetchMarketRegime(): Promise<{ regime: string; sentiment: string } | null> {
  return apiFetch('/api/market/regime');
}
