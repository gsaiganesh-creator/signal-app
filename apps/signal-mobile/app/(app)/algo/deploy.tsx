import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const BROKERS = [
  { n:'Zerodha Kite',  c:'#387ED1', cost:'₹2,000/mo' },
  { n:'mStock',        c:'#E63946', cost:'₹500/mo' },
  { n:'Upstox',        c:'#7B2FBE', cost:'₹999/mo' },
  { n:'HDFC Sec',      c:'#004C8F', cost:'₹1,500/mo' },
];
const INFRA = [
  { p:'Raspberry Pi 4', one:'₹4,500*', mo:'₹0',     note:'24/7 home server', highlight: true },
  { p:'AWS t2.micro',   one:'Free',    mo:'₹850',    note:'12mo free tier' },
  { p:'DigitalOcean',   one:'Free',    mo:'₹600',    note:'Easy managed VPS' },
  { p:'Heroku',         one:'Free',    mo:'₹1,200',  note:'Beginner-friendly' },
];
const CMD_LINES = [
  { t:'# 1. Install dependencies', c:'#68D391' },
  { t:'pip install kiteconnect pandas numpy schedule', c:'#E2E8F0' },
  { t:'', c:'#ccc' },
  { t:'# 2. Set API credentials', c:'#68D391' },
  { t:'export KITE_API_KEY="your_api_key"', c:'#F6C90E' },
  { t:'export KITE_SECRET="your_api_secret"', c:'#F6C90E' },
  { t:'', c:'#ccc' },
  { t:'# 3. Run strategy', c:'#68D391' },
  { t:'python signal_rsi_ema.py --live', c:'#79C0FF' },
];

function StepNum({ n, color }: { n: string; color: string }) {
  return (
    <View style={[sn.wrap, { backgroundColor: `${color}22` }]}>
      <Text style={[sn.txt, { color }]}>{n}</Text>
    </View>
  );
}
const sn = StyleSheet.create({
  wrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txt:  { fontSize: 12, fontWeight: '800' },
});

export default function Deploy() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.h1, { color: T.txt }]}>Deploy Your Algo</Text>
          <Text style={[s.sub, { color: T.dim }]}>3 steps to go live on NSE/BSE</Text>
        </View>

        {/* Step 1 */}
        <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.stepHead}>
            <StepNum n="1" color={ACC.blu} />
            <Text style={[s.stepTitle, { color: T.txt }]}>Get Broker API Access</Text>
          </View>
          <View style={s.brokerGrid}>
            {BROKERS.map(b => (
              <View key={b.n} style={[s.brokerItem, { backgroundColor: `${b.c}12`, borderColor: `${b.c}30` }]}>
                <Text style={[s.brokerName, { color: b.c }]}>{b.n}</Text>
                <Text style={[s.brokerCost, { color: T.dim }]}>{b.cost}</Text>
              </View>
            ))}
          </View>
          <View style={[s.notice, { backgroundColor: `${ACC.ylw}0E`, borderColor: `${ACC.ylw}30` }]}>
            <Text style={[s.noticeTxt, { color: T.dim }]}>⏱ API approval takes 1–3 business days</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.stepHead}>
            <StepNum n="2" color={ACC.org} />
            <Text style={[s.stepTitle, { color: T.txt }]}>Choose Infrastructure</Text>
          </View>
          <View style={[s.infraTable, { borderColor: T.bdr }]}>
            <View style={[s.infraHeader, { backgroundColor: T.surf2 }]}>
              {['Platform','One-time','Monthly','Best for'].map(h => (
                <Text key={h} style={[s.infraTh, { color: T.dim }]}>{h}</Text>
              ))}
            </View>
            {INFRA.map((row, i) => (
              <View key={row.p} style={[s.infraRow, {
                backgroundColor: row.highlight ? `${ACC.grn}08` : i % 2 === 0 ? T.surf : T.bg,
                borderTopColor: T.bdr,
              }]}>
                <Text style={[s.infraPlatform, { color: row.highlight ? ACC.grn : T.txt }]}>{row.p}</Text>
                <Text style={[s.infraTd, { color: T.dim }]}>{row.one}</Text>
                <Text style={[s.infraMo, { color: row.highlight ? ACC.grn : T.txt }]}>{row.mo}</Text>
                <Text style={[s.infraNote, { color: T.dim }]}>{row.note}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.footNote, { color: T.dim }]}>*Raspberry Pi one-time hardware cost</Text>
        </View>

        {/* Step 3 */}
        <View style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.stepHead}>
            <StepNum n="3" color={ACC.grn} />
            <Text style={[s.stepTitle, { color: T.txt }]}>Run Your Script</Text>
          </View>
          <View style={s.terminal}>
            {CMD_LINES.map((line, i) => (
              <Text key={i} style={[s.cmdLine, { color: line.c }]}>
                {line.t || ' '}
              </Text>
            ))}
          </View>
        </View>

        {/* Cost summary */}
        <View style={[s.costCard, { backgroundColor: `${ACC.blu}0A`, borderColor: `${ACC.blu}25` }]}>
          <Text style={[s.costTitle, { color: T.txt }]}>💰 Estimated Monthly Cost</Text>
          <Text style={[s.costVal, { color: ACC.bluL }]}>₹600 – ₹3,200</Text>
          <Text style={[s.costSub, { color: T.dim }]}>Infrastructure + Broker API fees</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionHalf}>
            <LinearGradient colors={[ACC.blu, ACC.bluL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actionBtn}>
              <Text style={s.actionTxt}>📄 Download Guide</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionHalf, s.communityBtn, { backgroundColor: `${ACC.grn}14`, borderColor: `${ACC.grn}40` }]}>
            <Text style={[s.communityTxt, { color: ACC.grn }]}>👥 Join Community</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { padding: 14, paddingBottom: 28, gap: 10 },
  header:        { gap: 4 },
  backTxt:       { fontSize: 24, fontWeight: '300', marginBottom: 4 },
  h1:            { fontSize: 22, fontWeight: '800' },
  sub:           { fontSize: 13 },
  card:          { padding: 12, borderRadius: 14, borderWidth: 1, gap: 10 },
  stepHead:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepTitle:     { fontSize: 14, fontWeight: '700' },
  brokerGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  brokerItem:    { width: '48%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  brokerName:    { fontSize: 11.5, fontWeight: '700' },
  brokerCost:    { fontSize: 10 },
  notice:        { padding: 7, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1 },
  noticeTxt:     { fontSize: 11 },
  infraTable:    { borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  infraHeader:   { flexDirection: 'row', padding: 6, paddingHorizontal: 10, gap: 4 },
  infraTh:       { fontSize: 9.5, fontWeight: '700', flex: 1 },
  infraRow:      { flexDirection: 'row', padding: 7, paddingHorizontal: 10, gap: 4, borderTopWidth: 1, alignItems: 'center' },
  infraPlatform: { fontSize: 11, fontWeight: '700', flex: 1.4 },
  infraTd:       { fontSize: 11, flex: 0.8 },
  infraMo:       { fontSize: 11, fontWeight: '700', flex: 0.8 },
  infraNote:     { fontSize: 10, flex: 1.4 },
  footNote:      { fontSize: 10.5, marginTop: -4 },
  terminal:      { backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#21262D', borderRadius: 10, padding: 10, paddingHorizontal: 12 },
  cmdLine:       { fontSize: 10.5, lineHeight: 17, fontFamily: 'monospace' },
  costCard:      { padding: 11, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, gap: 2 },
  costTitle:     { fontSize: 11.5, fontWeight: '700' },
  costVal:       { fontSize: 20, fontWeight: '900' },
  costSub:       { fontSize: 11 },
  actionRow:     { flexDirection: 'row', gap: 9 },
  actionHalf:    { flex: 1 },
  actionBtn:     { height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionTxt:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  communityBtn:  { height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  communityTxt:  { fontSize: 13, fontWeight: '700' },
});
