import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export default function SignIn() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.wrap}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Welcome Back</Text>
        <Text style={[s.sub, { color: T.dim }]}>Sign in to SIGNAL</Text>

        <View style={s.fields}>
          {[{ label: 'Email / Mobile', placeholder: 'you@signal.in' }, { label: 'Password', placeholder: '••••••••', secure: true }].map(f => (
            <View key={f.label}>
              <Text style={[s.label, { color: T.dim }]}>{f.label.toUpperCase()}</Text>
              <TextInput
                placeholder={f.placeholder}
                placeholderTextColor={T.dim}
                secureTextEntry={f.secure}
                style={[s.input, { backgroundColor: T.surf, borderColor: T.bdr, color: T.txt }]}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.replace('/(app)')}>
          <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Sign In →</Text>
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
  safe:      { flex: 1 },
  wrap:      { flex: 1, padding: 20 },
  back:      { marginBottom: 24 },
  backTxt:   { fontSize: 16 },
  h1:        { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:       { fontSize: 13, marginBottom: 32 },
  fields:    { gap: 10, marginBottom: 24 },
  label:     { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  input:     { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  cta:       { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerTxt: { fontSize: 13 },
  footerLink:{ fontSize: 13, fontWeight: '600' },
});
