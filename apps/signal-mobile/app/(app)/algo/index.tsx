import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const STRATEGIES = [
  { emoji:'📈', name:'Trend Following', desc:'Ride sustained moves using EMAs & ADX',   diff:'Easy',   diffKey:'grn' },
  { emoji:'🚀', name:'Momentum',        desc:'Buy strength, RSI + volume surge entry',  diff:'Medium', diffKey:'ylw' },
  { emoji:'🔄', name:'Mean Reversion',  desc:'Buy the dip, Bollinger Bands bounce',     diff:'Medium', diffKey:'ylw' },
  { emoji:'⚡', name:'Breakout',         desc:'Catch range breakouts with ATR stops',    diff:'Hard',   diffKey:'red' },
];

const STATS = [['1,240+','Algos Built'],['21.3%','Avg Return'],['3.2K','Traders']];

export default function AlgoHub() {
  const { T, ACC, dark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={[s.icon, { backgroundColor: `${ACC.org}20` }]}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </View>
          <Text style={[s.iconLabel, { color: ACC.orgL }]}>ALGO BUILDER</Text>
          <Text style={[s.h1, { color: T.txt }]}>Build Your{'\n'}<Text style={{ color: ACC.org }}>Trading Algorithm</Text></Text>
          <Text style={[s.sub, { color: T.dim }]}>Powered by ML · Generates Python code · Deploy in minutes</Text>
          <View style={s.statsRow}>
            {STATS.map(([v, l]) => (
              <View key={l}>
                <Text style={[s.statVal, { color: T.txt }]}>{v}</Text>
                <Text style={[s.statLabel, { color: T.dim }]}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Strategy grid */}
        <View style={s.gridSection}>
          <Text style={[s.gridLabel, { color: T.dim }]}>CHOOSE STRATEGY TYPE</Text>
          <View style={s.grid}>
            {STRATEGIES.map((st, i) => (
              <TouchableOpacity
                key={st.name}
                onPress={() => router.push('/(app)/algo/params')}
                style={[
                  s.stratCard,
                  {
                    backgroundColor: i === 1 ? `${ACC.org}10` : T.surf,
                    borderColor: i === 1 ? ACC.org : T.bdr,
                  },
                ]}
              >
                <View style={s.stratTop}>
                  <Text style={{ fontSize: 22 }}>{st.emoji}</Text>
                  <View style={[s.diffBadge, { backgroundColor: `${ACC[st.diffKey as keyof typeof ACC]}18` }]}>
                    <Text style={[s.diffTxt, { color: ACC[st.diffKey as keyof typeof ACC] }]}>{st.diff}</Text>
                  </View>
                </View>
                <Text style={[s.stratName, { color: T.txt }]}>{st.name}</Text>
                <Text style={[s.stratDesc, { color: T.dim }]}>{st.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={s.ctas}>
          <TouchableOpacity onPress={() => router.push('/(app)/algo/params')}>
            <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryCta}>
              <Text style={s.primaryCtaTxt}>Start from Scratch →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryCta, { backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: T.bdr }]}>
            <Text style={[s.secondaryCtaTxt, { color: T.txt }]}>Use a Template</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  scroll:         { paddingBottom: 24 },
  header:         { padding: 18, paddingBottom: 12 },
  icon:           { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconLabel:      { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  h1:             { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, lineHeight: 33, marginBottom: 6 },
  sub:            { fontSize: 13, lineHeight: 20 },
  statsRow:       { flexDirection: 'row', gap: 20, marginTop: 12 },
  statVal:        { fontSize: 16, fontWeight: '800' },
  statLabel:      { fontSize: 10, marginTop: 1 },
  gridSection:    { paddingHorizontal: 14, marginBottom: 16 },
  gridLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 9 },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  stratCard:      { width: '48%', padding: 13, borderRadius: 14, borderWidth: 1, gap: 5 },
  stratTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  diffBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  diffTxt:        { fontSize: 9.5, fontWeight: '700' },
  stratName:      { fontSize: 13, fontWeight: '700' },
  stratDesc:      { fontSize: 11, lineHeight: 15 },
  ctas:           { paddingHorizontal: 14, gap: 9 },
  primaryCta:     { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryCtaTxt:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryCta:   { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryCtaTxt:{ fontSize: 14, fontWeight: '600' },
});
