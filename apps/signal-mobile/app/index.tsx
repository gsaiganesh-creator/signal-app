import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const { T, ACC, dark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      {/* Background glow blobs */}
      <View style={[s.blobTL, { backgroundColor: `rgba(23,64,245,${dark ? 0.18 : 0.08})` }]} />
      <View style={[s.blobBR, { backgroundColor: `rgba(255,92,26,${dark ? 0.14 : 0.07})` }]} />

      {/* Logo */}
      <View style={s.logoWrap}>
        <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logoBox}>
          <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
            <Polyline points="2,34 10,20 17,27 25,12 33,18 40,8" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={33} cy={18} r={4} fill={ACC.org} />
            <Circle cx={33} cy={18} r={8} fill={ACC.org} opacity={0.22} />
          </Svg>
        </LinearGradient>
        <View style={s.logoText}>
          <Text style={[s.brand, { color: T.txt }]}>SIGNAL</Text>
          <Text style={[s.sub, { color: T.dim }]}>NSE · BSE · ML-POWERED</Text>
        </View>
      </View>

      {/* Mini chart */}
      <View style={s.chart}>
        <Svg width={width - 48} height={90} viewBox={`0 0 ${width - 48} 90`} preserveAspectRatio="none">
          <Line x1={0} y1={28} x2={width - 48} y2={28} stroke={T.bdr} strokeWidth={0.7} />
          <Line x1={0} y1={56} x2={width - 48} y2={56} stroke={T.bdr} strokeWidth={0.7} />
          <Line x1={0} y1={80} x2={width - 48} y2={80} stroke={T.bdr} strokeWidth={0.7} />
          <Path
            d={`M0,78 C30,70 55,62 80,52 S130,36 160,30 S220,18 250,14 L${width - 80},8 L${width - 48},6 L${width - 48},90 L0,90Z`}
            fill={`rgba(23,64,245,${dark ? 0.18 : 0.08})`}
          />
          <Path
            d={`M0,78 C30,70 55,62 80,52 S130,36 160,30 S220,18 250,14 L${width - 80},8 L${width - 48},6`}
            stroke={ACC.blu} strokeWidth={2.2} fill="none" strokeLinecap="round"
          />
          <Circle cx={250} cy={14} r={5} fill={ACC.org} />
          <Circle cx={250} cy={14} r={10} fill={ACC.org} opacity={0.2} />
        </Svg>
      </View>

      {/* Badges */}
      <View style={s.badges}>
        {['📈 NSE/BSE', '🤖 ML Signals', '𝕏 Sentiment'].map(t => (
          <View key={t} style={[s.badge, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <Text style={[s.badgeTxt, { color: T.dim }]}>{t}</Text>
          </View>
        ))}
      </View>

      {/* CTA buttons */}
      <View style={s.btns}>
        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
          <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnPrimary}>
            <Text style={s.btnPrimaryTxt}>Portfolio Tracker →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(app)/algo/index')} style={{ marginTop: 9 }}>
          <LinearGradient colors={[ACC.org, ACC.orgL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnPrimary}>
            <Text style={s.btnPrimaryTxt}>⚙️ Algo Builder →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-in')}
          style={[s.btnSecondary, { backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: T.bdr }]}
        >
          <Text style={[s.btnSecondaryTxt, { color: T.txt }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  blobTL:       { position: 'absolute', top: -80, left: -80, width: 250, height: 250, borderRadius: 125 },
  blobBR:       { position: 'absolute', bottom: 60, right: -50, width: 220, height: 220, borderRadius: 110 },
  logoWrap:     { alignItems: 'center', gap: 12 },
  logoBox:      { width: 78, height: 78, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logoText:     { alignItems: 'center' },
  brand:        { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  sub:          { fontSize: 10.5, letterSpacing: 2.5, marginTop: 4 },
  chart:        { marginTop: 24, marginBottom: 16 },
  badges:       { flexDirection: 'row', gap: 7, justifyContent: 'center', marginBottom: 12 },
  badge:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeTxt:     { fontSize: 10 },
  btns:         { marginTop: 'auto' as any },
  btnPrimary:   { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: { height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 9 },
  btnSecondaryTxt: { fontSize: 14, fontWeight: '600' },
});
