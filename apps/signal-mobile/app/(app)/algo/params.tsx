import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spark } from '@/components/ui/Spark';

const PARAMS = [
  { id:'rsi',   name:'RSI (14)',         sub:'Overbought / Oversold momentum',     diff:'Easy',   diffKey:'grn', data:[50,42,35,40,55,68,72,65,58,50] },
  { id:'macd',  name:'MACD (12,26,9)',   sub:'Trend + momentum crossover signal',  diff:'Medium', diffKey:'ylw', data:[2,-1,0,3,5,4,2,-2,-4,-1] },
  { id:'ema',   name:'EMA / SMA',        sub:'Smooths price, identifies trend',    diff:'Easy',   diffKey:'grn', data:[40,42,44,46,45,47,49,50,52,54] },
  { id:'bb',    name:'Bollinger Bands',  sub:'Volatility bands for range trading', diff:'Medium', diffKey:'ylw', data:[48,55,62,58,50,44,46,54,60,56] },
  { id:'vol',   name:'Volume Analysis',  sub:'Confirms moves with delivery %',     diff:'Easy',   diffKey:'grn', data:[20,35,28,40,60,45,30,50,70,55] },
  { id:'adx',   name:'ADX',              sub:'Measures strength of the trend',     diff:'Hard',   diffKey:'red', data:[15,18,22,28,32,35,38,40,36,34] },
  { id:'stoch', name:'Stochastic',       sub:'Overbought/sold in ranging markets', diff:'Medium', diffKey:'ylw', data:[80,75,62,45,38,35,42,55,65,72] },
  { id:'atr',   name:'ATR',              sub:'Volatility-based stop loss sizing',  diff:'Medium', diffKey:'ylw', data:[12,14,18,16,20,22,19,17,15,16] },
];

export default function ParamExplorer() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [added, setAdded] = useState<Set<string>>(new Set(['rsi','ema']));

  const toggle = (id: string) => {
    setAdded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.h1, { color: T.txt }]}>Select Indicators</Text>
        <Text style={[s.sub, { color: T.dim }]}>Choose 2+ to build your algorithm</Text>
        <View style={s.chips}>
          {PARAMS.filter(p => added.has(p.id)).map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => toggle(p.id)}
              style={[s.chip, { backgroundColor: `${ACC.blu}18`, borderColor: `${ACC.blu}55` }]}
            >
              <Text style={[s.chipTxt, { color: ACC.bluL }]}>{p.name.split(' ')[0]}</Text>
              <Text style={[s.chipX, { color: ACC.blu }]}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {PARAMS.map(p => {
          const isAdded = added.has(p.id);
          return (
            <View key={p.id} style={[
              s.paramRow,
              { backgroundColor: isAdded ? `${ACC.blu}08` : T.surf, borderColor: isAdded ? ACC.blu : T.bdr },
            ]}>
              <View style={s.paramInfo}>
                <View style={s.paramTitleRow}>
                  <Text style={[s.paramName, { color: T.txt }]}>{p.name}</Text>
                  <View style={[s.diffBadge, { backgroundColor: `${ACC[p.diffKey as keyof typeof ACC]}18` }]}>
                    <Text style={[s.diffTxt, { color: ACC[p.diffKey as keyof typeof ACC] }]}>{p.diff}</Text>
                  </View>
                </View>
                <Text style={[s.paramSub, { color: T.dim }]}>{p.sub}</Text>
              </View>
              <Spark data={p.data} color={isAdded ? ACC.blu : T.dim} w={52} h={22} />
              <TouchableOpacity
                onPress={() => toggle(p.id)}
                style={[s.addBtn, {
                  backgroundColor: isAdded ? ACC.blu : `${ACC.blu}14`,
                  borderColor: isAdded ? ACC.blu : T.bdr,
                }]}
              >
                <Text style={[s.addTxt, { color: isAdded ? '#fff' : ACC.bluL }]}>
                  {isAdded ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={() => router.push('/(app)/algo/builder')}>
          <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Build Algo ({added.size} selected) →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { padding: 16, paddingBottom: 8 },
  backBtn:       { marginBottom: 4 },
  backTxt:       { fontSize: 24, fontWeight: '300' },
  h1:            { fontSize: 22, fontWeight: '800' },
  sub:           { fontSize: 13, marginTop: 4 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipTxt:       { fontSize: 12, fontWeight: '700' },
  chipX:         { fontSize: 11, opacity: 0.7 },
  list:          { padding: 14, paddingTop: 4, gap: 8 },
  paramRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: 13, borderWidth: 1 },
  paramInfo:     { flex: 1 },
  paramTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  paramName:     { fontSize: 13, fontWeight: '700' },
  diffBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  diffTxt:       { fontSize: 9.5, fontWeight: '700' },
  paramSub:      { fontSize: 11, marginTop: 2 },
  addBtn:        { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addTxt:        { fontSize: 14, fontWeight: '700' },
  footer:        { padding: 14, paddingBottom: 20 },
  cta:           { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:        { color: '#fff', fontSize: 15, fontWeight: '700' },
});
