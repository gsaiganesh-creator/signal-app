import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const CATS = [
  { id: 'momentum', label: 'Momentum',  emoji: '🚀', count: 5, stocks: ['RELIANCE','TATAMOTORS','SBIN','INDUSINDBK','ADANIENT'], desc: 'Strong uptrend + volume surge' },
  { id: 'swing',    label: 'Swingable', emoji: '🔄', count: 4, stocks: ['HDFCBANK','WIPRO','BAJFINANCE','LTIM'],                 desc: 'Range-bound, ideal for swing' },
  { id: 'longterm', label: 'Long Term', emoji: '🏛️', count: 5, stocks: ['TCS','INFY','HINDUNILVR','NESTLEIND','ASIANPAINT'],     desc: 'Strong fundamentals, hold ≥1Y' },
  { id: 'exit',     label: 'Exit Now',  emoji: '⚠️', count: 2, stocks: ['ZOMATO','PAYTM'],                                       desc: 'Below key support, weak signal' },
  { id: 'watch',    label: 'Watch',     emoji: '👁️', count: 2, stocks: ['COALINDIA','NTPC'],                                    desc: 'Consolidating — wait for entry' },
];

export default function Analysis() {
  const { T, ACC } = useTheme();

  const catColors = [ACC.grn, ACC.blu, ACC.pur, ACC.red, ACC.ylw];

  const DONUT = [
    { pct: 28, color: ACC.grn }, { pct: 22, color: ACC.blu },
    { pct: 28, color: ACC.pur }, { pct: 11, color: ACC.red }, { pct: 11, color: ACC.ylw },
  ];

  let cumOffset = 0;
  const r = 22, circ = 2 * Math.PI * r;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.headerRow}>
        <View>
          <Text style={[s.h1, { color: T.txt }]}>Portfolio Analysis</Text>
          <Text style={[s.sub, { color: T.dim }]}>18 stocks · Updated just now</Text>
        </View>
        <View style={[s.live, { backgroundColor: `${ACC.grn}15`, borderColor: `${ACC.grn}44` }]}>
          <Text style={[s.liveTxt, { color: ACC.grn }]}>ML ✓ Live</Text>
        </View>
      </View>

      {/* Donut summary */}
      <View style={[s.summary, { backgroundColor: T.surf, borderColor: T.bdr }]}>
        <Svg width={56} height={56} viewBox="0 0 56 56">
          {DONUT.map((seg, i) => {
            const offset = cumOffset;
            cumOffset += seg.pct;
            return (
              <Circle key={i} cx={28} cy={28} r={r} fill="none" stroke={seg.color} strokeWidth={9}
                strokeDasharray={`${circ * seg.pct / 100} ${circ * (1 - seg.pct / 100)}`}
                transform={`rotate(${offset * 3.6 - 90} 28 28)`} strokeLinecap="butt"
              />
            );
          })}
          <SvgText x={28} y={32} textAnchor="middle" fill={T.txt} fontSize={11} fontWeight="800" fontFamily="system-ui">18</SvgText>
        </Svg>
        <View style={s.legend}>
          {CATS.map((c, i) => (
            <View key={c.id} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: catColors[i] }]} />
              <Text style={[s.legendLbl, { color: T.dim }]}>{c.label}</Text>
              <Text style={[s.legendCount, { color: T.txt }]}>{c.count}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {CATS.map((cat, i) => (
          <View key={cat.id} style={[s.catCard, { backgroundColor: T.surf, borderColor: `${catColors[i]}30` }]}>
            <View style={[s.catHead, { borderBottomColor: T.bdr }]}>
              <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={s.catTitleRow}>
                  <Text style={[s.catTitle, { color: T.txt }]}>{cat.label}</Text>
                  <View style={[s.catBadge, { backgroundColor: `${catColors[i]}18` }]}>
                    <Text style={[s.catBadgeTxt, { color: catColors[i] }]}>{cat.count}</Text>
                  </View>
                </View>
                <Text style={[s.catDesc, { color: T.dim }]}>{cat.desc}</Text>
              </View>
              <Text style={[{ fontSize: 14, color: T.dim }]}>›</Text>
            </View>
            <View style={s.chips}>
              {cat.stocks.map(sym => (
                <View key={sym} style={[s.chip, { backgroundColor: `${catColors[i]}12`, borderColor: `${catColors[i]}2A` }]}>
                  <Text style={[s.chipTxt, { color: catColors[i] }]}>{sym}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 18, paddingBottom: 10 },
  h1:          { fontSize: 22, fontWeight: '800' },
  sub:         { fontSize: 12, marginTop: 3 },
  live:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  liveTxt:     { fontSize: 11, fontWeight: '700' },
  summary:     { marginHorizontal: 14, marginBottom: 10, padding: 11, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  legend:      { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, width: '48%' },
  legendDot:   { width: 7, height: 7, borderRadius: 2 },
  legendLbl:   { fontSize: 11, flex: 1 },
  legendCount: { fontSize: 11, fontWeight: '700' },
  list:        { paddingHorizontal: 14, gap: 8, paddingBottom: 20 },
  catCard:     { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  catHead:     { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderBottomWidth: 1 },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catTitle:    { fontSize: 14, fontWeight: '800' },
  catBadge:    { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  catBadgeTxt: { fontSize: 12, fontWeight: '700' },
  catDesc:     { fontSize: 11, marginTop: 2 },
  chips:       { padding: 9, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:        { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  chipTxt:     { fontSize: 11, fontWeight: '700' },
});
