import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const LEVELS = ['Beginner', 'Intermediate', 'Pro'];
const REDIRECT_URL = 'https://signalgenie.ai/auth/callback?mobile=1';

export default function SignUp() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [level, setLevel] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function signUpWithGoogle() {
    setLoading(true);
    setError('');
    setInfo('');

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'Could not start Google sign-in');
      setLoading(false);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, 'signal://');

    if (result.type === 'success') {
      const url = new URL(result.url);
      const access_token = url.searchParams.get('access_token');
      const refresh_token = url.searchParams.get('refresh_token');
      if (access_token && refresh_token) {
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

  async function signUpWithEmail() {
    if (!email.trim()) { setError('Enter your email'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    setError('');
    setInfo('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim() || undefined },
        emailRedirectTo: REDIRECT_URL,
      },
    });

    if (signUpError) {
      const m = signUpError.message.toLowerCase();
      if (m.includes('already registered') || m.includes('already exists') || m.includes('user already')) {
        setError('');
        router.push('/(auth)/sign-in');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (data.session) {
      // Email confirmation disabled — signed in immediately, layout will redirect
    } else {
      setInfo('Check your email for a confirmation link, then sign in.');
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Create Account</Text>
        <Text style={[s.sub, { color: T.dim }]}>Join India's smartest algo traders</Text>

        {/* Google */}
        <TouchableOpacity
          onPress={signUpWithGoogle}
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
            <Text style={[s.label, { color: T.dim }]}>FULL NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Vaasudev Amitav"
              placeholderTextColor={T.dim}
              style={[s.input, { backgroundColor: T.surf, borderColor: T.bdr, color: T.txt }]}
            />
          </View>
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
              placeholder="Min 8 characters"
              placeholderTextColor={T.dim}
              secureTextEntry
              style={[s.input, { backgroundColor: T.surf, borderColor: T.bdr, color: T.txt }]}
            />
          </View>
        </View>

        <Text style={[s.label, { color: T.dim, marginBottom: 7 }]}>TRADING EXPERIENCE</Text>
        <View style={s.levels}>
          {LEVELS.map((r, i) => (
            <TouchableOpacity
              key={r}
              onPress={() => setLevel(i)}
              style={[s.levelBtn, {
                backgroundColor: i === level ? `${ACC.blu}20` : T.surf2,
                borderColor: i === level ? ACC.blu : T.bdr,
              }]}
            >
              <Text style={[s.levelTxt, { color: i === level ? ACC.bluL : T.dim }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {info ? <Text style={s.infoMsg}>{info}</Text> : null}

        <TouchableOpacity onPress={signUpWithEmail} disabled={loading} style={[{ marginTop: 24 }, loading && { opacity: 0.6 }]}>
          <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.ctaTxt}>Create Account →</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={[s.footerTxt, { color: T.dim }]}>Already a member? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={[s.footerLink, { color: ACC.bluL }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  scroll:     { padding: 20, paddingBottom: 40 },
  back:       { marginBottom: 16 },
  backTxt:    { fontSize: 16 },
  h1:         { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:        { fontSize: 13, marginBottom: 20 },
  googleBtn:  { height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#EA4335' },
  googleLbl:  { fontSize: 14, fontWeight: '600' },
  divider:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  line:       { flex: 1, height: 1 },
  orTxt:      { fontSize: 11 },
  fields:     { gap: 10, marginBottom: 16 },
  label:      { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  input:      { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  levels:     { flexDirection: 'row', gap: 7, marginBottom: 16 },
  levelBtn:   { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelTxt:   { fontSize: 11, fontWeight: '600' },
  error:      { color: '#FF3B5C', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  infoMsg:    { color: '#00D4A0', fontSize: 12, marginBottom: 8, textAlign: 'center', lineHeight: 18 },
  cta:        { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerTxt:  { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '600' },
});
