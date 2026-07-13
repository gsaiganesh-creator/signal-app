# Native App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native tab-bar shell, push notifications, biometric app-lock, and haptics on top of the existing Capacitor iOS/Android apps — without touching how web content renders — and hide the in-app upgrade flow to stay compliant with Apple's IAP rules.

**Architecture:** One native tab bar (UIKit on iOS, `BottomNavigationView` on Android) sits below the existing single Capacitor WebView. Tapping a tab tells the WebView to navigate via a small JS bridge event; the web app's own `MobileBottomNav` hides itself when running natively so there's only one nav bar. Push, biometric, and haptics are added via Capacitor's plugin system (official plugins for push/haptics, a community plugin for biometric) — no new native screens, no content duplication.

**Tech Stack:** Capacitor 8.x, Swift/UIKit (iOS), Java (Android, matching the existing `MainActivity.java`), Next.js/TypeScript (web-side conditional rendering), Python/FastAPI + `firebase-admin` (backend push), Supabase (new table).

---

## File Structure

```
apps/web/
  components/MobileBottomNav.tsx          — MODIFY: hide when Capacitor.isNativePlatform()
  components/DashboardNavContext.tsx      — MODIFY: hide upgrade link when native
  package.json                            — MODIFY: add @capacitor/push-notifications,
                                             @capacitor/haptics, capacitor-native-biometric
  ios/App/App/
    AppDelegate.swift                     — MODIFY: programmatic root VC (ShellViewController)
    ShellViewController.swift             — NEW: native UITabBar + embedded CAPBridgeViewController
    Info.plist                            — MODIFY: remove UIMainStoryboardFile, add
                                             NSFaceIDUsageDescription, background push mode
    App.entitlements                      — NEW: aps-environment (push capability)
  android/app/src/main/java/com/signal/app/
    MainActivity.java                     — MODIFY: host BottomNavigationView + Bridge WebView
    ShellActivity.java                    — Actually not needed — MainActivity itself gets the
                                             tab bar added directly (Android doesn't need a
                                             separate container class the way iOS does)
  android/app/src/main/res/
    layout/activity_main.xml              — NEW: BottomNavigationView + WebView container
    menu/bottom_nav_menu.xml              — NEW: 4 tab items (Home, Signals, Portfolio, Dividends)
    values/strings.xml                    — MODIFY: tab labels
  android/app/src/main/AndroidManifest.xml — MODIFY: POST_NOTIFICATIONS + USE_BIOMETRIC permissions

apps/api/
  requirements.txt                        — MODIFY: add firebase-admin
  core/price_alerts.py                    — MODIFY: also send via FCM to native_push_tokens
  core/native_push.py                     — NEW: firebase-admin FCM send wrapper

supabase/
  schema.sql                              — MODIFY: add native_push_tokens table + RLS (reference)

docs/ (SQL to run manually, not committed as executable)
  — SQL given directly in Task 2, matching this repo's established convention for new tables
```

---

## Task 1: Hide native-only UI when running in Capacitor

**Files:**
- Modify: `apps/web/components/MobileBottomNav.tsx`
- Modify: `apps/web/components/DashboardNavContext.tsx`

- [ ] **Step 1: Read both files fresh**

Read `apps/web/components/MobileBottomNav.tsx` in full and `apps/web/components/DashboardNavContext.tsx`'s `TABS` array (specifically the `account` tab's `Upgrade` link) before editing — this session has seen both files change shape repeatedly; don't assume line numbers from any prior description.

- [ ] **Step 2: Add the native-platform hide to `MobileBottomNav.tsx`**

At the top of the component function body (after existing hooks, before the `return`), add:

```tsx
import { Capacitor } from '@capacitor/core';
```

(add to the top-of-file imports, alongside existing imports)

Then, as the first line inside the component function (or as an early return, matching however this component is structured — read it fresh and place correctly):

```tsx
if (Capacitor.isNativePlatform()) return null;
```

This makes the component render nothing at all when running inside the native iOS/Android shell, since the new native tab bar (Tasks 4 and 8) replaces it entirely there. On web/mobile-browser, `Capacitor.isNativePlatform()` returns `false` and behavior is unchanged.

- [ ] **Step 3: Hide the Upgrade nav entry when native**

In `DashboardNavContext.tsx`, find the `account` tab's `links` array containing `{ href: '/dashboard/upgrade', label: 'Upgrade' }` (exact label text may differ slightly — read fresh). Import `Capacitor` the same way, and filter that entry out when native:

```tsx
import { Capacitor } from '@capacitor/core';
```

Change the `account` tab's `links` from a static array to conditionally exclude the upgrade link:

```tsx
{
  key: 'account', label: 'Account',
  links: [
    { href: '/dashboard/upgrade',  label: 'Upgrade'         },
    // ...other existing links unchanged...
  ].filter(l => !(Capacitor.isNativePlatform() && l.href === '/dashboard/upgrade')),
},
```

Also grep the codebase for any other "Upgrade to Pro" / "Upgrade to Elite" CTA banners referencing `/dashboard/upgrade` (search `grep -rn "dashboard/upgrade" apps/web/app apps/web/components`) and wrap each with the same `Capacitor.isNativePlatform()` guard — do not leave a dangling promotional banner pointing at a hidden nav entry. List what you find and fix each one; if there are more than 3-4 occurrences, note them all in your commit message so the reviewer can check completeness.

- [ ] **Step 4: Verify**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -iE "MobileBottomNav|DashboardNavContext"
```
Must show zero output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/MobileBottomNav.tsx apps/web/components/DashboardNavContext.tsx
git commit -m "feat: hide web bottom nav and upgrade flow when running in native app shell"
```

---

## Task 2: `native_push_tokens` table

**Files:**
- Modify: `supabase/schema.sql` (reference copy, matches this repo's convention of keeping the schema dump reasonably in sync)

- [ ] **Step 1: Add the table definition to `schema.sql`**

Read the file's existing table definitions for formatting convention (see `profiles`, `portfolios`), then append a new section:

```sql
-- ─── N. NATIVE PUSH TOKENS ───────────────────────────────────
create table if not exists public.native_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('ios','android')),
  fcm_token   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, platform, fcm_token)
);
alter table public.native_push_tokens enable row level security;
drop policy if exists "native_push_tokens: own" on public.native_push_tokens;
create policy "native_push_tokens: own" on public.native_push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

(`drop policy if exists` before `create policy`, matching `supabase/rls_apply.sql`'s established idempotent convention in this repo.)

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add native_push_tokens table definition"
```

- [ ] **Step 3: Report the exact SQL to the user for manual execution**

This is not run automatically (no DB credentials in the implementer's environment, matching every other schema change this session) — the implementer subagent's final report must include the exact SQL block from Step 1 verbatim, clearly marked as "run once in Supabase SQL Editor."

---

## Task 3: Backend FCM push send

**Files:**
- Modify: `apps/api/requirements.txt`
- Create: `apps/api/core/native_push.py`
- Modify: `apps/api/core/price_alerts.py`

- [ ] **Step 1: Add dependency**

```
firebase-admin>=6.5.0
```
Append to `apps/api/requirements.txt`.

- [ ] **Step 2: Read `price_alerts.py` fully first**

Read `apps/api/core/price_alerts.py` in full — specifically `run_price_alerts_check()`'s structure (how it queries which alerts fired, and its existing `pywebpush`-based send loop) before writing `native_push.py`, so the new module's function signature genuinely fits the call site you'll add in Step 4.

- [ ] **Step 3: Write `apps/api/core/native_push.py`**

```python
"""FCM push notifications for the native iOS/Android app shell — parallels
the existing pywebpush-based web push in price_alerts.py, sent to
native_push_tokens instead of push_subscriptions. Requires a Firebase
service account JSON, path given by FIREBASE_CREDENTIALS_PATH env var."""
import logging
import os

logger = logging.getLogger(__name__)

_app = None


def _get_app():
    global _app
    if _app is not None:
        return _app
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    if not cred_path or not os.path.exists(cred_path):
        logger.warning("native_push: FIREBASE_CREDENTIALS_PATH not set or file missing, skipping")
        return None
    import firebase_admin
    from firebase_admin import credentials
    cred = credentials.Certificate(cred_path)
    _app = firebase_admin.initialize_app(cred)
    return _app


def send_native_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    """Sends the same alert to a batch of FCM tokens. Returns {"sent": n, "failed": n}."""
    app = _get_app()
    if app is None or not tokens:
        return {"sent": 0, "failed": len(tokens)}

    from firebase_admin import messaging

    sent = failed = 0
    for token in tokens:
        try:
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=token,
            )
            messaging.send(msg)
            sent += 1
        except Exception as e:
            logger.warning("native_push: failed for token %s...: %s", token[:12], e)
            failed += 1
    return {"sent": sent, "failed": failed}
```

- [ ] **Step 4: Wire into `run_price_alerts_check()`**

In `apps/api/core/price_alerts.py`, wherever the existing web-push send loop runs (after determining which alerts fired and for which `user_id`s), add a parallel native-push send. The exact insertion point depends on the function's real structure (read it fresh per Step 2) — the shape should be:

```python
from core.native_push import send_native_push
from core.supabase_rest import rest_get

# ... existing pywebpush loop stays unchanged ...

# Native push — same fired-alert set, different delivery channel
user_ids = [<the user_ids whose alerts fired, from the existing loop's data>]
if user_ids:
    id_filter = "(" + ",".join(user_ids) + ")"
    native_tokens = rest_get("native_push_tokens", {"select": "fcm_token", "user_id": f"in.{id_filter}"})
    tokens = [r["fcm_token"] for r in native_tokens]
    if tokens:
        send_native_push(tokens, title="Price Alert", body=<same alert message text used for web push>)
```

Match whatever variable names actually hold the fired-alert user IDs and message text in the real function — don't invent new plumbing, reuse what's already computed for the web-push path.

- [ ] **Step 5: Verify**

```bash
cd apps/api && source .venv/bin/activate 2>/dev/null || (python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && source .venv/bin/activate)
pip install -r requirements.txt
python3 -c "from core.native_push import send_native_push; print('import OK')"
python3 -c "from core.price_alerts import run_price_alerts_check; print('import OK')"
```
Both must succeed. Do NOT call `send_native_push` or `run_price_alerts_check` for real — no Firebase credentials exist in this environment, and the latter makes real notification sends.

- [ ] **Step 6: Commit**

```bash
git add apps/api/requirements.txt apps/api/core/native_push.py apps/api/core/price_alerts.py
git commit -m "feat: send native push via FCM alongside existing web push"
```

---

## Task 4: iOS native tab bar shell

**Files:**
- Create: `apps/web/ios/App/App/ShellViewController.swift`
- Modify: `apps/web/ios/App/App/AppDelegate.swift`
- Modify: `apps/web/ios/App/App/Info.plist`

- [ ] **Step 1: Write `ShellViewController.swift`**

```swift
import UIKit
import Capacitor

/// Native UITabBar chrome wrapping the single Capacitor WebView. Tapping a
/// tab does not swap view controllers — it posts a JS navigation event into
/// the existing bridge's webview, so there is exactly one WebView instance
/// for the app's lifetime (avoids reload flicker and keeps web-side state).
class ShellViewController: UIViewController, UITabBarDelegate {

    private let bridgeVC = CAPBridgeViewController()
    private let tabBar = UITabBar()

    private let tabs: [(title: String, route: String, icon: String)] = [
        ("Home",      "/dashboard",         "house"),
        ("Signals",   "/dashboard/signals", "chart.line.uptrend.xyaxis"),
        ("Portfolio", "/dashboard/portfolio","briefcase"),
        ("Dividends", "/dashboard/dividends","banknote"),
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        addChild(bridgeVC)
        view.addSubview(bridgeVC.view)
        bridgeVC.didMove(toParent: self)

        tabBar.delegate = self
        tabBar.items = tabs.enumerated().map { i, t in
            let item = UITabBarItem(title: t.title, image: UIImage(systemName: t.icon), tag: i)
            return item
        }
        tabBar.selectedItem = tabBar.items?.first
        view.addSubview(tabBar)

        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bridgeVC.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bridgeVC.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor),

            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let route = tabs[item.tag].route
        let js = "window.location.href = '\(route)';"
        bridgeVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}
```

- [ ] **Step 2: Update `AppDelegate.swift` to use it as the root view controller**

Change `didFinishLaunchingWithOptions` from:
```swift
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }
```
to:
```swift
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = ShellViewController()
        window?.makeKeyAndVisible()
        return true
    }
```

- [ ] **Step 3: Remove the storyboard-based launch from `Info.plist`**

Delete the `UIMainStoryboardFile` key and its `Main` string value (the two consecutive `<key>`/`<string>` lines) — the app now creates its root view controller programmatically in `AppDelegate`, so this key must be removed or iOS will still try to boot from `Main.storyboard` first. Leave `UILaunchStoryboardName`/`LaunchScreen` untouched — that's the launch splash screen, a separate concern from the root view controller and should stay storyboard-based.

- [ ] **Step 4: Add this new file to the Xcode project (MANUAL STEP — cannot be done reliably via text edit)**

`.pbxproj` is a fragile, UUID-referenced serialization format not safe to hand-edit via a text tool. After Step 1-3 are committed, tell the user (in your final report) to:
1. Open `apps/web/ios/App/App.xcworkspace` in Xcode.
2. Right-click the `App` group in the Project Navigator → "Add Files to App..." → select `ShellViewController.swift` → ensure "App" target checkbox is checked → Add.

- [ ] **Step 5: Attempt a real build to catch compile errors early**

```bash
cd apps/web/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug build 2>&1 | tail -60
```

This WILL fail at the "file not found" stage if Step 4's manual Xcode step hasn't happened yet (the new `.swift` file isn't in the compiled sources phase) — that's expected and not a sign of a code error. If it fails with a Swift syntax/type error instead (not a "file not in target"/"cannot find in scope" error implying the file simply isn't registered), that IS a real bug in `ShellViewController.swift` or `AppDelegate.swift` and must be fixed. Distinguish these two failure modes carefully and report which one you hit, if either.

- [ ] **Step 6: Commit**

```bash
git add apps/web/ios/App/App/ShellViewController.swift apps/web/ios/App/App/AppDelegate.swift apps/web/ios/App/App/Info.plist
git commit -m "feat: add native UITabBar shell around the Capacitor WebView (iOS)"
```

---

## Task 5: iOS push, biometric, haptics plugins

**Files:**
- Modify: `apps/web/package.json` (via npm install)
- Modify: `apps/web/ios/App/App/Info.plist`
- Create: `apps/web/ios/App/App/App.entitlements`

- [ ] **Step 1: Install Capacitor plugins**

```bash
cd apps/web
npm install @capacitor/push-notifications @capacitor/haptics capacitor-native-biometric
npx cap sync ios
```

- [ ] **Step 2: Add required Info.plist keys**

Add (as sibling `<key>`/`<string>` or `<key>`/`<true/>` pairs, matching the file's existing formatting) inside the top-level `<dict>`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>SignalGenie uses Face ID to quickly and securely unlock the app.</string>
```

Add background push support — inside a `<key>UIBackgroundModes</key>` array (create this key if absent):
```xml
<key>UIBackgroundModes</key>
<array>
	<string>remote-notification</string>
</array>
```

- [ ] **Step 3: Create the entitlements file**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>development</string>
</dict>
</plist>
```
Save as `apps/web/ios/App/App/App.entitlements`.

- [ ] **Step 4: MANUAL STEP — register the entitlements file and enable capabilities in Xcode**

Same reasoning as Task 4 Step 4 — `.pbxproj`'s `CODE_SIGN_ENTITLEMENTS` build setting and the "Push Notifications" + "Background Modes" capability toggles must be set via Xcode's Signing & Capabilities tab, not hand-edited. Tell the user in your final report:
1. Open `App.xcworkspace` → select `App` target → Signing & Capabilities tab.
2. "+ Capability" → add "Push Notifications".
3. "+ Capability" → add "Background Modes" → check "Remote notifications".
4. Confirm Xcode auto-links `App.entitlements` (it usually does when you add the Push Notifications capability with the file already present in the project) — if not, manually set Build Settings → "Code Signing Entitlements" → `App/App.entitlements`.
5. For production (not just development) push, this `aps-environment` value needs to become `production` at archive/App-Store-submission time — Xcode handles this automatically based on the provisioning profile used, no code change needed.

- [ ] **Step 5: Verify build still succeeds**

```bash
cd apps/web/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug build 2>&1 | tail -60
```
Same caveat as Task 4 Step 5 — a "file not in target"/entitlements-not-found failure means Step 4's manual work hasn't happened yet, not a code bug. A CocoaPods/SPM dependency resolution failure for the newly-added plugins IS worth investigating — run `npx cap sync ios` again (Step 1) if so, it may not have fully completed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/ios/App/App/Info.plist apps/web/ios/App/App/App.entitlements apps/web/ios/App/App/Podfile.lock apps/web/ios/App/App.xcworkspace 2>/dev/null
git commit -m "feat: install push/haptics/biometric Capacitor plugins for iOS, add entitlements"
```
(Some of the globbed paths above may not exist or may be gitignored depending on whether Pods/SPM artifacts are tracked in this repo — `git add` silently skips nonexistent paths, and gitignored ones will be excluded automatically; just confirm via `git status` before committing that nothing unexpected got staged.)

---

## Task 6: Android native tab bar shell

**Files:**
- Create: `apps/web/android/app/src/main/res/layout/activity_main.xml`
- Create: `apps/web/android/app/src/main/res/menu/bottom_nav_menu.xml`
- Modify: `apps/web/android/app/src/main/java/com/signal/app/MainActivity.java`
- Modify: `apps/web/android/app/src/main/res/values/strings.xml`

- [ ] **Step 1: Read the current `MainActivity.java` and `activity_main.xml` (if it exists) fresh**

`MainActivity.java` is currently `public class MainActivity extends BridgeActivity {}` (per this plan's file-structure notes above, verify it's still exactly this before editing). Check whether `apps/web/android/app/src/main/res/layout/activity_main.xml` already exists (Capacitor's default template sometimes includes a minimal one) — if it does, read it before overwriting.

- [ ] **Step 2: Write `bottom_nav_menu.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:id="@+id/nav_home"
        android:title="@string/nav_home"
        android:icon="@android:drawable/ic_menu_myplaces" />
    <item
        android:id="@+id/nav_signals"
        android:title="@string/nav_signals"
        android:icon="@android:drawable/ic_menu_sort_by_size" />
    <item
        android:id="@+id/nav_portfolio"
        android:title="@string/nav_portfolio"
        android:icon="@android:drawable/ic_menu_agenda" />
    <item
        android:id="@+id/nav_dividends"
        android:title="@string/nav_dividends"
        android:icon="@android:drawable/ic_menu_send" />
</menu>
```

(Using built-in Android system drawables as a placeholder icon set — swap for real branded icons as a follow-up; not blocking for a functional native tab bar. Note this explicitly in your commit message as a known placeholder, not silently.)

- [ ] **Step 3: Add string resources**

Add to `apps/web/android/app/src/main/res/values/strings.xml` (inside the existing `<resources>` element):
```xml
<string name="nav_home">Home</string>
<string name="nav_signals">Signals</string>
<string name="nav_portfolio">Portfolio</string>
<string name="nav_dividends">Dividends</string>
```

- [ ] **Step 4: Write `activity_main.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <FrameLayout
        android:id="@+id/webview_container"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintBottom_toTopOf="@id/bottom_nav" />

    <com.google.android.material.bottomnavigation.BottomNavigationView
        android:id="@+id/bottom_nav"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:menu="@menu/bottom_nav_menu"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintBottom_toBottomOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

- [ ] **Step 5: Rewrite `MainActivity.java`**

```java
package com.signal.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class MainActivity extends BridgeActivity {

    private static final String BASE_URL = "https://signalgenie.ai";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        FrameLayout container = findViewById(R.id.webview_container);
        WebView webView = this.bridge.getWebView();
        // Bridge's WebView is already attached to a parent by Capacitor's own
        // setup; re-parent it into our layout's container instead of leaving
        // it in Capacitor's default full-screen placement.
        if (webView.getParent() != null) {
            ((android.view.ViewGroup) webView.getParent()).removeView(webView);
        }
        container.addView(webView);

        BottomNavigationView nav = findViewById(R.id.bottom_nav);
        nav.setOnItemSelectedListener(item -> {
            String route;
            int id = item.getItemId();
            if (id == R.id.nav_home) route = "/dashboard";
            else if (id == R.id.nav_signals) route = "/dashboard/signals";
            else if (id == R.id.nav_portfolio) route = "/dashboard/portfolio";
            else if (id == R.id.nav_dividends) route = "/dashboard/dividends";
            else return false;

            webView.evaluateJavascript("window.location.href = '" + route + "';", null);
            return true;
        });
    }
}
```

- [ ] **Step 6: Verify build**

```bash
cd apps/web/android
./gradlew assembleDebug 2>&1 | tail -80
```
This should produce a real APK build or a real, actionable compile error — Android's Gradle toolchain is fully local (confirmed `gradlew` + Android SDK present), so this is a genuine verification step, not a placeholder. Fix any compile errors found; do not proceed to commit with a failing build.

- [ ] **Step 7: Commit**

```bash
git add apps/web/android/app/src/main/res/layout/activity_main.xml apps/web/android/app/src/main/res/menu/bottom_nav_menu.xml apps/web/android/app/src/main/java/com/signal/app/MainActivity.java apps/web/android/app/src/main/res/values/strings.xml
git commit -m "feat: add native BottomNavigationView shell around the Capacitor WebView (Android)"
```

---

## Task 7: Android push, biometric, haptics

**Files:**
- Modify: `apps/web/android/app/src/main/AndroidManifest.xml`
- (Capacitor plugins already installed in Task 5 Step 1 — `npx cap sync android` wires the Android side of the same npm packages)

- [ ] **Step 1: Sync Android platform with the plugins installed in Task 5**

```bash
cd apps/web
npx cap sync android
```

- [ ] **Step 2: Read `AndroidManifest.xml` fresh, add required permissions**

Add inside the `<manifest>` element, alongside any existing `<uses-permission>` entries:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.VIBRATE" />
```
(`POST_NOTIFICATIONS` for push on Android 13+, `USE_BIOMETRIC` for the biometric plugin, `VIBRATE` for haptics — `capacitor-native-biometric`/`@capacitor/push-notifications`/`@capacitor/haptics`'s own Capacitor sync step may already inject some of these automatically via their own manifest merging; check the file's actual state after Step 1's `npx cap sync` before adding — don't duplicate an already-present permission line.)

- [ ] **Step 3: Verify build**

```bash
cd apps/web/android
./gradlew assembleDebug 2>&1 | tail -80
```
Must succeed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/android/app/src/main/AndroidManifest.xml apps/web/package.json apps/web/package-lock.json
git commit -m "feat: sync push/biometric/haptics plugins to Android, add manifest permissions"
```

---

## Task 8: Web-side biometric app-lock gate

`capacitor-native-biometric` (installed in Task 5 Step 1) is a JS-callable Capacitor plugin — the actual lock-screen behavior belongs in `apps/web` TypeScript, not native Swift/Java. This is what makes Task 5/7's plugin installs actually do something.

**Files:**
- Create: `apps/web/components/BiometricLockGate.tsx`
- Modify: `apps/web/app/dashboard/layout.tsx` (wrap existing children with the new gate)

- [ ] **Step 1: Read `apps/web/app/dashboard/layout.tsx` fresh**

Confirm its current structure (it hosts `PortfolioProvider`, top nav, sidebar per this repo's established architecture) before wrapping it — the gate must sit inside auth (so it only ever locks an already-authenticated session) but should visually cover the whole dashboard, including nav.

- [ ] **Step 2: Write `BiometricLockGate.tsx`**

```tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  const [locked, setLocked] = useState(isNative);
  const [checking, setChecking] = useState(false);
  const attemptedRef = useRef(false);

  async function tryUnlock() {
    if (checking) return;
    setChecking(true);
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) { setLocked(false); return; } // no biometric hardware — skip lock
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock SignalGenie',
        title: 'SignalGenie',
      });
      setLocked(false);
    } catch {
      // Verification failed or was cancelled — stay locked, let the user retry via the button.
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!isNative) return;
    if (!attemptedRef.current) { attemptedRef.current = true; tryUnlock(); }

    const sub = CapacitorApp.addListener('resume', () => {
      setLocked(true);
      attemptedRef.current = false;
    });
    return () => { sub.then(s => s.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  useEffect(() => {
    if (locked && isNative && !attemptedRef.current) { attemptedRef.current = true; tryUnlock(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (!isNative || !locked) return <>{children}</>;

  return (
    <div style={{ position:'fixed', inset:0, background:'#070D1A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, zIndex:9999 }}>
      <div style={{ fontSize:40 }}>🔒</div>
      <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>SignalGenie Locked</div>
      <button onClick={tryUnlock} disabled={checking}
        style={{ height:44, padding:'0 24px', borderRadius:10, background:'#1740F5', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        {checking ? 'Verifying…' : 'Unlock'}
      </button>
    </div>
  );
}
```

Note: `capacitor-native-biometric` is dynamically imported (not top-level) so this file doesn't fail to build/import on the WEB target, where the native module doesn't exist — the dynamic import only actually executes inside the `isNative` branch, at runtime, inside a real Capacitor shell.

- [ ] **Step 3: Wrap the dashboard layout**

In `apps/web/app/dashboard/layout.tsx`, import `BiometricLockGate` and wrap whatever the existing return statement renders (read the file fresh — wrap the outermost returned JSX, keeping `PortfolioProvider` etc. exactly as they are today, just adding one more wrapping layer):

```tsx
import { BiometricLockGate } from '@/components/BiometricLockGate';
```
```tsx
return (
  <BiometricLockGate>
    {/* ...existing layout JSX, unchanged... */}
  </BiometricLockGate>
);
```

- [ ] **Step 4: Verify**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -iE "BiometricLockGate|dashboard/layout"
```
Must show zero output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/BiometricLockGate.tsx apps/web/app/dashboard/layout.tsx
git commit -m "feat: add biometric app-lock gate for native app shell"
```

---

## Task 9: Haptics at key action sites

**Files:**
- Modify: 2-3 existing files at the specific action moments called out in the design spec (price alert fired, paper trade logged, biometric unlock success)

- [ ] **Step 1: Wire haptic feedback on successful biometric unlock**

In `BiometricLockGate.tsx` (Task 8), after `await NativeBiometric.verifyIdentity(...)` succeeds and before `setLocked(false)`:

```tsx
const { Haptics, NotificationType } = await import('@capacitor/haptics');
await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
```

- [ ] **Step 2: Wire haptic feedback on paper trade logged**

Find the paper trading page's trade-submit success handler (`apps/web/app/dashboard/paper-trading/page.tsx` — search for the function handling a successful trade submission, likely near a `setSuccess(...)` or similar state update after a Supabase insert succeeds). Add:

```tsx
if (typeof window !== 'undefined') {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }
}
```
right after the trade successfully persists, before/alongside the existing success-state UI update. Read the actual handler function fresh — insert this in the correct success branch, not a loading/error branch.

- [ ] **Step 3: Verify**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -iE "BiometricLockGate|paper-trading/page"
```
Must show zero output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/BiometricLockGate.tsx apps/web/app/dashboard/paper-trading/page.tsx
git commit -m "feat: add haptic feedback on biometric unlock and paper trade success"
```

Note: the design spec also mentions "price alert fired" as a haptic touchpoint — that event happens server-side (`apps/api/core/price_alerts.py`, Task 3) and is delivered via push notification, not a live in-app UI moment the web frontend can directly hook a haptic call into. iOS/Android both play a system haptic/sound automatically on push notification delivery by OS default behavior — no extra app code needed for that specific touchpoint. Note this explicitly in the task's final report rather than silently dropping it.

---

## Final Review

- [ ] Dispatch a final code reviewer subagent across all 9 tasks together (per `subagent-driven-development`'s final step) — check for cross-task consistency: do the iOS and Android tab route strings match exactly (`/dashboard`, `/dashboard/signals`, `/dashboard/portfolio`, `/dashboard/dividends`) across `ShellViewController.swift` and `MainActivity.java`? Does `MobileBottomNav.tsx`'s hidden tab set match the native shell's 4 tabs (no tab present in one but not the other)? Does `BiometricLockGate` correctly avoid breaking the web (non-Capacitor) build?
- [ ] Confirm both `xcodebuild` (Task 4/5) and `./gradlew assembleDebug` (Task 6/7) succeeded as of the LAST commit in each platform's sequence, not just their own task's commit — a later task could have broken an earlier one.
- [ ] Use `superpowers:finishing-a-development-branch` once all tasks are reviewed and both builds are green.

## Manual steps required from the user (cannot be automated from this environment)

1. **Xcode**: add `ShellViewController.swift` to the `App` target (Task 4, Step 4).
2. **Xcode**: enable Push Notifications + Background Modes capabilities, confirm entitlements linkage (Task 5, Step 4).
3. **Firebase**: create a Firebase project, download the service account JSON, set `FIREBASE_CREDENTIALS_PATH` on the backend deployment (Task 3) — this repo has no existing Firebase project to reuse.
4. **Supabase**: run the `native_push_tokens` SQL from Task 2 in the SQL Editor.
5. **Real device testing**: push notifications and Face ID/BiometricPrompt do not function in the iOS Simulator or most Android emulator configurations — final verification needs a physical device on both platforms, per the design spec's Testing section.
