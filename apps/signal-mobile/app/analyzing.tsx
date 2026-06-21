import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { PBar } from '@/components/ui/PBar';

const STEPS = [
  { label: 'Parsing portfolio data',          done: true  },
  { label: 'Fetching NSE/BSE price history',  done: true  },
  { label: 'Running momentum model',          done: true  },
  { label: 'Analysing 𝕏 Twitter sentiment',  active: true },
  { label: 'Generating swing trade signals',  pending: true },
  { label: 'Computing risk scores',           pending: true },
];

export default function Analyzing() {
  const { T, ACC, dark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(app)');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      {/* Glow */}
      <View style={[s.glow, { backgroundColor: `rgba(23,64,245,${dark ? 0.1 : 0.05})` }]} />

      {/* Robot icon with progress ring */}
      <View style={s.topSection}>
        <View style={s.ringWrap}>
          <Svg width={86} height={86} viewBox="0 0 86 86" style={{ position: 'absolute' }}>
            <Circle cx={43} cy={43} r={37} stroke={T.surf2} strokeWidth={5} fill="none" />
            <Circle cx={43} cy={43} r={37} stroke={ACC.blu} strokeWidth={5} fill="none"
              strokeDasharray="175 58" strokeLinecap="round"
              transform="rotate(-90 43 43)"
            />
          </Svg>
          <Text style={s.robot}>🤖</Text>
        </View>
        <Text style={[s.h1, { color: T.txt }]}>ML Engine Running</Text>
        <Text style={[s.sub, { color: T.dim }]}>Analysing 18 stocks…</Text>
      </View>

      {/* Steps */}
      <View style={s.steps}>
        {STEPS.map((step, i) => (
          <View
            key={i}
            style={[
              s.step,
              step.active && { backgroundColor: `${ACC.blu}0E`, borderRadius: 12, borderWidth: 1, borderColor: ACC.blu },
            ]}
          >
            <View style={[
              s.dot,
              { backgroundColor: step.done ? `${ACC.grn}20` : step.active ? `${ACC.org}20` : T.surf2,
                borderColor: step.done ? ACC.grn : step.active ? ACC.org : T.bdr },
            ]}>
              {step.done && <Text style={{ fontSize: 9, color: ACC.grn }}>✓</Text>}
              {step.active && <View style={[s.dotInner, { backgroundColor: ACC.org }]} />}
            </View>
            <Text style={[s.stepTxt, { color: step.done ? T.dim : step.active ? T.txt : T.dim, fontWeight: step.active ? '700' : '400' }]}>
              {step.label}
            </Text>
            {step.active && <Text style={[s.dots, { color: ACC.org }]}>…</Text>}
          </View>
        ))}
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <Text style={[s.pct, { color: T.dim }]}>68% complete</Text>
        <PBar val={68} color={ACC.blu} h={7} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, paddingHorizontal: 24, paddingTop: 44, paddingBottom: 40 },
  glow:         { position: 'absolute', top: '20%', left: '20%', width: 260, height: 260, borderRadius: 130 },
  topSection:   { alignItems: 'center', gap: 12, marginBottom: 32 },
  ringWrap:     { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  robot:        { fontSize: 28 },
  h1:           { fontSize: 22, fontWeight: '800' },
  sub:          { fontSize: 13 },
  steps:        { gap: 8, flex: 1 },
  step:         { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9 },
  dot:          { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotInner:     { width: 6, height: 6, borderRadius: 3 },
  stepTxt:      { fontSize: 13, flex: 1 },
  dots:         { fontSize: 11, fontWeight: '700' },
  progressWrap: { gap: 6, marginTop: 16 },
  pct:          { fontSize: 11, textAlign: 'center' },
});
