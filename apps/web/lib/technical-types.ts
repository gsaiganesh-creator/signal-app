// apps/web/lib/technical-types.ts
// Shared response shape for /api/technical, used by any page consuming it.
export type TechResult = { rsi14: number | null; ema_gap_pct: number | null; bias: 'bullish' | 'bearish' | null };
export type TechMap = Record<string, TechResult>;
