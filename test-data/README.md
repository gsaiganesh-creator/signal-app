# Test Data — Upload & Parser Validation

## India Portfolio (`/dashboard/portfolio` → Upload CSV)

| File | Brokerage | Key column | Stocks |
|---|---|---|---|
| `india/zerodha_holdings.csv` | Zerodha Kite/Console | `Instrument`, `Avg. cost` | 15 |
| `india/angel_one_holdings.csv` | Angel One | `Stock Name`, `Avg. Cost Price` | 10 |
| `india/hdfc_securities_holdings.csv` | HDFC Securities | `Isin`, `Avg_Cost_Price` (underscore) | 10 |
| `india/upstox_holdings.csv` | Upstox | `Instrument`, `Avg. Cost` | 12 |
| `india/groww_holdings.csv` | Groww | `Symbol`, `Average Price` | 11 |
| `india/indmoney_holdings.csv` | INDMoney | `Trading Symbol`, `Average Buy Price` | 10 |
| `india/icicidirect_holdings.csv` | ICICI Direct | `Scrip Name`, `Avg Buy Rate` | 10 |

**Expected result**: all resolve to NSE symbols, avg_price populated, no 0-qty rows.

**HDFC note**: parser uses `Avg_Cost_Price` (per-unit cost), NOT `Investment_Value` — verify amounts match qty × price.

---

## US Portfolio (`/dashboard/us-portfolio` → Import File)

| File | Brokerage | Key column | Stocks |
|---|---|---|---|
| `us/schwab_holdings.csv` | Charles Schwab | `Symbol`, `Average Cost Basis` | 10 + Cash row (skip) |
| `us/fidelity_holdings.csv` | Fidelity | `Symbol`, `Cost Basis Per Share` | 8 |
| `us/etrade_holdings.csv` | E*TRADE | `Symbol`, `Cost Per Share` | 8 |
| `us/robinhood_holdings.csv` | Robinhood | `Symbol`, `Average Cost` | 10 |
| `us/webull_holdings.csv` | Webull | `Ticker`, `Average Cost` | 8 |

**Expected result**: symbols uppercase, qty > 0, avg_price > 0. Cash/Total rows skipped. Schwab file has 2-row header — parser must scan for symbol row.

---

## RSU / ESPP (`/dashboard/equity-comp` → Import from Broker)

| File | Brokerage | Type | Rows |
|---|---|---|---|
| `rsu-espp/schwab_equity_awards_rsu.csv` | Schwab Equity Awards | RSU | 8 QCOM grants |
| `rsu-espp/fidelity_netbenefits_rsu.csv` | Fidelity NetBenefits | RSU + ESPP | 8 RSU + 2 ESPP |
| `rsu-espp/etrade_rsu_espp.csv` | E*TRADE / Morgan Stanley | RSU + ESPP | 7 QCOM grants |
| `rsu-espp/ubs_rsu.csv` | UBS Financial | RSU | 6 GOOGL grants |
| `rsu-espp/computershare_espp.csv` | Computershare | ESPP | 5 AAPL ESPP |

**Expected result**: type = RSU or ESPP, symbol = valid ticker, shares > 0, grant_price > 0, vest_date parseable.

---

## Testing duplicate detection

Upload `rsu-espp/schwab_equity_awards_rsu.csv` → confirm import.
Upload same file again → all 8 rows should show red **DUPLICATE** badge, auto-deselected.
