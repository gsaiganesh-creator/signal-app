// Comprehensive stock detail: price, technicals (RSI, EMA, MACD, BB, ATR),
// 52W range, signals — plus US fundamentals from Yahoo quoteSummary.

export const runtime = 'edge';

// ─── Technical helpers ────────────────────────────────────────────────────────

function ema(prices: number[], period: number): number {
  if (!prices.length) return 0;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, prices.length);
  for (let i = Math.min(period, prices.length); i < prices.length; i++) val = prices[i] * k + val * (1 - k);
  return val;
}

function rsi(prices: number[], period = 14): number | null {
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

function bollinger(prices: number[], period = 20) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period);
  return { upper: mid + 2 * sd, lower: mid - 2 * sd, mid };
}

function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
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
function supertrend(
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Num = number | null;

interface QS {
  defaultKeyStatistics?: {
    beta?: { raw?: number };
    enterpriseToEbitda?: { raw?: number };
    shortPercentOfFloat?: { raw?: number };
    shortRatio?: { raw?: number };
    trailingEps?: { raw?: number };
    forwardEps?: { raw?: number };
    earningsQuarterlyGrowth?: { raw?: number };
  };
  financialData?: {
    targetMeanPrice?: { raw?: number };
    targetHighPrice?: { raw?: number };
    targetLowPrice?: { raw?: number };
    recommendationMean?: { raw?: number };
    recommendationKey?: string;
    numberOfAnalystOpinions?: { raw?: number };
    revenueGrowth?: { raw?: number };
    earningsGrowth?: { raw?: number };
    grossMargins?: { raw?: number };
    operatingMargins?: { raw?: number };
    profitMargins?: { raw?: number };
    returnOnEquity?: { raw?: number };
    debtToEquity?: { raw?: number };
    currentRatio?: { raw?: number };
    freeCashflow?: { raw?: number };
    ebitda?: { raw?: number };
  };
  summaryDetail?: {
    trailingPE?: { raw?: number };
    forwardPE?: { raw?: number };
    priceToBook?: { raw?: number };
    dividendYield?: { raw?: number };
    payoutRatio?: { raw?: number };
    beta?: { raw?: number };
    marketCap?: { raw?: number };
    priceToSalesTrailing12Months?: { raw?: number };
    fiveYearAvgDividendYield?: { raw?: number };
    exDividendDate?: { raw?: number };
  };
  calendarEvents?: {
    earnings?: {
      earningsDate?: Array<{ raw?: number }>;
    };
  };
  quoteType?: {
    longName?: string;
    shortName?: string;
  };
  majorHoldersBreakdown?: {
    insidersPercentHeld?: { raw?: number };
    institutionsPercentHeld?: { raw?: number };
    institutionCount?: { raw?: number };
  };
  incomeStatementHistoryQuarterly?: {
    incomeStatementHistory?: Array<{
      endDate?: { raw?: number; fmt?: string };
      totalRevenue?: { raw?: number };
      grossProfit?: { raw?: number };
      netIncome?: { raw?: number };
      ebit?: { raw?: number };
    }>;
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol   = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase();

  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  const isUS = exchange !== 'NSE' && exchange !== 'BSE';
  const ySym = exchange === 'NSE' ? `${symbol}.NS`
             : exchange === 'BSE' ? `${symbol}.BO`
             : symbol;

  const hdrs = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

  try {
    // Run chart + quoteSummary in parallel; quoteSummary only for US stocks
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=3mo`;
    const qsUrl    = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=defaultKeyStatistics,financialData,summaryDetail,calendarEvents,incomeStatementHistoryQuarterly,majorHoldersBreakdown`;

    const [chartRes, qsRes] = await Promise.all([
      fetch(chartUrl, { headers: hdrs, signal: AbortSignal.timeout(8000) }),
      fetch(qsUrl, { headers: hdrs, signal: AbortSignal.timeout(8000) }),
    ]);

    if (!chartRes.ok) return Response.json({ error: `yahoo ${chartRes.status}` }, { status: 502 });

    const chartData = await chartRes.json() as {
      chart?: { result?: Array<{
        meta?: {
          regularMarketPrice?: number; regularMarketChangePercent?: number; chartPreviousClose?: number;
          fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
          fiftyDayAverage?: number; twoHundredDayAverage?: number;
          regularMarketVolume?: number; averageDailyVolume10Day?: number;
          longName?: string; shortName?: string; currency?: string;
        };
        indicators?: { quote?: Array<{
          close?: (number | null)[];
          high?:  (number | null)[];
          low?:   (number | null)[];
        }> };
      }> };
    };

    const result = chartData?.chart?.result?.[0];
    if (!result?.meta) return Response.json({ error: 'no data' }, { status: 404 });

    const m    = result.meta;
    const q0   = result.indicators?.quote?.[0] ?? {};
    const raw  = q0.close ?? [];
    const rawH = q0.high  ?? [];
    const rawL = q0.low   ?? [];

    const closes = raw .filter((c): c is number => c != null && isFinite(c));
    const highs  = rawH.filter((c): c is number => c != null && isFinite(c));
    const lows   = rawL.filter((c): c is number => c != null && isFinite(c));

    const price   = m.regularMarketPrice ?? null;
    const ema20v  = closes.length >= 20 ? +ema(closes, 20).toFixed(2) : null;
    const ema50v  = m.fiftyDayAverage    ? +m.fiftyDayAverage.toFixed(2)      : closes.length >= 50 ? +ema(closes, 50).toFixed(2) : null;
    const ema200v = m.twoHundredDayAverage ? +m.twoHundredDayAverage.toFixed(2) : null;
    const rsi14   = rsi(closes);
    const bb      = bollinger(closes);
    const ema12v  = closes.length >= 12 ? ema(closes, 12) : null;
    const ema26v  = closes.length >= 26 ? ema(closes, 26) : null;
    const macd    = (ema12v != null && ema26v != null) ? +(ema12v - ema26v).toFixed(2) : null;
    const volR    = (m.regularMarketVolume && m.averageDailyVolume10Day)
                  ? +(m.regularMarketVolume / m.averageDailyVolume10Day).toFixed(2) : null;
    const high52  = m.fiftyTwoWeekHigh ?? null;
    const low52   = m.fiftyTwoWeekLow  ?? null;
    const from52h = (price && high52) ? +((price - high52) / high52 * 100).toFixed(1) : null;
    const bbPct   = (bb && price) ? +Math.max(0, Math.min(100, (price - bb.lower) / (bb.upper - bb.lower) * 100)).toFixed(1) : null;
    const atr14   = (highs.length >= 15 && lows.length >= 15)
                  ? +(atr(highs, lows, closes, 14)!).toFixed(2) : null;
    const st      = (highs.length >= 12) ? supertrend(highs, lows, closes, 10, 3) : null;

    // Derived levels
    const stopLoss  = (bb && price) ? +Math.max(bb.lower, price * 0.95).toFixed(2) : null;
    const target1   = (ema50v && price && ema50v > price) ? ema50v : (bb ? +bb.upper.toFixed(2) : null);
    const target2   = (bb && price) ? +(bb.upper * 1.025).toFixed(2) : null;
    const entryLow  = (ema20v && price) ? +Math.min(ema20v, price * 0.998).toFixed(2) : null;
    const entryHigh = (ema20v && price) ? +Math.max(ema20v, price * 1.002).toFixed(2) : null;

    // ─── US Fundamentals ─────────────────────────────────────────────────────
    let fund: {
      trailing_pe: Num; forward_pe: Num; price_to_book: Num; ev_ebitda: Num; price_to_sales: Num; beta: Num;
      revenue_growth: Num; earnings_growth: Num;
      gross_margin: Num; operating_margin: Num; net_margin: Num; roe: Num;
      debt_to_equity: Num; current_ratio: Num;
      dividend_yield: Num; payout_ratio: Num; ex_div_date: string | null;
      market_cap: Num;
      analyst_count: Num; analyst_consensus: string | null; analyst_target: Num;
      analyst_target_high: Num; analyst_target_low: Num; upside_to_target: Num;
      next_earnings_date: string | null; days_to_earnings: Num;
      short_pct_float: Num; short_ratio: Num;
    } | null = null;

    type QuarterRow = { quarter: string; revenue_cr: number | null; net_income_cr: number | null; net_margin: number | null };
    let quarterly_results: QuarterRow[] = [];
    let insider_pct: number | null = null;
    let institution_pct: number | null = null;
    let public_pct: number | null = null;

    if (qsRes?.ok) {
      try {
        const qsData = await qsRes.json() as { quoteSummary?: { result?: QS[] } };
        const qs = qsData?.quoteSummary?.result?.[0];
        if (qs) {
          // ── Quarterly results ─────────────────────────────────────────────
          const hist = qs.incomeStatementHistoryQuarterly?.incomeStatementHistory;
          if (hist?.length) {
            const div = isUS ? 1e6 : 1e7;
            quarterly_results = hist.slice(0, 4).map(q => {
              const rev = q.totalRevenue?.raw ?? null;
              const ni  = q.netIncome?.raw   ?? null;
              const revenue_cr    = rev != null ? +(rev / div).toFixed(0) : null;
              const net_income_cr = ni  != null ? +(ni  / div).toFixed(0) : null;
              const net_margin    = (rev && ni && rev > 0) ? +(ni / rev * 100).toFixed(1) : null;
              let quarter = q.endDate?.fmt ?? '';
              if (q.endDate?.raw) {
                const d  = new Date(q.endDate.raw * 1000);
                const mo = d.getUTCMonth() + 1;
                const yr = d.getUTCFullYear();
                if (isUS) {
                  quarter = `Q${mo <= 3 ? 1 : mo <= 6 ? 2 : mo <= 9 ? 3 : 4} ${yr}`;
                } else {
                  const qnum = mo <= 3 ? 4 : mo <= 6 ? 1 : mo <= 9 ? 2 : 3;
                  const fy   = mo <= 3 ? yr : yr + 1;
                  quarter = `Q${qnum} FY${String(fy).slice(-2)}`;
                }
              }
              return { quarter, revenue_cr, net_income_cr, net_margin };
            });
          }

          // ── Shareholding breakdown ────────────────────────────────────────
          const mh = qs.majorHoldersBreakdown;
          if (mh) {
            insider_pct     = mh.insidersPercentHeld?.raw     != null ? +(mh.insidersPercentHeld.raw * 100).toFixed(1)     : null;
            institution_pct = mh.institutionsPercentHeld?.raw != null ? +(mh.institutionsPercentHeld.raw * 100).toFixed(1) : null;
            if (insider_pct != null && institution_pct != null) {
              public_pct = +Math.max(0, 100 - insider_pct - institution_pct).toFixed(1);
            }
          }

          const ks  = qs.defaultKeyStatistics;
          const fd  = qs.financialData;
          const sd  = qs.summaryDetail;
          const cal = qs.calendarEvents;

          const targetMean = fd?.targetMeanPrice?.raw ?? null;
          const upsidePct  = (targetMean && price) ? +((targetMean - price) / price * 100).toFixed(1) : null;

          // Next earnings date
          let nextEarnings: string | null = null;
          let daysToEarnings: Num = null;
          const earningsDates = cal?.earnings?.earningsDate;
          if (earningsDates?.length) {
            const epochs = earningsDates.map(e => (e.raw ?? 0) * 1000).filter(e => e > Date.now());
            if (epochs.length) {
              const nearest = Math.min(...epochs);
              nextEarnings = new Date(nearest).toISOString().split('T')[0];
              daysToEarnings = Math.ceil((nearest - Date.now()) / 86_400_000);
            }
          }

          // Ex-dividend date
          let exDivDate: string | null = null;
          if (sd?.exDividendDate?.raw) {
            exDivDate = new Date(sd.exDividendDate.raw * 1000).toISOString().split('T')[0];
          }

          fund = {
            trailing_pe:      sd?.trailingPE?.raw       ? +sd.trailingPE.raw.toFixed(1)      : null,
            forward_pe:       sd?.forwardPE?.raw        ? +sd.forwardPE.raw.toFixed(1)       : null,
            price_to_book:    sd?.priceToBook?.raw      ? +sd.priceToBook.raw.toFixed(2)     : null,
            ev_ebitda:        ks?.enterpriseToEbitda?.raw ? +ks.enterpriseToEbitda.raw.toFixed(1) : null,
            price_to_sales:   sd?.priceToSalesTrailing12Months?.raw ? +sd.priceToSalesTrailing12Months.raw.toFixed(2) : null,
            beta:             (ks?.beta?.raw ?? sd?.beta?.raw) ? +((ks?.beta?.raw ?? sd?.beta?.raw)!).toFixed(2) : null,
            revenue_growth:   fd?.revenueGrowth?.raw    ? +(fd.revenueGrowth.raw * 100).toFixed(1)   : null,
            earnings_growth:  fd?.earningsGrowth?.raw   ? +(fd.earningsGrowth.raw * 100).toFixed(1)  : null,
            gross_margin:     fd?.grossMargins?.raw     ? +(fd.grossMargins.raw * 100).toFixed(1)     : null,
            operating_margin: fd?.operatingMargins?.raw ? +(fd.operatingMargins.raw * 100).toFixed(1) : null,
            net_margin:       fd?.profitMargins?.raw    ? +(fd.profitMargins.raw * 100).toFixed(1)    : null,
            roe:              fd?.returnOnEquity?.raw   ? +(fd.returnOnEquity.raw * 100).toFixed(1)   : null,
            debt_to_equity:   fd?.debtToEquity?.raw     ? +fd.debtToEquity.raw.toFixed(1)            : null,
            current_ratio:    fd?.currentRatio?.raw     ? +fd.currentRatio.raw.toFixed(2)            : null,
            dividend_yield:   sd?.dividendYield?.raw    ? +(sd.dividendYield.raw * 100).toFixed(2)   : null,
            payout_ratio:     sd?.payoutRatio?.raw      ? +(sd.payoutRatio.raw * 100).toFixed(1)     : null,
            ex_div_date:      exDivDate,
            market_cap:       sd?.marketCap?.raw        ?? null,
            analyst_count:    fd?.numberOfAnalystOpinions?.raw ?? null,
            analyst_consensus: fd?.recommendationKey    ?? null,
            analyst_target:   targetMean ? +targetMean.toFixed(2) : null,
            analyst_target_high: fd?.targetHighPrice?.raw ? +fd.targetHighPrice.raw.toFixed(2) : null,
            analyst_target_low:  fd?.targetLowPrice?.raw  ? +fd.targetLowPrice.raw.toFixed(2)  : null,
            upside_to_target: upsidePct,
            next_earnings_date: nextEarnings,
            days_to_earnings:   daysToEarnings,
            short_pct_float:  ks?.shortPercentOfFloat?.raw ? +(ks.shortPercentOfFloat.raw * 100).toFixed(1) : null,
            short_ratio:      ks?.shortRatio?.raw           ? +ks.shortRatio.raw.toFixed(1)                 : null,
          };
        }
      } catch { /* quoteSummary failed — return technicals only */ }
    }


    // ─── Signal strings ───────────────────────────────────────────────────────
    const signals: string[] = [];
    // Supertrend first — strongest directional signal
    // Supertrend direction NOT added to signals[] — redundant with EMA+MACD for scoring.
    // supertrend_value exposed separately as a dynamic trailing stop reference in UI.
    if (price && ema200v) signals.push(price >= ema200v ? 'ABOVE 200 EMA · Long-term bullish' : 'BELOW 200 EMA · Long-term bearish — caution');
    if (price && ema50v)  signals.push(price >= ema50v  ? 'ABOVE 50 EMA · Medium-term trend positive' : 'BELOW 50 EMA · Medium-term momentum weak');
    if (rsi14 != null) {
      if (rsi14 < 35)      signals.push(`RSI OVERSOLD (${rsi14.toFixed(0)}) · Watch for reversal`);
      else if (rsi14 > 70) signals.push(`RSI OVERBOUGHT (${rsi14.toFixed(0)}) · Momentum extended`);
    }
    if (macd != null) signals.push(macd > 0 ? 'MACD POSITIVE · Short-term bullish' : 'MACD NEGATIVE · Short-term bearish');
    if (fund?.days_to_earnings != null && fund.days_to_earnings <= 14)
      signals.push(`⚠ EARNINGS IN ${fund.days_to_earnings}d — binary risk, size accordingly`);
    if (fund?.upside_to_target != null)
      signals.push(fund.upside_to_target >= 15 ? `ANALYST TARGET +${fund.upside_to_target}% upside — bullish consensus`
        : fund.upside_to_target < -10 ? `ANALYST TARGET ${fund.upside_to_target}% — stock above consensus, risk elevated`
        : `ANALYST TARGET ${fund.upside_to_target > 0 ? '+' : ''}${fund.upside_to_target}% vs current price`);
    if (fund?.short_pct_float != null && fund.short_pct_float > 20)
      signals.push(`HIGH SHORT INTEREST (${fund.short_pct_float}%) · Squeeze potential OR bearish consensus`);

    return Response.json({
      symbol, exchange,
      currency: m.currency ?? (isUS ? 'USD' : 'INR'),
      name: m.longName ?? m.shortName ?? symbol,
      price,
      change_pct: m.regularMarketChangePercent ?? null,
      prev_close: m.chartPreviousClose ?? null,
      ema20: ema20v, ema50: ema50v, ema200: ema200v,
      rsi14: rsi14 != null ? +rsi14.toFixed(1) : null,
      macd,
      bb_upper: bb ? +bb.upper.toFixed(2) : null,
      bb_lower: bb ? +bb.lower.toFixed(2) : null,
      bb_mid:   bb ? +bb.mid.toFixed(2)   : null,
      bb_pct: bbPct,
      atr14,
      high_52w: high52, low_52w: low52, from_52h: from52h,
      volume: m.regularMarketVolume ?? null,
      avg_volume: m.averageDailyVolume10Day ?? null,
      vol_ratio: volR,
      stop_loss: stopLoss, target1, target2,
      entry_low: entryLow, entry_high: entryHigh,
      supertrend_value: st?.value ?? null,
      supertrend_dir:   st?.direction ?? null,
      signals,
      quarterly_results,
      insider_pct, institution_pct, public_pct,
      ...(fund ?? {}),
    }, { headers: { 'Cache-Control': 'public, max-age=180, stale-while-revalidate=600' } });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
