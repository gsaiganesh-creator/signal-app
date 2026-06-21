import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const LEVELS = ['Beginner', 'Intermediate', 'Pro'];

export default function SignUp() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [level, setLevel] = useState(1);

  const fields = [
    { label: 'Full Name',       value: '',  placeholder: 'Vaasudev Amitav' },
    { label: 'Email / Mobile',  value: '',  placeholder: 'you@signal.in' },
    { label: 'Password',        value: '',  placeholder: '••••••••', secure: true },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Create Account</Text>
        <Text style={[s.sub, { color: T.dim }]}>Join India's smartest algo traders</Text>

        {/* Social buttons */}
        <View style={s.social}>
          {[{ i: '𝕏', l: 'Twitter' }, { i: 'G', l: 'Google' }].map(({ i, l }) => (
            <TouchableOpacity key={l} style={[s.socialBtn, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.socialIcon, { color: T.txt }]}>{i}</Text>
              <Text style={[s.socialLbl, { color: T.txt }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.divider}>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
          <Text style={[s.orTxt, { color: T.dim }]}>or email</Text>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
        </View>

        {/* Fields */}
        <View style={s.fields}>
          {fields.map(f => (
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

        {/* Experience level */}
        <Text style={[s.label, { color: T.dim, marginBottom: 7 }]}>TRADING EXPERIENCE</Text>
        <View style={s.levels}>
          {LEVELS.map((r, i) => (
            <TouchableOpacity
              key={r}
              onPress={() => setLevel(i)}
              style={[
                s.levelBtn,
                {
                  backgroundColor: i === level ? `${ACC.blu}20` : T.surf2,
                  borderColor: i === level ? ACC.blu : T.bdr,
                },
              ]}
            >
              <Text style={[s.levelTxt, { color: i === level ? ACC.bluL : T.dim }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/verify')}
          style={{ marginTop: 24 }}
        >
          <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Create Account →</Text>
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
  safe:      { flex: 1 },
  scroll:    { padding: 20, paddingBottom: 40 },
  back:      { marginBottom: 16 },
  backTxt:   { fontSize: 16 },
  h1:        { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:       { fontSize: 13, marginBottom: 20 },
  social:    { flexDirection: 'row', gap: 9, marginBottom: 16 },
  socialBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  socialIcon:{ fontWeight: '800', fontSize: 14 },
  socialLbl: { fontSize: 13, fontWeight: '600' },
  divider:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  line:      { flex: 1, height: 1 },
  orTxt:     { fontSize: 11 },
  fields:    { gap: 10, marginBottom: 16 },
  label:     { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  input:     { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  levels:    { flexDirection: 'row', gap: 7, marginBottom: 24 },
  levelBtn:  { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelTxt:  { fontSize: 11, fontWeight: '600' },
  cta:       { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerTxt: { fontSize: 13 },
  footerLink:{ fontSize: 13, fontWeight: '600' },
});
