// Paper trading auto-scanner — runs via Vercel Cron Mon–Fri at 4:00 AM UTC (9:30 AM IST)
// Requires: SUPABASE_SERVICE_ROLE_KEY + CRON_SECRET in Vercel env vars
// Two jobs per run:
//   1. Auto-EXIT open trades that hit SL or target
//   2. Auto-ENTER new trades where stock matches strategy signal

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL       = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://signal-app-api.vercel.app').replace(/\/$/, '');
const CRON_SECRET   = process.env.CRON_SECRET ?? '';

// 30-stock NSE universe scanned every morning
const NSE_UNIVERSE = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK',
  'SBIN','BHARTIARTL','WIPRO','KOTAKBANK','ITC',
  'LT','ASIANPAINT','MARUTI','TITAN','BAJFINANCE',
  'HCLTECH','SUNPHARMA','NESTLEIND','POWERGRID','ONGC',
  'ADANIPORTS','AXISBANK','BAJAJFINSV','BPCL','BRITANNIA',
  'CIPLA','DRREDDY','EICHERMOT','TATAMOTORS','ZOMATO',
];

interface StrategyRow {
  id: string; user_id: string; name: string;
  algo_type: string; capital: number;
  rsi_low: number; rsi_high: number;
  sl_pct: number; target_pct: number;
}

interface TradeRow {
  id: string; strategy_id: string; symbol: string;
  signal: string; entry_price: number; qty: number; status: string;
}

interface StockDetail {
  symbol:    string;
  price:     number;
  rsi14:     number | null;
  ema20:     number | null;
  ema50:     number | null;
  ema200:    number | null;
  macd:      number | null;
  bb_pct:    number | null;
  from_52h:  number | null;
  vol_ratio: number | null;
}

// Entry signal logic per algo type
function matchesEntry(d: StockDetail, s: StrategyRow): boolean {
  const { price, rsi14, ema20, ema50, ema200, macd, bb_pct, from_52h, vol_ratio } = d;
  const rsiOk = rsi14 != null && rsi14 >= s.rsi_low && rsi14 <= s.rsi_high;

  switch (s.algo_type) {
    case 'rsi_ema':
      // RSI in range + price above EMA20 (momentum with pullback)
      return rsiOk && price > (ema20 ?? 0);

    case 'dual_ema':
      // EMA20 > EMA50 (golden cross zone) + price above EMA50
      return (ema20 ?? 0) > (ema50 ?? 0) && price > (ema50 ?? 0) && rsiOk;

    case 'mean_rev':
      // Oversold RSI + price near lower Bollinger Band
      return rsi14 != null && rsi14 < 38 && (bb_pct ?? 1) < 0.25;

    case 'vwap':
      // RSI in neutral-bullish zone + positive MACD momentum
      return rsiOk && (macd ?? 0) > 0;

    case 'sector_rot':
      // Price above EMA200 (long-term uptrend) + MACD positive + RSI healthy
      return rsiOk && price > (ema200 ?? 0) && (macd ?? 0) > 0;

    case 'breakout':
      // RSI > 50 (momentum) + near 52W high + volume surge
      return rsi14 != null && rsi14 > 50 && (from_52h ?? -100) > -8 && (vol_ratio ?? 0) > 1.3;

    case 'custom_ema20':
      return rsiOk && price > (ema20 ?? 0);
    case 'custom_ema50':
      return rsiOk && price > (ema50 ?? 0);
    case 'custom_ema200':
      return rsiOk && price > (ema200 ?? 0);
    default:
      // custom_none or any unknown: RSI range only
      return rsiOk;
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
    ?? req.nextUrl.searchParams.get('secret')
    ?? '';
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!SERVICE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── 1. Load all active strategies ────────────────────────────────────────────
  const { data: strategies, error: stErr } = await db
    .from('paper_strategies')
    .select('id,user_id,name,algo_type,capital,rsi_low,rsi_high,sl_pct,target_pct')
    .eq('active', true);

  if (stErr || !strategies?.length) {
    return NextResponse.json({ ok: true, message: 'No active strategies', scanned: 0 });
  }

  // ── 2. Load all open trades ───────────────────────────────────────────────────
  const { data: openRows } = await db
    .from('paper_trades')
    .select('id,strategy_id,symbol,signal,entry_price,qty,status')
    .eq('status', 'OPEN');

  const openTrades: TradeRow[] = openRows ?? [];

  // ── 3. Fetch technicals for all NSE universe stocks in parallel ───────────────
  const fetched = await Promise.allSettled(
    NSE_UNIVERSE.map(async sym => {
      try {
        const r = await fetch(
          `${APP_URL}/api/stock-detail?symbol=${sym}.NS&exchange=NSE`,
          { signal: AbortSignal.timeout(9000) }
        );
        if (!r.ok) return null;
        const d = await r.json() as StockDetail;
        return { ...d, symbol: sym };
      } catch {
        return null;
      }
    })
  );

  const stockMap = new Map<string, StockDetail>();
  for (const r of fetched) {
    if (r.status === 'fulfilled' && r.value?.price) {
      stockMap.set(r.value.symbol, r.value);
    }
  }

  // ── 4. Auto-EXIT: close trades that hit SL or target ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const exitOps: PromiseLike<any>[] = [];

  for (const trade of openTrades) {
    const detail = stockMap.get(trade.symbol);
    if (!detail) continue;
    const strategy = (strategies as StrategyRow[]).find(s => s.id === trade.strategy_id);
    if (!strategy) continue;

    const { price } = detail;
    const isBuy    = trade.signal === 'BUY';
    const slPrice  = trade.entry_price * (1 - strategy.sl_pct  / 100);
    const tgtPrice = trade.entry_price * (1 + strategy.target_pct / 100);

    const hitSL  = isBuy ? price <= slPrice  : price >= slPrice;
    const hitTGT = isBuy ? price >= tgtPrice : price <= tgtPrice;

    if (hitSL || hitTGT) {
      const pl = (price - trade.entry_price) * trade.qty * (isBuy ? 1 : -1);
      exitOps.push(
        db.from('paper_trades').update({
          exit_price: +price.toFixed(2),
          exit_at:    new Date().toISOString(),
          pl:         +pl.toFixed(2),
          status:     hitTGT ? 'WIN' : 'LOSS',
        }).eq('id', trade.id).then(r => r)
      );
    }
  }

  await Promise.allSettled(exitOps);

  // ── 5. Auto-ENTER: find new signals, skip already-open symbols ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entryOps: PromiseLike<any>[] = [];
  const entryLog: string[] = [];

  for (const strategy of strategies as StrategyRow[]) {
    const alreadyOpen = new Set(
      openTrades
        .filter(t => t.strategy_id === strategy.id)
        .map(t => t.symbol)
    );

    for (const [sym, detail] of stockMap) {
      if (alreadyOpen.has(sym)) continue;
      if (!matchesEntry(detail, strategy)) continue;

      // Position size: 5% of virtual capital per trade
      const qty = Math.max(1, Math.floor((strategy.capital * 0.05) / detail.price));

      entryLog.push(`${strategy.name} → ${sym} @ ₹${detail.price}`);
      entryOps.push(
        db.from('paper_trades').insert({
          strategy_id: strategy.id,
          user_id:     strategy.user_id,
          symbol:      sym,
          signal:      'BUY',
          entry_price: +detail.price.toFixed(2),
          qty,
          status:      'OPEN',
          entry_at:    new Date().toISOString(),
        }).then(r => r)
      );
    }
  }

  await Promise.allSettled(entryOps);

  return NextResponse.json({
    ok:         true,
    ran_at:     new Date().toISOString(),
    scanned:    stockMap.size,
    strategies: strategies.length,
    exited:     exitOps.length,
    entered:    entryOps.length,
    entries:    entryLog,
  });
}
