# SignalGenie

ML-powered trading dashboard for India + US portfolio tracking, live signals, and algo tools.

**Live:** [signalgenie.ai](https://signalgenie.ai)

---

## What it does

- **India Portfolio** — NSE/BSE holdings, live P&L, signals, sector breakdown
- **US Portfolio** — Multi-broker (Plaid), live prices, momentum picks
- **ML Technical Scan** — RSI + EMA screener across 150+ NSE stocks, track record
- **Market Brief** — Nifty/Sensex/BankNifty, FII/DII flows, macro narrative
- **Forex & Commodities** — 9 pairs, 6 futures (MCX proxy), position tracker
- **Broker Connect** — Angel One (SmartAPI), US via Plaid (Investments)
- **Equity Comp** — RSU/ESPP tracker with vesting schedule
- **Capital Gains** — STCG/LTCG estimator from holdings + live prices
- **Paper Trading** — Virtual trades, algo builder, backtest engine
- **Watchlist** — Price alerts via web push notifications
- **IPO Calendar** — Upcoming listings
- **Admin Console** — Founder-only user stats, holdings overview, plan distribution

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15.5 App Router, TypeScript strict |
| Auth + DB | Supabase (RLS enforced) |
| Styling | CSS variables + inline styles |
| Prices | Yahoo Finance v8/v10 (no key needed) |
| LLM | Claude Sonnet (signals) · Grok 4.3 (market narrative) |
| Broker | Plaid (US) · Angel One SmartAPI (India) |
| Payments | Razorpay |
| Deploy | Vercel (edge + nodejs runtimes) |
| Mobile | PWA + Capacitor iOS |

---

## Monorepo structure

```
signal-app/
  apps/
    web/                    # Next.js app
      app/
        dashboard/          # All dashboard pages
        admin/              # Founder admin console
        api/                # Edge + Node API routes
        stocks/[symbol]/    # Public SEO stock pages
        sectors/[sector]/   # Public sector pages
        sign-in/            # Auth page
        auth/callback/      # OAuth callback
      components/           # Shared UI components
      lib/                  # Supabase client, hooks, types
      public/               # PWA assets, service worker
```

---

## Local dev

```bash
# Install
cd apps/web && npm install

# Env vars — copy and fill in
cp .env.example .env.local

# Run
npm run dev          # http://localhost:3000

# Type check
npx tsc --noEmit
```

### Required env vars

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, admin API

NEXT_PUBLIC_VAPID_PUBLIC_KEY=     # web push
VAPID_PRIVATE_KEY=
VAPID_EMAIL=

RAZORPAY_KEY_ID=                  # payments (add at launch)
RAZORPAY_KEY_SECRET=

CRON_SECRET=                      # secures Vercel cron endpoints
```

---

## Supabase tables

| Table | Purpose |
|---|---|
| `profiles` | User plan (free/starter/pro/elite/admin), expires_at |
| `portfolios` | Portfolio per user (NSE/BSE or NYSE/NASDAQ) |
| `holdings` | Stock positions — symbol, exchange, qty, avg_price |
| `watchlists` | Watchlist items per user |
| `scan_log` | ML scan history — price, RSI, 30d/60d outcomes |
| `equity_grants` | RSU/ESPP grants and vesting |
| `push_subscriptions` | Web push endpoints per user |
| `angel_connections` | Angel One session tokens (AES-256-GCM encrypted) |
| `broker_connections` | Plaid item IDs per user |

---

## Plan tiers

`free` → `starter` → `pro` → `elite` → `admin`

Founders (`gsaiganesh@gmail.com`, `bskumar.obiee@gmail.com`) hardcoded to `admin` — bypasses DB.

| Feature | Min plan |
|---|---|
| Unlimited scan results | starter |
| US multi-portfolio | pro |
| Algo builder / Backtest | pro |
| ESPP & RSU tracker | pro |
| Admin console | admin |

---

## Deployment

Deployed on Vercel. Push to `main` → auto-deploy.

```bash
git add <files>
git commit -m "feat: description"
git push
```

Vercel crons (defined in `vercel.json`):
- `scan-log/backfill` — daily 12:00 UTC
- `push/check-alerts` — every 15 min during market hours

---

## Legal

NOT SEBI registered · NOT SEC registered · Algorithmic scan output only — not investment advice · DYOR

See [Risk Disclosure](https://signalgenie.ai/risk) · [Privacy Policy](https://signalgenie.ai/privacy)
