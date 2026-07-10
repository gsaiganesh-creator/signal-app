import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Web callback relays tokens to signal:// so ASWebAuthenticationSession intercepts them.
// https://signalgenie.ai/auth/callback is already in Supabase's allowed redirect URLs
// (it's used by the web app), so no new Supabase config is needed.
const REDIRECT_URL = 'https://signalgenie.ai/auth/callback?mobile=1';

export default function SignIn() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    setError('');

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'Could not start Google sign-in');
      setLoading(false);
      return;
    }

    // Watch for signal:// — the web callback at signalgenie.ai reads the
    // implicit-flow token fragment and redirects to signal://auth/callback?access_token=...
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'signal://');

    if (result.type === 'success') {
      const url = new URL(result.url);
      const code          = url.searchParams.get('code');
      const access_token  = url.searchParams.get('access_token');
      const refresh_token = url.searchParams.get('refresh_token');

      if (code) {
        // PKCE: mobile client holds the verifier in AsyncStorage — exchange here
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) setError(exchangeError.message);
      } else if (access_token && refresh_token) {
        // Implicit fallback
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) setError(sessionError.message);
      } else {
        setError('Sign-in failed — missing tokens');
      }
    } else if (result.type === 'cancel') {
      setError('Sign-in was cancelled');
    }

    setLoading(false);
  }

  async function signInWithEmail() {
    if (!email.trim()) { setError('Enter your email'); return; }
    if (!password) { setError('Enter your password'); return; }

    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      const m = signInError.message.toLowerCase();
      if (m.includes('invalid') || m.includes('wrong') || m.includes('credentials')) {
        setError('Wrong email or password. If you signed up with Google, use "Continue with Google" above.');
      } else {
        setError(signInError.message);
      }
    }
    // On success, onAuthStateChange in _layout fires → redirect to /(app) automatically

    setLoading(false);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.wrap}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Welcome Back</Text>
        <Text style={[s.sub, { color: T.dim }]}>Sign in to SIGNAL</Text>

        {/* Google */}
        <TouchableOpacity
          onPress={signInWithGoogle}
          disabled={loading}
          style={[s.googleBtn, { backgroundColor: T.surf, borderColor: T.bdr, opacity: loading ? 0.6 : 1 }]}
        >
          <Text style={s.googleIcon}>G</Text>
          <Text style={[s.googleLbl, { color: T.txt }]}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
          <Text style={[s.orTxt, { color: T.dim }]}>or email</Text>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
        </View>

        <View style={s.fields}>
          <View>
            <Text style={[s.label, { color: T.dim }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@signal.in"
              placeholderTextColor={T.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.input, { backgroundColor: T.surf, borderColor: T.bdr, color: T.txt }]}
            />
          </View>
          <View>
            <Text style={[s.label, { color: T.dim }]}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={T.dim}
              secureTextEntry
              style={[s.input, { backgroundColor: T.surf, borderColor: T.bdr, color: T.txt }]}
            />
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity onPress={signInWithEmail} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.ctaTxt}>Sign In →</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={[s.footerTxt, { color: T.dim }]}>New to SIGNAL? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={[s.footerLink, { color: ACC.bluL }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  wrap:       { flex: 1, padding: 20 },
  back:       { marginBottom: 24 },
  backTxt:    { fontSize: 16 },
  h1:         { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:        { fontSize: 13, marginBottom: 24 },
  googleBtn:  { height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#EA4335' },
  googleLbl:  { fontSize: 14, fontWeight: '600' },
  divider:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  line:       { flex: 1, height: 1 },
  orTxt:      { fontSize: 11 },
  fields:     { gap: 10, marginBottom: 16 },
  label:      { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  input:      { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  error:      { color: '#FF3B5C', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  cta:        { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerTxt:  { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '600' },
});
