# Native Mobile App Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real React Native (Expo) app covering 5 screens — Auth, Home, Signals, Portfolio (India), US Portfolio — reusing the existing Supabase backend and Next.js API routes, with zero changes to the existing Capacitor app.

**Architecture:** New `apps/mobile/` Expo Router app + new `packages/design-tokens` shared package. Same Supabase project as `apps/web` (same `auth.users`, same `holdings`/`portfolios` tables, same RLS). Data screens call the existing `apps/web` API routes over HTTPS (`https://signalgenie.ai`) exactly as the web client does today — no new backend.

**Tech Stack:** Expo (TypeScript, Expo Router), `@supabase/supabase-js`, `@react-native-async-storage/async-storage`.

**Reference:** `docs/superpowers/specs/2026-07-13-native-mobile-app-phase1-design.md`

---

### Task 1: Scaffold `apps/mobile/`

**Files:**
- Create: `apps/mobile/` (via `create-expo-app`)
- Modify: `package.json:4-8` (root workspaces array)

- [ ] **Step 1: Scaffold the Expo app**

Run from the repo root:
```bash
npx create-expo-app@latest apps/mobile --template default@sdk-52
```
Expected: `apps/mobile/` created with `app/`, `assets/`, `package.json`, `app.json`, `tsconfig.json`.

- [ ] **Step 2: Install Expo Router and auth-related deps**

```bash
cd apps/mobile
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 3: Switch to Expo Router entry point**

In `apps/mobile/package.json`, set:
```json
{
  "main": "expo-router/entry"
}
```

In `apps/mobile/app.json`, add under `"expo"`:
```json
"scheme": "signalgenie",
"plugins": ["expo-router"]
```

- [ ] **Step 4: Add `apps/mobile` to root workspaces**

In `/package.json` (repo root), change:
```json
"workspaces": [
  "apps/web",
  "packages/*"
]
```
to:
```json
"workspaces": [
  "apps/web",
  "apps/mobile",
  "packages/*"
]
```

- [ ] **Step 5: Install and verify it boots**

```bash
cd /Users/gsaiganesh/signal-app && npm install
cd apps/mobile && npx expo start --ios
```
Expected: Expo dev tools open, iOS simulator launches, default Expo Router welcome screen renders with no red-screen errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile package.json package-lock.json
git commit -m "Scaffold apps/mobile Expo app with Expo Router"
```

---

### Task 2: `packages/design-tokens`

**Files:**
- Create: `packages/design-tokens/package.json`
- Create: `packages/design-tokens/index.ts`
- Create: `packages/design-tokens/colors.ts`
- Create: `packages/design-tokens/spacing.ts`
- Create: `packages/design-tokens/typography.ts`
- Reference: `apps/web/app/globals.css:1-23` (source CSS variables)

- [ ] **Step 1: Read the source CSS variables**

Run: `grep -A 25 ":root {" apps/web/app/globals.css | head -30`
Confirms the exact hex values to extract (dark theme values — `apps/web` also has a light theme block later in the file; Phase 1 native ships dark-only, matching the app's default and avoiding a second token set before the first is even used anywhere).

- [ ] **Step 2: Write `packages/design-tokens/package.json`**

```json
{
  "name": "@signal/design-tokens",
  "version": "0.0.1",
  "private": true,
  "main": "index.ts",
  "types": "index.ts"
}
```

- [ ] **Step 3: Write `packages/design-tokens/colors.ts`**

```typescript
// Mirrors apps/web/app/globals.css's :root dark-theme CSS variables.
// Manually kept in sync when the palette itself changes (rare) — this does
// not attempt to sync per-component UI code, which is architecturally
// impossible across DOM (web) vs native views (React Native).
export const colors = {
  bg:    '#070D1A',
  surf:  '#0E1628',
  surf2: '#162038',
  bdr:   '#1C2E4A',
  txt:   '#FFFFFF',
  dim:   '#7A8BAA',
  dim2:  '#3A4E6A',
  blu:   '#1740F5',
  bluL:  '#4F6FFA',
  grn:   '#00D4A0',
  red:   '#FF3B5C',
  org:   '#FF5C1A',
  ylw:   '#FFB800',
  pur:   '#8B5CF6',
} as const;
```

- [ ] **Step 4: Write `packages/design-tokens/spacing.ts`**

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
```

- [ ] **Step 5: Write `packages/design-tokens/typography.ts`**

```typescript
export const typography = {
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 24, display: 32 },
  weight: { normal: '400', medium: '500', semibold: '600', bold: '700', black: '900' } as const,
} as const;
```

- [ ] **Step 6: Write `packages/design-tokens/index.ts`**

```typescript
export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';
```

- [ ] **Step 7: Add as a dependency of `apps/mobile`**

In `apps/mobile/package.json`'s `dependencies`, add:
```json
"@signal/design-tokens": "*"
```

Run: `cd /Users/gsaiganesh/signal-app && npm install`
Expected: npm links the workspace package (no network install for it — resolves to `packages/design-tokens` directly).

- [ ] **Step 8: Verify it imports correctly**

Run:
```bash
cd apps/mobile && node -e "
const { colors } = require('@signal/design-tokens');
console.log(colors.grn);
"
```
Expected: prints `#00D4A0`.

- [ ] **Step 9: Commit**

```bash
git add packages/design-tokens apps/mobile/package.json package-lock.json
git commit -m "Add packages/design-tokens shared color/spacing/typography constants"
```

---

### Task 3: Supabase client + auth screens

**Files:**
- Create: `apps/mobile/lib/supabase.ts`
- Create: `apps/mobile/.env` (not committed — see Step 2)
- Create: `apps/mobile/app/(auth)/sign-in.tsx`
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Modify: `apps/mobile/.gitignore`

- [ ] **Step 1: Write `apps/mobile/lib/supabase.ts`**

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Create `apps/mobile/.env`**

Copy the values from `apps/web/.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — same Supabase project, same values, just
re-exposed under Expo's required `EXPO_PUBLIC_` prefix instead of Next.js's
`NEXT_PUBLIC_`:

```
EXPO_PUBLIC_SUPABASE_URL=<same value as apps/web/.env.local's NEXT_PUBLIC_SUPABASE_URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same value as apps/web/.env.local's NEXT_PUBLIC_SUPABASE_ANON_KEY>
```

- [ ] **Step 3: Ensure `.env` is gitignored**

Check `apps/mobile/.gitignore` (created by `create-expo-app`) already has a `.env*` line. If not,
append:
```
.env
.env.local
```

- [ ] **Step 4: Write `apps/mobile/app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
```

- [ ] **Step 5: Write `apps/mobile/app/(auth)/sign-in.tsx`**

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@signal/design-tokens';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) { setError('Enter email and password.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/(app)');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SignalGenie</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.dim}
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.dim}
        value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/sign-up')}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: typography.size.display, fontWeight: typography.weight.black, color: colors.txt, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.size.base, color: colors.dim, marginBottom: spacing.xxl },
  input: { height: 48, borderRadius: 10, backgroundColor: colors.surf2, borderWidth: 1, borderColor: colors.bdr,
    color: colors.txt, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: typography.size.md },
  error: { color: colors.red, fontSize: typography.size.sm, marginBottom: spacing.md },
  button: { height: 48, borderRadius: 10, backgroundColor: colors.grn, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  buttonText: { color: '#000', fontWeight: typography.weight.bold, fontSize: typography.size.md },
  link: { color: colors.bluL, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.lg },
});
```

- [ ] **Step 6: Write `apps/mobile/app/(auth)/sign-up.tsx`**

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@signal/design-tokens';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSignUp() {
    if (!email || password.length < 8) { setError('Enter a valid email and an 8+ character password.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>Confirm your email at {email}, then sign in.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.dim}
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password (min 8 characters)" placeholderTextColor={colors.dim}
        value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: typography.size.xxl, fontWeight: typography.weight.black, color: colors.txt, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.size.base, color: colors.dim, marginBottom: spacing.xxl },
  input: { height: 48, borderRadius: 10, backgroundColor: colors.surf2, borderWidth: 1, borderColor: colors.bdr,
    color: colors.txt, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: typography.size.md },
  error: { color: colors.red, fontSize: typography.size.sm, marginBottom: spacing.md },
  button: { height: 48, borderRadius: 10, backgroundColor: colors.grn, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  buttonText: { color: '#000', fontWeight: typography.weight.bold, fontSize: typography.size.md },
  link: { color: colors.bluL, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.lg },
});
```

- [ ] **Step 7: Verify sign-in works against the real Supabase project**

Run: `cd apps/mobile && npx expo start --ios`, navigate to the sign-in screen (Task 4 wires
routing so this is reachable), sign in with a real test account's email/password.
Expected: no error, `supabase.auth.signInWithPassword` resolves successfully (confirm via a
temporary `console.log` in `handleSignIn` if needed, then remove it).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/lib apps/mobile/app apps/mobile/.gitignore
git commit -m "Add Supabase client and sign-in/sign-up screens"
```

---

### Task 4: Bottom tab navigator + auth gating

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Write the root layout with auth-state routing**

`apps/mobile/app/_layout.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { colors } from '@signal/design-tokens';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return; // still loading
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/sign-in');
    else if (session && inAuthGroup) router.replace('/(app)');
  }, [session, segments]);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.grn} />
      </View>
    );
  }

  return <Slot />;
}
```

- [ ] **Step 2: Write `apps/mobile/app/index.tsx`** (redirect stub — root layout handles real routing)

```typescript
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(app)" />;
}
```

- [ ] **Step 3: Write the tab navigator**

`apps/mobile/app/(app)/_layout.tsx`:
```typescript
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@signal/design-tokens';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.surf },
      headerTintColor: colors.txt,
      tabBarStyle: { backgroundColor: colors.surf, borderTopColor: colors.bdr },
      tabBarActiveTintColor: colors.grn,
      tabBarInactiveTintColor: colors.dim,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="signals" options={{ title: 'Signals', tabBarIcon: () => <TabIcon emoji="📈" /> }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: () => <TabIcon emoji="💼" /> }} />
      <Tabs.Screen name="us-portfolio" options={{ title: 'US Portfolio', tabBarIcon: () => <TabIcon emoji="🇺🇸" /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: Verify auth gating works end-to-end**

Run: `cd apps/mobile && npx expo start --ios`. Cold start with no session → lands on sign-in.
Sign in with a real test account → redirects to the tab navigator (screens are placeholder-empty
until Tasks 5-8, but the 4 tabs should render with no crash). Force-quit and relaunch → session
persists (AsyncStorage), lands directly on the tab navigator, not sign-in again.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app
git commit -m "Add auth-gated routing and bottom tab navigator"
```

---

### Task 5: Home dashboard screen

**Files:**
- Create: `apps/mobile/app/(app)/index.tsx`
- Reference: `apps/web/lib/portfolio-context.tsx:34-52` (restFetch pattern), `apps/web/app/dashboard/page.tsx` (KPI card content, simplified for Phase 1 per the spec's non-goals — no diversification-insights engine)

- [ ] **Step 1: Write `apps/mobile/app/(app)/index.tsx`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@signal/design-tokens';

interface Holding { symbol: string; exchange: string; qty: number; avg_price: number }

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
    </View>
  );
}

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserName(session.user.user_metadata?.full_name?.split(' ')[0] ?? session.user.email?.split('@')[0] ?? 'there');

    const { data: portfolios } = await supabase.from('portfolios').select('id').eq('user_id', session.user.id);
    const portfolioIds = (portfolios ?? []).map(p => p.id);
    if (!portfolioIds.length) { setHoldings([]); return; }

    const { data: hData } = await supabase
      .from('holdings')
      .select('symbol,exchange,qty,avg_price')
      .in('portfolio_id', portfolioIds);
    setHoldings(hData ?? []);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const indiaHoldings = holdings.filter(h => h.exchange === 'NSE' || h.exchange === 'BSE');
  const usHoldings = holdings.filter(h => h.exchange === 'NYSE' || h.exchange === 'NASDAQ');
  const totalInvestedIndia = indiaHoldings.reduce((s, h) => s + h.qty * h.avg_price, 0);
  const totalInvestedUS = usHoldings.reduce((s, h) => s + h.qty * h.avg_price, 0);

  const fmtInr = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : `₹${n.toFixed(0)}`;

  if (loading) {
    return <View style={styles.center}><Text style={styles.dim}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grn} />}>
      <Text style={styles.greeting}>Good day, {userName} 👋</Text>

      <View style={styles.grid}>
        <KpiCard label="India Holdings" value={String(indiaHoldings.length)} sub={fmtInr(totalInvestedIndia)} />
        <KpiCard label="US Holdings" value={String(usHoldings.length)} sub={`$${totalInvestedUS.toFixed(0)}`} />
        <KpiCard label="Total Invested (India)" value={fmtInr(totalInvestedIndia)} />
        <KpiCard label="Net Worth" value={fmtInr(totalInvestedIndia)} sub="India only — USD conversion in a later phase" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.dim, fontSize: typography.size.md },
  greeting: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.txt, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47%', backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.bdr, borderRadius: 12, padding: spacing.lg },
  cardLabel: { fontSize: typography.size.xs, color: colors.dim, textTransform: 'uppercase', marginBottom: spacing.xs },
  cardValue: { fontSize: typography.size.xl, fontWeight: typography.weight.black, color: colors.txt },
  cardSub: { fontSize: typography.size.xs, color: colors.dim, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Verify against real data**

Run: `cd apps/mobile && npx expo start --ios`, sign in with a real test account that has
holdings. Expected: Home tab shows a greeting with the real first name, and KPI cards with real
counts/totals matching what `apps/web`'s portfolio page shows for the same account (spot-check
the India holdings count and total invested figure against the web dashboard).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/index.tsx
git commit -m "Add Home dashboard screen with real holdings-derived KPIs"
```

---

### Task 6: Signals screen

**Files:**
- Create: `apps/mobile/app/(app)/signals.tsx`
- Reference: `apps/web/app/dashboard/signals/page.tsx:14-20` (`MLSignal` interface), `apps/api/routers/signals.py:23-31` (`GET /signals` list endpoint shape)

- [ ] **Step 1: Write `apps/mobile/app/(app)/signals.tsx`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '@signal/design-tokens';

interface MLSignal {
  symbol: string; name: string; sector: string;
  cmp: number; chg: number; rsi: number;
  signal: string; confidence: number; score: number;
}

function SignalRow({ item }: { item: MLSignal }) {
  const chgColor = item.chg >= 0 ? colors.grn : colors.red;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.sector}>{item.sector}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.price}>₹{item.cmp.toLocaleString('en-IN')}</Text>
        <Text style={[styles.chg, { color: chgColor }]}>{item.chg >= 0 ? '+' : ''}{item.chg.toFixed(2)}%</Text>
      </View>
      <View style={styles.confBadge}>
        <Text style={styles.confText}>{item.confidence}%</Text>
      </View>
    </View>
  );
}

export default function Signals() {
  const [signals, setSignals] = useState<MLSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch('https://signalgenie.ai/api/ml/signals?limit=20');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as { signals: MLSignal[] };
      setSignals(data.signals ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <View style={styles.center}><Text style={styles.dim}>Loading signals…</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.dim}>Could not load signals. Pull to retry.</Text></View>;

  return (
    <FlatList
      style={styles.container}
      data={signals}
      keyExtractor={item => item.symbol}
      renderItem={({ item }) => <SignalRow item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grn} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={{ padding: spacing.lg }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.dim, fontSize: typography.size.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.bdr, borderRadius: 10, padding: spacing.md },
  separator: { height: spacing.sm },
  symbol: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.txt },
  sector: { fontSize: typography.size.xs, color: colors.dim, marginTop: 2 },
  price: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.txt },
  chg: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, marginTop: 2 },
  confBadge: { backgroundColor: colors.surf2, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginLeft: spacing.sm },
  confText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.bluL },
});
```

- [ ] **Step 2: Verify against the real API**

Run: `curl -s "https://signalgenie.ai/api/ml/signals?limit=20"` first to confirm the endpoint is
live and returns the expected `{ signals: [...] }` shape. Then run the app, open the Signals tab.
Expected: a real list of NSE stock signals renders, pull-to-refresh re-fetches.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/signals.tsx
git commit -m "Add Signals screen"
```

---

### Task 7: Portfolio (India) screen

**Files:**
- Create: `apps/mobile/app/(app)/portfolio.tsx`
- Reference: `apps/web/lib/portfolio-context.tsx:67-78` (`fetchHoldings` pattern)

- [ ] **Step 1: Write `apps/mobile/app/(app)/portfolio.tsx`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@signal/design-tokens';

interface Holding { id: string; symbol: string; exchange: string; qty: number; avg_price: number }

function HoldingRow({ item }: { item: Holding }) {
  const invested = item.qty * item.avg_price;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.meta}>{item.qty} shares @ ₹{item.avg_price.toLocaleString('en-IN')}</Text>
      </View>
      <Text style={styles.invested}>₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
    </View>
  );
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: portfolios } = await supabase.from('portfolios').select('id').eq('user_id', session.user.id);
    const portfolioIds = (portfolios ?? []).map(p => p.id);
    if (!portfolioIds.length) { setHoldings([]); return; }
    const { data } = await supabase
      .from('holdings')
      .select('id,symbol,exchange,qty,avg_price')
      .in('portfolio_id', portfolioIds)
      .in('exchange', ['NSE', 'BSE'])
      .order('symbol');
    setHoldings(data ?? []);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <View style={styles.center}><Text style={styles.dim}>Loading portfolio…</Text></View>;

  if (!holdings.length) {
    return <View style={styles.center}><Text style={styles.dim}>No India holdings yet.</Text></View>;
  }

  return (
    <FlatList
      style={styles.container}
      data={holdings}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <HoldingRow item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grn} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={{ padding: spacing.lg }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.dim, fontSize: typography.size.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.bdr, borderRadius: 10, padding: spacing.md },
  separator: { height: spacing.sm },
  symbol: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.txt },
  meta: { fontSize: typography.size.xs, color: colors.dim, marginTop: 2 },
  invested: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.txt },
});
```

- [ ] **Step 2: Verify against real data**

Run the app, sign in with a test account that has NSE/BSE holdings, open the Portfolio tab.
Expected: real holdings list, matching symbol/qty/avg_price/invested-value shown on
`apps/web`'s `/dashboard/portfolio` page for the same account.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/portfolio.tsx
git commit -m "Add Portfolio (India) screen"
```

---

### Task 8: US Portfolio screen

**Files:**
- Create: `apps/mobile/app/(app)/us-portfolio.tsx`

- [ ] **Step 1: Write `apps/mobile/app/(app)/us-portfolio.tsx`**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@signal/design-tokens';

interface Holding { id: string; symbol: string; exchange: string; qty: number; avg_price: number }

function HoldingRow({ item }: { item: Holding }) {
  const invested = item.qty * item.avg_price;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.meta}>{item.qty} shares @ ${item.avg_price.toFixed(2)} · {item.exchange}</Text>
      </View>
      <Text style={styles.invested}>${invested.toFixed(2)}</Text>
    </View>
  );
}

export default function USPortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: portfolios } = await supabase.from('portfolios').select('id').eq('user_id', session.user.id);
    const portfolioIds = (portfolios ?? []).map(p => p.id);
    if (!portfolioIds.length) { setHoldings([]); return; }
    const { data } = await supabase
      .from('holdings')
      .select('id,symbol,exchange,qty,avg_price')
      .in('portfolio_id', portfolioIds)
      .in('exchange', ['NYSE', 'NASDAQ'])
      .order('symbol');
    setHoldings(data ?? []);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <View style={styles.center}><Text style={styles.dim}>Loading US portfolio…</Text></View>;

  if (!holdings.length) {
    return <View style={styles.center}><Text style={styles.dim}>No US holdings yet.</Text></View>;
  }

  return (
    <FlatList
      style={styles.container}
      data={holdings}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <HoldingRow item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grn} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={{ padding: spacing.lg }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.dim, fontSize: typography.size.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.bdr, borderRadius: 10, padding: spacing.md },
  separator: { height: spacing.sm },
  symbol: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.txt },
  meta: { fontSize: typography.size.xs, color: colors.dim, marginTop: 2 },
  invested: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.txt },
});
```

- [ ] **Step 2: Verify against real data**

Run the app, sign in with a test account that has NYSE/NASDAQ holdings, open the US Portfolio
tab. Expected: real holdings list matching what `apps/web`'s `/dashboard/us-portfolio` page
shows for the same account.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/us-portfolio.tsx
git commit -m "Add US Portfolio screen"
```

---

### Task 9: Sign-out

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`

- [ ] **Step 1: Add a sign-out button to the Home screen**

In `apps/mobile/app/(app)/index.tsx`, add the import:
```typescript
import { Pressable } from 'react-native';
```
(merge into the existing `react-native` import line rather than duplicating it)

Add a handler function inside the `Home` component, above the `if (loading)` check:
```typescript
  async function handleSignOut() {
    await supabase.auth.signOut();
  }
```

Add this at the end of the `ScrollView`'s children, after the `</View>` closing the `grid`:
```typescript
      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
```

Add to the `styles` object:
```typescript
  signOutBtn: { marginTop: spacing.xxl, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: colors.red, fontWeight: typography.weight.semibold, fontSize: typography.size.base },
```

- [ ] **Step 2: Verify sign-out returns to the sign-in screen**

Run the app, sign in, tap "Sign Out" on Home. Expected: redirected to `/(auth)/sign-in` (the
root layout's `onAuthStateChange` listener from Task 4 handles this automatically — no manual
navigation call needed in the handler itself).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/index.tsx
git commit -m "Add sign-out to Home screen"
```

---

## Self-Review

**Spec coverage:** Auth (Task 3) ✓, Home (Task 5) ✓, Signals (Task 6) ✓, Portfolio India (Task 7) ✓,
US Portfolio (Task 8) ✓, `packages/design-tokens` (Task 2) ✓, new separate `apps/mobile/` folder
not touching `apps/web/ios` (Task 1 — confirmed no modification to any `apps/web/ios/*` file
anywhere in this plan) ✓, same Supabase backend/no new API routes (Tasks 3, 5, 7, 8 all query
Supabase directly; Task 6 calls the existing `/api/ml/signals` route) ✓.

**Type consistency:** `Holding` interface (`id, symbol, exchange, qty, avg_price`) matches across
Tasks 7 and 8. `MLSignal` interface in Task 6 matches the web app's own `MLSignal` type fields
used for list rendering (`symbol, name, sector, cmp, chg, rsi, signal, confidence, score`) —
narrowed to only the fields this screen actually renders, still structurally compatible with the
real API response (extra unused fields in the real payload are harmless with TypeScript's
structural typing). `colors`/`spacing`/`typography` imported identically from
`@signal/design-tokens` in every screen file.

**Placeholder scan:** No TBD/TODO markers. Every step has complete, runnable code or an exact
command with a stated expected result.
