# SIGNAL — Claude Code Context File
> Read this first. Every conversation in this project should start with this context.

## What is SIGNAL?
SIGNAL is an ML-powered stock trading signal platform for retail investors. It provides:
- Random Forest ML buy/sell/hold signals for NSE, BSE, and (coming) US markets
- Portfolio analysis with ML classification (Momentum / Swing / Long Term / Exit)
- Algo Builder — no-code strategy builder with code generation + backtesting
- Paper Trading — risk-free virtual trading on live market data
- Account Aggregator (AA) sync — RBI-regulated, pulls all investments automatically
- Public track record — every signal posted on Twitter with full P&L accountability

**NOT SEBI registered. All signals are for informational/educational purposes only.**

## Founders
- **Sai Ganesh Gella** — Co-Founder & CEO
- **Sai Kumar Bethala** — Co-Founder & CTO

## Design Reference
All HTML design files are in `/design/` folder. These are the exact visual spec — match colors, layout, spacing, and interactions precisely when converting to React Native or Next.js.

---

## Tech Stack

### Mobile App (apps/mobile/)
- React Native + Expo SDK 51
- TypeScript
- Zustand (state management)
- React Query (data fetching)
- Expo Router (navigation)

### Website (apps/web/)
- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Supabase Auth (Google + Twitter/X OAuth + email OTP)
- React Query

### Backend API (apps/api/)
- Node.js + Express
- Supabase (Postgres DB + Realtime + Auth)
- mStock API (live NSE/BSE data — free, existing broker)
- Zerodha Kite API (future — when subscribed)
- Python ML service on Hugging Face Spaces
- Razorpay (subscriptions)
- Resend (transactional emails)
- Twitter API v2 (auto-post signals)

---

## Design System

### Colors (use these EXACTLY — no substitutions)
```
--bg:    #070D1A   /* page background */
--surf:  #0E1628   /* card background */
--surf2: #162038   /* input / secondary surface */
--bdr:   #1C2E4A   /* borders */
--txt:   #FFFFFF   /* primary text */
--dim:   #7A8BAA   /* secondary text */
--dim2:  #3A4E6A   /* muted text */
--blu:   #1740F5   /* primary blue */
--bluL:  #4F6FFA   /* light blue / links */
--org:   #FF5C1A   /* orange / accent */
--grn:   #00D4A0   /* green / positive / BUY */
--red:   #FF3B5C   /* red / negative / SELL */
--ylw:   #FFB800   /* yellow / warning / HOLD */
--pur:   #8B5CF6   /* purple / paper trading */
```

### Typography
- Font: Inter (weights: 400, 500, 600, 700, 800, 900)
- Monospace: JetBrains Mono (code blocks, prices, tickers)
- No emoji in UI unless brand uses them

### Signal colors
- BUY / positive → `--grn` (#00D4A0)
- SELL / negative → `--red` (#FF3B5C)
- HOLD / neutral  → `--ylw` (#FFB800)
- Paper Trading   → `--pur` (#8B5CF6)

---

## Database Schema (Supabase)

```sql
profiles         -- user accounts (id, name, plan, plan_expiry, country, currency)
signals          -- all fired signals (symbol, type, confidence, entry, target, sl, outcome)
portfolios       -- user holdings (user_id, symbol, quantity, avg_price, market, broker)
paper_strategies -- algo strategies in paper trade mode (user_id, config, virtual_cash)
paper_trades     -- individual paper trade log (strategy_id, symbol, signal, pnl)
broker_tokens    -- encrypted OAuth tokens (user_id, broker, access_token, expires_at)
subscriptions    -- Razorpay subscription records (user_id, plan, status, currency)
```

---

## Internationalisation (i18n) Architecture

### Core principle: market-agnostic data model
All data must be stored with explicit market and currency fields. NEVER hardcode ₹ or $ symbols in backend or database. Format at the display layer only.

### Market types
```typescript
type Market = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ' | 'MCX'
type Currency = 'INR' | 'USD' | 'SGD' | 'AED' | 'GBP'
type Country = 'IN' | 'US' | 'SG' | 'AE' | 'GB'
```

### portfolios table — market-aware
```sql
ALTER TABLE portfolios ADD COLUMN market text DEFAULT 'NSE';
ALTER TABLE portfolios ADD COLUMN currency text DEFAULT 'INR';
ALTER TABLE portfolios ADD COLUMN broker_country text DEFAULT 'IN';
-- A user can have BOTH NSE stocks AND NYSE stocks in their portfolio
-- Indian user investing via Vested/INDmoney: market='NYSE', currency='USD', broker_country='IN'
```

### User locale detection — how it works
```typescript
// 1. On signup, detect from IP + browser locale
// 2. User can manually override in Settings
// 3. Store in profiles: { country: 'IN', currency: 'INR', locale: 'en-IN' }
// 4. All price display uses this — never hardcode ₹ or $

// Currency formatter utility — use everywhere
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(
    currency === 'INR' ? 'en-IN' : 'en-US',
    { style: 'currency', currency, maximumFractionDigits: 0 }
  ).format(amount);
  // INR: ₹2,34,567  |  USD: $2,345
}

// Subscription prices by currency
export const PLANS = {
  starter: { INR: 199,  USD: 2.99 },
  pro:     { INR: 599,  USD: 6.99 },
  elite:   { INR: 1499, USD: 17.99 },
};
```

### Unified portfolio — Indian user with US stocks
```typescript
// A single user can hold both NSE and US stocks
// Aggregate their total wealth in their home currency
interface PortfolioHolding {
  symbol:        string;      // 'RELIANCE' or 'AAPL'
  market:        Market;      // 'NSE' or 'NYSE'
  currency:      Currency;    // 'INR' or 'USD'
  quantity:      number;
  avg_price:     number;      // stored in local currency
  current_price: number;      // from live data feed
  broker:        string;      // 'mstock' | 'zerodha' | 'vested' | 'indmoney'
}

// When displaying total portfolio value to Indian user:
// NSE holdings in INR + (NYSE holdings in USD × live USD/INR rate)
// Show breakdown: "₹12,40,000 (NSE) + ₹3,20,000 equivalent (US via Vested)"
```

### Market data sources by market
```typescript
const DATA_SOURCES = {
  NSE:    'mstock',           // free — existing broker
  BSE:    'mstock',           // free
  NYSE:   'alphaVantage',     // free tier: 25 API calls/day
  NASDAQ: 'alphaVantage',     // same
  // Upgrade path: Polygon.io ($29/mo) for real-time US data
};
```

---

## ML Model — Multi-Market Strategy

### Phase 1 (NOW): India only
- 15 parameters: RSI, MACD, EMA, Bollinger, ADX, ATR, OBV, Delivery%, Stochastic, Volume Surge, FII/DII, Twitter Sentiment, Beta, Earnings, Sector Momentum
- Training data: 5Y NSE/BSE OHLCV via yfinance (free)
- Model: RandomForestClassifier (200 trees, max_depth=8)
- Hosted: Hugging Face Spaces (free)

### Phase 2 (US markets — adapt, don't rebuild):
```python
# India-specific params → US equivalents
PARAM_MAP = {
  'delivery_pct':  'dark_pool_pct',     # NSE delivery% → US dark pool volume %
  'fii_dii_flow':  'options_flow',      # FII/DII → Put/Call ratio + COT report
  'sector_index':  'gics_etf_return',   # NIFTY IT → XLK (tech ETF) return
}

# US-only additional params
US_EXTRA_PARAMS = [
  'short_interest_pct',    # % of float sold short
  'earnings_whisper',      # analyst whisper vs consensus EPS
  'fed_rate_sensitivity',  # beta to 10Y treasury yield
  'options_iv_percentile', # implied volatility rank
]

# The core RF model structure stays identical — only features change
# Train separate models: model_IN.pkl and model_US.pkl
# Backend picks model based on signal.market field
```

### Model serving — market-aware
```python
@app.route('/predict', methods=['POST'])
def predict():
    market = request.json.get('market', 'NSE')
    model  = model_US if market in ['NYSE','NASDAQ'] else model_IN
    # ... rest of prediction logic
```

---

## Website i18n Content Strategy

### DO — keep content generic
- "Stock signals" not "NSE signals" in hero headlines
- "Your portfolio" not "Your NSE portfolio"
- Use `{currency}` tokens in pricing tables, not hardcoded ₹
- Market data section: label clearly "India (NSE/BSE)" and "US (NYSE/NASDAQ)"

### DON'T
- Never hardcode ₹ in component JSX — always use `formatPrice(amount, userCurrency)`
- Never hardcode "NSE" in generic UI labels
- Never assume Delivery% exists — it's India-only, show only for NSE/BSE stocks

### Content that IS India-specific (clearly label it)
- Delivery % indicator → label: "NSE Delivery %" with 🇮🇳 tag
- FII/DII flow → label: "India Institutional Flow (FII/DII)"  
- Account Aggregator → India-only feature, show "🇮🇳 India only"
- SEBI disclaimer → show for all users (affects Indian users primarily)

### Geo-aware landing page sections
```typescript
// Detect user country on landing page
// Show India-specific section (AA, FII/DII, mStock) only to IN users
// Show US-specific section (LRS investing, Vested/INDmoney) to IN users too
// Show generic section to all others
const { country } = useGeoLocation(); // IP-based
if (country === 'IN') showIndiaSections();
if (country === 'US') showUSSections();
```

---

## Subscription Pricing

| Plan    | INR/mo | USD/mo | Features |
|---------|--------|--------|---------|
| Free    | ₹0     | $0     | 5 stocks, 3 signals/week |
| Starter | ₹199   | $2.99  | 25 stocks, RF picks, Twitter sentiment |
| Pro     | ₹599   | $6.99  | Unlimited, Algo Builder, Paper Trading, broker sync |
| Elite   | ₹1,499 | $17.99 | Auto-execute, custom ML, priority support |

Billing: Monthly / Quarterly (-10%) / Half-yearly (-17%) / Annual (-25%)
Payment India: Razorpay (UPI, cards, net banking)
Payment Global: Stripe (cards, international)

---

## Brokers Supported

### India
- mStock (Mirae Asset) — primary, free API
- Zerodha Kite — future (₹2,000/mo API)
- Upstox — free API
- Angel One — free API
- HDFC Securities — free API
- Groww — free API

### US stocks from India (LRS)
- Vested Finance — free API
- INDmoney — Account Aggregator compatible
- Interactive Brokers — API available

### US (native)
- Alpaca Trading — free paper + live API
- TD Ameritrade / Schwab — future

---

## API Endpoints Reference

```
GET  /signals?market=NSE&limit=20     — latest signals
GET  /signals?market=NYSE&limit=20    — US signals (phase 2)
GET  /portfolio                       — all holdings (NSE + US combined)
POST /portfolio/upload                — Excel import
POST /broker/connect/:broker          — OAuth connect
GET  /market/quote/:symbol?market=NSE — live quote
GET  /market/quote/:symbol?market=NYSE
POST /algo/create                     — save strategy
POST /algo/:id/backtest               — run backtest
POST /paper-trade/create              — start paper strategy
PUT  /paper-trade/:id/params          — edit params anytime
POST /subscribe                       — Razorpay / Stripe subscription
POST /webhook/razorpay                — payment webhook
POST /webhook/stripe                  — Stripe webhook (future)
GET  /track-record?weeks=12           — public accuracy history
```

---

## Key Rules for ALL code in this project

1. **Never hardcode currency symbols** — always use `formatPrice(amount, currency)`
2. **Never hardcode market names** — use `market` field from data
3. **Always include market field** in signals, portfolios, and API calls
4. **SEBI disclaimer** must appear on every page that shows signals or pricing
5. **Row Level Security** — all Supabase queries must respect RLS, never use service key on frontend
6. **Encrypted broker tokens** — always AES-256 encrypt before storing in DB
7. **Paper trading = virtual only** — never place real orders from paper trade flow
8. **Signal accuracy** — always show confidence % and indicators, never just BUY/SELL alone
9. **No financial advice** — all copy must clarify signals are informational only

---

## Sample Users (for testing / mockups)
- Vaasudev Amitav (vaasudev@signal.in) — Indian user, NSE portfolio
- Abhay Vittal — MF/ETF focused user
- Harshit — Weekly scorecard reviewer
- Jaitik — Account Aggregator test user
- Test US user — NYSE portfolio via Vested
