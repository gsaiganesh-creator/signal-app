# Native App Shell — Design

Date: 2026-07-13

## Context

`apps/signal-mobile` (a standalone Expo/React Native app with its own hand-built UI) was
removed today (`0404002`) because it was a second, divergent codebase that drifted out of sync
with the web redesign — anyone building from it got the old first-version design. The remaining
mobile presence is `apps/web/ios` and (per `eacd9ff`) an Android Capacitor platform: both render
the live Next.js web app directly inside a WebView, so they always match web by construction.

The product owner wants "more of an app" — native feel, native-only capabilities (push,
biometric login), and confidence the app won't be rejected by Apple's App Store review — without
reintroducing the divergent-codebase problem `signal-mobile` caused.

Apple's actual rejection pattern here is Guideline 4.2 (Minimum Functionality): apps that are
"merely a repackaged website" get rejected. Capacitor apps pass review routinely — they need
genuine native functionality layered on top of the web content, not a UI rewrite.

## Goals

- Native tab bar / bottom navigation shell on both iOS and Android, replacing the in-page web
  bottom nav when running natively.
- Real native push notifications (APNs/FCM), not web push.
- Biometric app-lock (Face ID/Touch ID on iOS, BiometricPrompt on Android).
- Haptic feedback on key actions.
- Ship on both platforms together (not iOS-first, Android-later).
- Pass App Store / Play Store review cleanly, including avoiding an In-App Purchase rejection.
- Zero duplication of UI/content — the single Next.js web codebase remains the only source of
  truth for every screen's content, exactly as `apps/web/ios`/Android Capacitor already work
  today. This spec only adds a native chrome layer and native capability plugins around that
  existing WebView, it does not rebuild any screen natively.

## Non-goals / out of scope (this phase)

- **Home-screen widget** (live P&L on lock/home screen) — parked. Needs a separate WidgetKit
  (iOS) / App Widget (Android) target and App Group data sharing; real extra native work with
  its own scope. Revisit once the shell + capabilities ship and prove worth it.
- **Per-screen native rebuilds** (e.g. a fully native Dashboard or Portfolio screen with native
  list cells/charts) — this is "Approach C" from the design conversation, a plausible future
  evolution once specific screens are known to be worth the native investment, not part of this
  phase.
- **Real Apple/Google In-App Purchase integration** — explicitly rejected in favor of hiding the
  upgrade flow in-app (see below). Revisit only if there's a specific reason to want native
  purchases despite the 15-30% platform cut.
- Automatic App Store / Play Store submission — this spec covers building a compliant app; actual
  store listing creation, screenshots, and submission are manual ops steps, not covered here.

## Architecture

### Shell: native tab bar, single WebView

Capacitor already loads the live web app in one WebView per platform. Rather than a multi-WebView
or per-tab-reload architecture, this spec adds a **native tab bar as a chrome overlay** around
that single WebView:

- iOS: a native `UITabBar` (SwiftUI `TabView` or UIKit `UITabBarController`) sits below the
  Capacitor `WKWebView`.
- Android: a native `BottomNavigationView` (Jetpack Compose or XML) sits below the Capacitor
  `WebView`.
- Tab set mirrors the web PWA's existing `MobileBottomNav.tsx` primary tabs exactly: Home,
  Signals, Portfolio, Dividends. No new IA — this reuses what's already defined and tested on
  web, avoiding a second navigation structure to keep in sync.
- Tapping a native tab sends a message to the WebView (Capacitor's `Bridge`/custom plugin, or a
  simple `webView.loadUrl`/`window.location` navigation) to load the corresponding route inside
  the existing WebView. The tab bar itself never renders content — it only drives navigation.
- The web app's own `MobileBottomNav` component must be hidden when running inside Capacitor, to
  avoid two stacked nav bars. Detect via `Capacitor.isNativePlatform()` (already available via
  `@capacitor/core`, no new dependency) in `apps/web/components/MobileBottomNav.tsx` — render
  `null` when native.

### Capability 1: Push notifications (APNs + FCM via Firebase)

- Route both platforms through **Firebase Cloud Messaging** rather than maintaining separate
  direct-APNs and direct-FCM integrations — FCM can deliver to APNs under the hood, so this is
  one backend integration covering both platforms.
- Native apps register a device token via Capacitor's official `@capacitor/push-notifications`
  plugin on first launch (after notification permission grant).
- New Supabase table `native_push_tokens` (`user_id`, `platform` ('ios'|'android'), `fcm_token`,
  `created_at`, `updated_at`) — kept separate from the existing `push_subscriptions` table (which
  holds web-push subscription objects, a different shape) rather than overloading one table with
  two incompatible schemas. RLS: a user can insert/update/delete only their own row
  (`auth.uid() = user_id`), matching the existing `profiles: own` policy pattern
  (`supabase/rls_apply.sql`); the backend's `firebase-admin` send job reads via the service-role
  key, which bypasses RLS as usual for scheduled jobs in this codebase.
- Backend: add `firebase-admin` to `apps/api/requirements.txt`. Extend
  `apps/api/core/price_alerts.py`'s `run_price_alerts_check()` to also send via FCM to any
  matching `native_push_tokens` rows, alongside the existing `pywebpush` send to
  `push_subscriptions` — same trigger conditions, two delivery channels.

### Capability 2: Biometric app-lock

- Community Capacitor plugin (e.g. `capacitor-native-biometric`) gates app access on cold launch
  and on resuming from background.
- This is an **app-lock screen**, not a session-decryption mechanism — Supabase's session already
  persists correctly inside the WebView's localStorage/IndexedDB via `supabase-js`, unaffected by
  this change. On successful biometric auth, the native lock screen is simply dismissed, revealing
  the already-authenticated WebView underneath. No changes to the existing auth flow
  (`portfolio-context.tsx`, `onAuthStateChange`) are needed.
- Toggleable in app settings (default on, matching common banking/finance-app UX expectations);
  users without biometric hardware or who decline the OS permission fall back to no lock (not a
  PIN entry — out of scope, revisit only if requested).

### Capability 3: Haptics

- `@capacitor/haptics` (official plugin, already Capacitor-maintained). Wire into a small,
  specific set of moments: price alert fired, paper trade logged, successful sign-in via
  biometric. Not a broad "haptics everywhere" pass — a handful of meaningful touchpoints.

### App Store compliance: hiding the upgrade flow

`apps/web/app/dashboard/upgrade/page.tsx` uses Razorpay for paid plan purchases. Apple Guideline
3.1.1 requires any in-app digital subscription purchase to go through Apple's In-App Purchase
system — an externally-processed purchase flow reachable from inside an iOS app is a common,
well-documented rejection reason.

**Decision: hide the upgrade flow entirely when running natively**, rather than build real
Apple/Google IAP. Concretely:

- `DashboardNavContext.tsx`'s `home`/`account` tab links to `/dashboard/upgrade` and any
  "Upgrade to Pro" CTA banners/badges elsewhere in the dashboard get conditionally hidden when
  `Capacitor.isNativePlatform()` is true.
- The `/dashboard/upgrade` route itself stays live and reachable via direct URL (so a user who
  navigates there manually, or via the mobile browser, isn't blocked) — only the in-app
  navigation entry points are hidden. This matches the pattern used by apps like Netflix/Spotify:
  the app doesn't broker purchases at all, users manage billing on the website.
- No backend changes needed for this — it's a frontend conditional-render change plus (optional,
  not required for compliance) a small note somewhere in-app: "Manage your subscription at
  signalgenie.ai".

## Platforms

Both iOS and Android built together, not phased. Both already have Capacitor platform folders
(`apps/web/ios`, and per `eacd9ff` an Android platform) — this spec extends both rather than
starting either from scratch.

## Testing

No automated test infrastructure exists for native shell/plugin code in this repo (consistent
with the rest of the project). Verify by:

- Running the app on a physical iOS device (Face ID/Touch ID and push notifications don't
  function correctly in the iOS Simulator) and a physical or emulated Android device.
- Confirming the native tab bar navigates the underlying WebView correctly for all 4 tabs.
- Confirming `MobileBottomNav` does not render when `Capacitor.isNativePlatform()` is true (visual
  check — no doubled nav bar).
- Confirming the Upgrade tab/CTAs are absent from the native app's navigable UI, and that
  `/dashboard/upgrade` still works if reached directly (e.g. via a deep link), to confirm this is
  a hidden-entry-point, not a broken/removed page.
- Triggering a test price alert and confirming push arrives via FCM on both a real iOS device and
  a real Android device.
- Backgrounding and resuming the app, confirming the biometric lock screen appears and correctly
  dismisses on successful Face ID/Touch ID/BiometricPrompt.

## Out of scope (future)

- Home-screen widget (parked, see Non-goals).
- Per-screen native rebuilds for highest-traffic screens (Approach C from the design discussion).
- Real Apple/Google In-App Purchase integration.
- Store listing creation and submission (App Store Connect / Play Console ops work).
