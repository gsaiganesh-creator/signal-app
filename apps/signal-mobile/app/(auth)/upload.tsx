import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const COLS = ['Stock Name', 'Symbol', 'Qty', 'Avg Cost ₹', 'Exchange'];
const ROWS = [
  ['Reliance Industries', 'RELIANCE', '50', '2,840', 'NSE'],
  ['HDFC Bank',           'HDFCBANK', '30', '1,610', 'NSE'],
  ['Infosys Ltd',         'INFY',     '45', '1,420', 'NSE'],
];

export default function ExcelUpload() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Upload Portfolio</Text>
        <Text style={[s.sub, { color: T.dim }]}>Upload your holdings as .xlsx or .csv</Text>

        {/* Drop zone */}
        <View style={[s.dropzone, { backgroundColor: `${ACC.blu}08`, borderColor: `${ACC.blu}55` }]}>
          <View style={[s.dropIcon, { backgroundColor: `${ACC.blu}14` }]}>
            <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
              <Path d="M13 3 L13 17 M7 9 L13 3 L19 9" stroke={ACC.bluL} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M4 19 L4 22 Q4 23 5 23 L21 23 Q22 23 22 22 L22 19" stroke={ACC.bluL} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={[s.dropH, { color: T.txt }]}>Tap to upload .xlsx / .csv</Text>
          <Text style={[s.dropSub, { color: T.dim }]}>NSE / BSE symbol format supported</Text>
          <TouchableOpacity style={[s.chooseBtn, { backgroundColor: ACC.blu }]}>
            <Text style={s.chooseTxt}>Choose File</Text>
          </TouchableOpacity>
        </View>

        {/* Template download */}
        <View style={[s.template, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <Text style={{ fontSize: 22 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.tmplH, { color: T.txt }]}>Download Template</Text>
            <Text style={[s.tmplSub, { color: T.dim }]}>Pre-formatted Excel with examples</Text>
          </View>
          <View style={[s.xlsxBtn, { backgroundColor: `${ACC.org}18`, borderColor: `${ACC.org}44` }]}>
            <Text style={[s.xlsxTxt, { color: ACC.orgL }]}>↓ .xlsx</Text>
          </View>
        </View>

        {/* Preview table */}
        <Text style={[s.sectionLbl, { color: T.dim }]}>TEMPLATE PREVIEW</Text>
        <View style={[s.table, { borderColor: T.bdr }]}>
          {/* header */}
          <View style={[s.tableRow, { backgroundColor: T.surf2 }]}>
            {COLS.map(c => (
              <Text key={c} style={[s.thCell, { color: T.dim }]} numberOfLines={1}>{c}</Text>
            ))}
          </View>
          {ROWS.map((row, ri) => (
            <View key={ri} style={[s.tableRow, { backgroundColor: ri % 2 === 0 ? T.surf : T.bg, borderTopWidth: 1, borderTopColor: T.bdr }]}>
              {row.map((cell, ci) => (
                <Text key={ci} style={[s.tdCell, { color: ci === 0 ? T.txt : T.dim, fontWeight: ci === 1 ? '700' : '400' }]} numberOfLines={1}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.push('/analyzing')} style={{ marginTop: 24 }}>
          <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
            <Text style={s.ctaTxt}>Analyse Portfolio →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  scroll:     { padding: 18, paddingBottom: 40 },
  back:       { marginBottom: 12 },
  backTxt:    { fontSize: 16 },
  h1:         { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  sub:        { fontSize: 13, marginBottom: 16 },
  dropzone:   { padding: 20, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 10, marginBottom: 12 },
  dropIcon:   { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dropH:      { fontSize: 14, fontWeight: '700' },
  dropSub:    { fontSize: 11 },
  chooseBtn:  { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 10 },
  chooseTxt:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  template:   { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: 13, borderWidth: 1, marginBottom: 16 },
  tmplH:      { fontSize: 13, fontWeight: '600' },
  tmplSub:    { fontSize: 11, marginTop: 2 },
  xlsxBtn:    { padding: 6, borderRadius: 8, borderWidth: 1 },
  xlsxTxt:    { fontSize: 11.5, fontWeight: '700' },
  sectionLbl: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 7 },
  table:      { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  tableRow:   { flexDirection: 'row', paddingHorizontal: 11, paddingVertical: 7 },
  thCell:     { flex: 1, fontSize: 9.5, fontWeight: '700' },
  tdCell:     { flex: 1, fontSize: 10.5 },
  cta:        { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
