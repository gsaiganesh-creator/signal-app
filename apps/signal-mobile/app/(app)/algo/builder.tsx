import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const ENTRY = [
  { label:'RSI',   op:'<',  value:'35',     note:'oversold' },
  { label:'EMA20', op:'>',  value:'EMA50',  note:'golden cross' },
];
const EXIT = [
  { label:'RSI',       op:'>',  value:'70',    note:'overbought' },
  { label:'Stop Loss', op:'=',  value:'2.5%',  note:'trail' },
  { label:'Target',    op:'=',  value:'6.0%',  note:'exit' },
];
const PERIODS = ['1Y','2Y','5Y'];
const LANGS = ['Python','Pine'];

export default function AlgoBuilder() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState('1Y');
  const [lang, setLang] = useState('Python');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.h1, { color: T.txt }]}>Build Algorithm</Text>
        </View>

        {/* Selected indicators */}
        <View style={s.chips}>
          {['RSI (14)','EMA 20/50'].map(p => (
            <View key={p} style={[s.chip, { backgroundColor: `${ACC.blu}18`, borderColor: `${ACC.blu}55` }]}>
              <Text style={[s.chipTxt, { color: ACC.bluL }]}>{p}</Text>
              <Text style={[s.chipX, { color: ACC.blu }]}>✕</Text>
            </View>
          ))}
        </View>

        {/* Entry conditions */}
        <View style={[s.condCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.condHead}>
            <View style={[s.condDot, { backgroundColor: ACC.grn }]} />
            <Text style={[s.condLabel, { color: ACC.grn }]}>BUY WHEN (entry)</Text>
          </View>
          {ENTRY.map((c, i) => (
            <View key={i} style={[s.condRow, { backgroundColor: `${ACC.grn}08`, borderColor: `${ACC.grn}22` }]}>
              <Text style={[s.condKey, { color: T.txt }]}>{c.label}</Text>
              <Text style={[s.condOp, { color: ACC.grn }]}>{c.op}</Text>
              <View style={[s.condVal, { backgroundColor: `${ACC.grn}18` }]}>
                <Text style={[s.condValTxt, { color: T.txt }]}>{c.value}</Text>
              </View>
              <Text style={[s.condNote, { color: T.dim }]}>({c.note})</Text>
            </View>
          ))}
          <Text style={[s.addCond, { color: ACC.bluL }]}>+ Add condition</Text>
        </View>

        {/* Exit conditions */}
        <View style={[s.condCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.condHead}>
            <View style={[s.condDot, { backgroundColor: ACC.red }]} />
            <Text style={[s.condLabel, { color: ACC.red }]}>SELL / EXIT WHEN</Text>
          </View>
          {EXIT.map((c, i) => (
            <View key={i} style={[s.condRow, { backgroundColor: `${ACC.red}08`, borderColor: `${ACC.red}22` }]}>
              <Text style={[s.condKeyWide, { color: T.txt }]}>{c.label}</Text>
              <Text style={[s.condOp, { color: ACC.red }]}>{c.op}</Text>
              <View style={[s.condVal, { backgroundColor: `${ACC.red}18` }]}>
                <Text style={[s.condValTxt, { color: T.txt }]}>{c.value}</Text>
              </View>
              <Text style={[s.condNote, { color: T.dim }]}>({c.note})</Text>
            </View>
          ))}
        </View>

        {/* Apply to */}
        <View style={s.configSection}>
          <Text style={[s.configLabel, { color: T.dim }]}>APPLY TO</Text>
          <View style={s.tagRow}>
            {['RELIANCE','HDFCBANK','+5 more'].map(sym => (
              <View key={sym} style={[
                s.symTag,
                sym === '+5 more'
                  ? { backgroundColor: T.surf2, borderColor: T.bdr }
                  : { backgroundColor: `${ACC.blu}14`, borderColor: `${ACC.blu}44` },
              ]}>
                <Text style={[s.symTxt, { color: sym === '+5 more' ? T.dim : ACC.bluL }]}>{sym}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Backtest + language */}
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={[s.configLabel, { color: T.dim }]}>BACKTEST</Text>
            <View style={s.tagRow}>
              {PERIODS.map((p, i) => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)}
                  style={[s.periodTag, { backgroundColor: p === period ? `${ACC.blu}20` : T.surf2, borderColor: p === period ? ACC.blu : T.bdr }]}>
                  <Text style={[s.periodTxt, { color: p === period ? ACC.bluL : T.dim }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.configLabel, { color: T.dim }]}>LANGUAGE</Text>
            <View style={s.tagRow}>
              {LANGS.map((l) => (
                <TouchableOpacity key={l} onPress={() => setLang(l)}
                  style={[s.periodTag, { backgroundColor: l === lang ? `${ACC.blu}20` : T.surf2, borderColor: l === lang ? ACC.blu : T.bdr }]}>
                  <Text style={[s.periodTxt, { color: l === lang ? ACC.bluL : T.dim }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push('/(app)/algo/code')} style={{ marginTop: 16, marginBottom: 8 }}>
          <LinearGradient colors={[ACC.org, ACC.orgL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Generate Code →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { padding: 16, paddingBottom: 28, gap: 12 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backTxt:      { fontSize: 24, fontWeight: '300' },
  h1:           { fontSize: 22, fontWeight: '800' },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipTxt:      { fontSize: 12, fontWeight: '700' },
  chipX:        { fontSize: 11, opacity: 0.7 },
  condCard:     { padding: 12, borderRadius: 13, borderWidth: 1, gap: 7 },
  condHead:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  condDot:      { width: 8, height: 8, borderRadius: 4 },
  condLabel:    { fontSize: 11.5, fontWeight: '700' },
  condRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1 },
  condKey:      { fontSize: 12, fontWeight: '700', minWidth: 40 },
  condKeyWide:  { fontSize: 12, fontWeight: '700', minWidth: 52 },
  condOp:       { fontSize: 12, fontWeight: '700' },
  condVal:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  condValTxt:   { fontSize: 12, fontWeight: '700' },
  condNote:     { fontSize: 11, flex: 1 },
  addCond:      { fontSize: 12, fontWeight: '600' },
  configSection:{ gap: 7 },
  configLabel:  { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  symTag:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  symTxt:       { fontSize: 12, fontWeight: '700' },
  twoCol:       { flexDirection: 'row', gap: 10 },
  periodTag:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  periodTxt:    { fontSize: 12, fontWeight: '700' },
  cta:          { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
