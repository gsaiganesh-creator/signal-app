# Native Mobile App — Phase 1 — Design

Date: 2026-07-13

## Context

The current mobile experience is `apps/web/ios` — a Capacitor wrapper rendering the live web
app (`https://signalgenie.ai`) inside a native WKWebView container. A prior attempt at a genuine
native app, `apps/signal-mobile` (React Native/Expo), was removed on 2026-07-12 after its UI
drifted from the web redesign and was never kept in sync — a maintenance failure, not a
technology failure.

Despite Capacitor now working correctly (a persistent-browser-chrome bug from misconfigured
`limitsNavigationsToAppBoundDomains` was fixed, then found to actually be a Safari/SFSafari
rendering issue traced and resolved separately), the decision is to build a real native app
anyway. Driving reasons: native-only capabilities Capacitor's WebView can't provide well
regardless of configuration, App Store review risk perception (Guideline 4.2, "Minimum
Functionality" — WebView wrappers read as low-effort even when they work correctly), and
wanting to present the product as genuinely native rather than a web wrapper.

## Goals

- A real React Native (Expo) app, in a new `apps/mobile/` folder, covering Phase 1 scope: Auth,
  Home dashboard, Signals, Portfolio (India), US Portfolio.
- Reuse the existing Supabase backend (auth, RLS-scoped tables) and existing Next.js API routes
  — no new backend, no data-layer duplication.
- A shared `packages/design-tokens` package so brand colors/spacing/typography have one source
  of truth across `apps/web` and `apps/mobile`, directly addressing why `signal-mobile` drifted
  last time.

## Non-goals

- Not deprecating or modifying `apps/web/ios` (Capacitor) — it stays live and untouched. Cutover
  from Capacitor to native, if it ever happens, is a separate future decision made once Phase 1
  native reaches parity and proves itself, not part of this build.
- Not covering any screen beyond the 5 listed above in this phase. Forex, commodities, paper
  trading, algo builder, backtest, capital gains, equity comp, IPO calendar, sectors, FII/DII,
  earnings, dividends, track record, upgrade/billing, and everything else stays web/Capacitor-
  only until a future phase (each future phase gets its own spec, following this same pattern —
  not pre-planned here).
- Not building Android-specific native modules or platform-specific UI beyond what Expo/React
  Native gives for free — Phase 1 targets both platforms through the same codebase, no per-
  platform divergence unless a specific screen genuinely needs it (not anticipated for this
  scope).
- Not syncing component-level UI code between web and native — architecturally impossible (DOM
  vs native views are different rendering targets). `design-tokens` closes the *values* gap
  (colors, spacing) only, not component implementation.

## Architecture

```
apps/mobile/                  — new Expo app (React Native, TypeScript, Expo Router)
  app/
    (auth)/
      sign-in.tsx
      sign-up.tsx
    (app)/
      _layout.tsx              — bottom tab navigator: Home | Signals | Portfolio | US Portfolio
      index.tsx                 (Home dashboard)
      signals.tsx
      portfolio/index.tsx
      us-portfolio/index.tsx
  lib/
    supabase.ts                — same Supabase project, @supabase/supabase-js client
  package.json                 — new workspace member, added to root package.json workspaces

packages/design-tokens/        — new shared package
  colors.ts                    — extracted from apps/web/app/globals.css CSS variables
  spacing.ts
  typography.ts
  index.ts
  package.json

apps/web/                      — UNCHANGED. globals.css keeps its CSS vars as source values;
                                  design-tokens mirrors them (manual sync when the palette
                                  itself changes — rare, unlike per-screen component drift).
```

**Auth:** `apps/mobile` uses the same Supabase project as `apps/web` — same `auth.users`, same
`profiles` table, same RLS policies. A user signed in on web and mobile is the same account, no
new user model. `@supabase/supabase-js` works identically in React Native (uses `AsyncStorage`
for session persistence instead of browser `localStorage` — the only platform difference).

**Data:** No new API routes. `apps/mobile` calls the existing `apps/web` Next.js API routes
(`/api/stock-detail`, `/api/prices`, `/api/ml/signals/[ticker]`, etc.) over HTTPS against
`https://signalgenie.ai`, exactly as the web app's own client-side code does today. Holdings/
portfolio data comes directly from Supabase REST (same pattern as `apps/web`'s
`portfolio-context.tsx`), not proxied through anything new.

**Design tokens:** `packages/design-tokens` exports plain TypeScript constants mirroring
`globals.css`'s CSS variables (`--bg #070D1A` → `colors.bg`, `--grn #00D4A0` → `colors.grn`,
etc.) — a one-time extraction, then manually kept in sync going forward (the palette itself
changes rarely; this is not attempting to solve component-level drift, only value-level).
`apps/mobile`'s React Native `StyleSheet` definitions import from this package instead of
hardcoding hex values. `apps/web` is not required to switch off its native CSS variables to use
this package (that would be unrelated scope creep) — the package exists so `apps/mobile` has a
correct source to import from, not to change how `apps/web` works today.

## Testing

No automated test infra exists elsewhere in this codebase (consistent throughout). Verify by
running the Expo app in a simulator/real device for each of the 5 Phase 1 screens: sign in with
a real test account, confirm Home/Signals/Portfolio/US Portfolio each load real data matching
what the same account sees on web, confirm sign-out and re-auth work, confirm colors/spacing
visually match the design-tokens values (spot-check a few, not pixel-perfect automated
comparison).
