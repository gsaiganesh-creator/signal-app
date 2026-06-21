import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

export default function Verify() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const digits = ['4', '7', '2', '', '', ''];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.wrap}>
        <View style={[s.iconWrap, { backgroundColor: `${ACC.blu}10`, borderColor: T.bdr }]}>
          <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <Rect x={3} y={8} width={30} height={20} rx={5} stroke={ACC.bluL} strokeWidth={2} />
            <Path d="M3 13 L18 22 L33 13" stroke={ACC.bluL} strokeWidth={2} strokeLinecap="round" />
            <Circle cx={27} cy={27} r={7.5} fill={T.bg} stroke={ACC.org} strokeWidth={2} />
            <Path d="M24.5 27 L27 29.5 L30.5 25" stroke={ACC.org} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        <Text style={[s.h1, { color: T.txt }]}>Verify your email</Text>
        <Text style={[s.sub, { color: T.dim }]}>OTP sent to{'\n'}<Text style={{ color: T.txt, fontWeight: '600' }}>vaasudev@signal.in</Text></Text>

        {/* OTP boxes */}
        <View style={s.otp}>
          {digits.map((v, i) => (
            <View
              key={i}
              style={[
                s.otpBox,
                {
                  backgroundColor: v ? `${ACC.blu}12` : T.surf,
                  borderColor: v ? ACC.blu : i === 3 ? ACC.org : T.bdr,
                },
              ]}
            >
              <Text style={[s.otpTxt, { color: v ? T.txt : ACC.org }]}>
                {v || (i === 3 ? '|' : '')}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/broker-connect')} style={{ opacity: 0.5 }}>
          <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Verify &amp; Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[s.resend, { color: T.dim }]}>
          Resend OTP in <Text style={{ color: T.txt, fontWeight: '600' }}>0:52</Text>
        </Text>

        <View style={[s.notice, { backgroundColor: `${ACC.grn}0C`, borderColor: `${ACC.grn}30` }]}>
          <Text style={{ fontSize: 15, marginRight: 9 }}>🔒</Text>
          <Text style={[s.noticeTxt, { color: ACC.grn }]}>
            2FA secured. SEBI-compliant data handling. Never share your OTP.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  wrap:      { flex: 1, padding: 24, paddingTop: 44, alignItems: 'center', gap: 22 },
  iconWrap:  { width: 74, height: 74, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  h1:        { fontSize: 23, fontWeight: '800' },
  sub:       { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  otp:       { flexDirection: 'row', gap: 9 },
  otpBox:    { width: 46, height: 56, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  otpTxt:    { fontSize: 22, fontWeight: '700' },
  cta:       { width: 280, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend:    { fontSize: 13 },
  notice:    { flexDirection: 'row', alignItems: 'flex-start', padding: 11, borderRadius: 13, borderWidth: 1, width: '100%' },
  noticeTxt: { fontSize: 11.5, lineHeight: 17, flex: 1 },
});
