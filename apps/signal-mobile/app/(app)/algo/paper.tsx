import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const STRATEGIES = [
  { id:'rsi_ema', name:'RSI + EMA Momentum', ret:'+8.4%', day:'Day 6/7', win:'71% win', active:true },
  { id:'mom',     name:'Momentum Breakout',  ret:'+2.1%', day:'Day 2/7', win:'60% win', active:false },
];

const LOG = [
  { date:'Jun 19 · 09:31', sym:'RELIANCE', sig:'BUY',  entry:'₹2,880', exit:'—',      pl:'Running',  status:'OPEN', ok:null },
  { date:'Jun 18 · 14:22', sym:'INFY',     sig:'SELL', entry:'₹1,450', exit:'₹1,498', pl:'+₹2,340', status:'WIN',  ok:true },
  { date:'Jun 17 · 10:15', sym:'SBIN',     sig:'BUY',  entry:'₹808',   exit:'₹838',   pl:'+₹1,800', status:'WIN',  ok:true },
  { date:'Jun 17 · 09:45', sym:'WIPRO',    sig:'BUY',  entry:'₹492',   exit:'₹482',   pl:'-₹600',   status:'SL',   ok:false },
  { date:'Jun 16 · 11:30', sym:'TATAMOTORS',sig:'BUY', entry:'₹940',   exit:'₹975',   pl:'+₹1,750', status:'WIN',  ok:true },
];

const CURVE = [100000,101200,102800,104100,103400,105600,106800,108420];

export default function PaperTrading() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [active, setActive] = useState('rsi_ema');

  const W = 320, H = 60;
  const mn = Math.min(...CURVE), mx = Math.max(...CURVE), rng = mx - mn;
  const pts = CURVE.map((v, i) => `${(i / (CURVE.length - 1)) * W},${H - 4 - ((v - mn) / rng) * (H - 8)}`).join(' ');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: T.txt }]}>Paper Trading</Text>
        <View style={[s.betaBadge, { backgroundColor: `${ACC.pur}18`, borderColor: `${ACC.pur}44` }]}>
          <Text style={[s.betaTxt, { color: ACC.pur }]}>VIRTUAL</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Strategy selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stratRow}>
          {STRATEGIES.map(st => (
            <TouchableOpacity key={st.id} onPress={() => setActive(st.id)}
              style={[s.stratTab, {
                backgroundColor: active === st.id ? `${ACC.blu}18` : T.surf,
                borderColor: active === st.id ? ACC.blu : T.bdr,
              }]}>
              <Text style={[s.stratName, { color: active === st.id ? ACC.bluL : T.txt }]}>{st.name}</Text>
              <View style={s.stratMeta}>
                <Text style={[s.stratRet, { color: ACC.grn }]}>{st.ret}</Text>
                <Text style={[s.stratDay, { color: T.dim }]}>{st.day}</Text>
                <Text style={[s.stratWin, { color: T.dim }]}>{st.win}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.addStratBtn, { backgroundColor: `${ACC.org}10`, borderColor: `${ACC.org}44` }]}>
            <Text style={{ color: ACC.org, fontSize: 16 }}>+</Text>
            <Text style={[s.addStratTxt, { color: ACC.org }]}>Add strategy</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {[
            { l:'Virtual Portfolio', v:'₹1,08,420', c: ACC.grn, sub:'Started at ₹1,00,000' },
            { l:'Paper Returns',     v:'+8.4%',     c: ACC.grn, sub:'+₹8,420 virtual P&L' },
            { l:'Win Rate',          v:'71%',        c: ACC.bluL, sub:'5 wins · 2 losses' },
            { l:'Time Running',      v:'Day 6/7',    c: T.txt,   sub:'1 day remaining' },
          ].map(st => (
            <View key={st.l} style={[s.statCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.statLabel, { color: T.dim }]}>{st.l}</Text>
              <Text style={[s.statVal, { color: st.c }]}>{st.v}</Text>
              <Text style={[s.statSub, { color: T.dim }]}>{st.sub}</Text>
            </View>
          ))}
        </View>

        {/* Equity curve */}
        <View style={[s.curveCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <View style={s.curveHead}>
            <Text style={[s.curveTitle, { color: T.txt }]}>Virtual Equity Curve</Text>
            <Text style={[s.curveChg, { color: ACC.grn }]}>▲ +₹8,420 (8.4%)</Text>
          </View>
          <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <Line x1={0} y1={H - 4 - ((100000 - mn) / rng) * (H - 8)} x2={W} y2={H - 4 - ((100000 - mn) / rng) * (H - 8)}
              stroke={T.bdr} strokeWidth={1} strokeDasharray="4 4" />
            <Polyline points={pts} fill="none" stroke={ACC.grn} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View style={s.curveDates}>
            {['Jun 13','Jun 14','Jun 16','Jun 17','Jun 18','Jun 19'].map(d => (
              <Text key={d} style={[s.curveDate, { color: T.dim }]}>{d}</Text>
            ))}
          </View>
        </View>

        {/* Signal log */}
        <View style={[s.logCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <Text style={[s.logTitle, { color: T.txt }]}>Signal Log · 7 signals fired</Text>
          <View style={[s.logHeader, { borderBottomColor: T.bdr }]}>
            {['Date & Time','Stock','Signal','Entry','Exit','P&L','Status'].map(h => (
              <Text key={h} style={[s.logTh, { color: T.dim }]}>{h}</Text>
            ))}
          </View>
          {LOG.map((row, i) => (
            <View key={i} style={[s.logRow, { borderBottomColor: T.bdr }]}>
              <Text style={[s.logDate, { color: T.dim }]}>{row.date}</Text>
              <Text style={[s.logSym, { color: T.txt }]}>{row.sym}</Text>
              <View style={[s.logSig, { backgroundColor: row.sig === 'BUY' ? `${ACC.grn}18` : `${ACC.red}18` }]}>
                <Text style={[s.logSigTxt, { color: row.sig === 'BUY' ? ACC.grn : ACC.red }]}>{row.sig}</Text>
              </View>
              <Text style={[s.logPrice, { color: T.dim }]}>{row.entry}</Text>
              <Text style={[s.logPrice, { color: T.dim }]}>{row.exit}</Text>
              <Text style={[s.logPL, { color: row.ok === true ? ACC.grn : row.ok === false ? ACC.red : T.dim }]}>{row.pl}</Text>
              <View style={[s.logStatus, {
                backgroundColor: row.ok === true ? `${ACC.grn}15` : row.ok === false ? `${ACC.red}15` : `${ACC.blu}15`,
              }]}>
                <Text style={[s.logStatusTxt, { color: row.ok === true ? ACC.grn : row.ok === false ? ACC.red : ACC.bluL }]}>
                  {row.ok === true ? '✅ WIN' : row.ok === false ? '⛔ SL' : '⏳ OPEN'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.note, { backgroundColor: `${ACC.pur}09`, borderColor: `${ACC.pur}28` }]}>
          <Text style={[s.noteTxt, { color: T.dim }]}>
            🧪 Paper trading uses <Text style={{ color: T.txt, fontWeight: '600' }}>live NSE/BSE data</Text> with virtual capital. No real money. Test your strategy for 7 days before going live.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  navBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  backTxt:       { fontSize: 24, fontWeight: '300' },
  navTitle:      { fontSize: 16, fontWeight: '800' },
  betaBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  betaTxt:       { fontSize: 10, fontWeight: '800' },
  scroll:        { paddingBottom: 28, gap: 12 },
  stratRow:      { paddingHorizontal: 13, gap: 9 },
  stratTab:      { padding: 11, borderRadius: 13, borderWidth: 1, minWidth: 160, gap: 4 },
  stratName:     { fontSize: 12, fontWeight: '700' },
  stratMeta:     { flexDirection: 'row', gap: 7, marginTop: 2 },
  stratRet:      { fontSize: 11, fontWeight: '700' },
  stratDay:      { fontSize: 11 },
  stratWin:      { fontSize: 11 },
  addStratBtn:   { padding: 11, borderRadius: 13, borderWidth: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addStratTxt:   { fontSize: 12, fontWeight: '700' },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 13 },
  statCard:      { width: '47%', padding: 11, borderRadius: 13, borderWidth: 1 },
  statLabel:     { fontSize: 10, marginBottom: 4 },
  statVal:       { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statSub:       { fontSize: 10, marginTop: 3 },
  curveCard:     { marginHorizontal: 13, padding: 13, borderRadius: 13, borderWidth: 1 },
  curveHead:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  curveTitle:    { fontSize: 13, fontWeight: '700' },
  curveChg:      { fontSize: 12, fontWeight: '700' },
  curveDates:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  curveDate:     { fontSize: 9.5 },
  logCard:       { marginHorizontal: 13, padding: 13, borderRadius: 13, borderWidth: 1 },
  logTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  logHeader:     { flexDirection: 'row', paddingBottom: 7, borderBottomWidth: 1 },
  logTh:         { fontSize: 9, fontWeight: '700', flex: 1 },
  logRow:        { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, alignItems: 'center' },
  logDate:       { fontSize: 9, flex: 1.4 },
  logSym:        { fontSize: 10, fontWeight: '700', flex: 1 },
  logSig:        { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, flex: 0.8, alignItems: 'center' },
  logSigTxt:     { fontSize: 9, fontWeight: '800' },
  logPrice:      { fontSize: 10, flex: 0.9 },
  logPL:         { fontSize: 10, fontWeight: '700', flex: 1 },
  logStatus:     { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, flex: 1, alignItems: 'center' },
  logStatusTxt:  { fontSize: 9, fontWeight: '700' },
  note:          { marginHorizontal: 13, padding: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  noteTxt:       { fontSize: 11, lineHeight: 17 },
});
