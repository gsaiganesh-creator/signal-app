# Dokploy Schedules — signalgenie.ai

Reference for every scheduled job across both Dokploy apps. Set these up in the
Dokploy UI (https://dok.texcrux.com → app → Schedules tab), not in `vercel.json`
(that file is dead — this deployment runs on a VPS via Dokploy, not Vercel).

Schedules run as a shell command **inside the target app's own running container**
(not an external HTTP hit), so commands use `localhost` and there's no Cloudflare
proxy timeout to worry about. The container has no `curl`, so use `wget -qO-`.

---

## App: Signal_FrontEnd (`signal-signalfrontend-1o9uuy`)

The Next.js app serving signalgenie.ai. All `/api/cron/*` and other cron-style
routes live here (`apps/web/app/api/...`). This app is running continuously.

| Name | Cron (UTC) | IST equivalent | Command |
|---|---|---|---|
| `sentiment-scan` | `*/3 2-3 * * 1-5` | every 3 min, 7:30–9:29 AM, Mon–Fri | `wget -qO- "http://localhost:3000/api/cron/sentiment-scan?secret=xsentiment"` |
| `sentiment-scan-backfill` | `0 4 * * *` | 9:30 AM daily | `wget -qO- "http://localhost:3000/api/cron/sentiment-scan/backfill"` |
| `scan-log-backfill` | `0 12 * * *` | 5:30 PM daily | `wget -qO- "http://localhost:3000/api/scan-log/backfill"` |
| `push-check-alerts` | `*/15 3-10 * * 1-5` | every 15 min, 8:30 AM–3:45 PM, Mon–Fri | `wget -qO- "http://localhost:3000/api/push/check-alerts?secret=xsentiment"` |

Notes:
- `sentiment-scan` is self-batching — processes ~10 symbols per call, skips
  symbols already logged today, reports `remaining` in its JSON response.
  Fires every 3 min for ~2 hours to work through up to 200 symbols/day.
  Route: `apps/web/app/api/cron/sentiment-scan/route.ts`
- `sentiment-scan-backfill` fills in 7-day/30-day outcome prices for accuracy
  tracking — fully decoupled, never blocks the scan above.
  Route: `apps/web/app/api/cron/sentiment-scan/backfill/route.ts`
- `scan-log-backfill` and `push-check-alerts` are pre-existing crons that were
  never actually wired up on this VPS before (only existed in the now-dead
  `vercel.json` from when this was still Vercel-deployed).
- The `xsentiment` secret was set as `CRON_SECRET` via Dokploy's env vars for
  Signal_FrontEnd — rotate it if it's ever exposed outside this file.

---

## App: Signal_BackEnd (`signal-signalbackend-bkup7s`)

Python FastAPI backend (`apps/api/`). **Not currently deployed — 0 running
containers as of 2026-07-05.** No schedules exist for it yet because there's
nothing running to schedule against.

If/when this gets deployed, add its schedules here following the same format
as above (target `http://localhost:<port>/...` inside its own container).

| Name | Cron (UTC) | Command |
|---|---|---|
| _(none yet — apps/api not deployed)_ | — | — |

---

## Adding a new schedule

1. Dokploy UI → pick the app (Signal_FrontEnd or Signal_BackEnd) → Schedules tab → Create Schedule
2. Shell type: `bash`
3. Command: `wget -qO- "http://localhost:<port>/api/..."` (add `?secret=...` if the route checks `CRON_SECRET`)
4. Update this file in the same PR/commit as the route change, so the two never drift apart
