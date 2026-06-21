import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const ACCOUNTS = [
  { id:'kite',   n:'Zerodha Kite',     ab:'ZE', c:'#387ED1', val:'₹4,21,840', chg:'+₹8,240',  pct:'+2.0%', cnt:12, pl:'+₹34,240', status:'synced',   synced:'2m ago' },
  { id:'hdfc',   n:'HDFC Securities',  ab:'HD', c:'#004C8F', val:'₹2,84,160', chg:'+₹3,120',  pct:'+1.1%', cnt:8,  pl:'+₹18,600', status:'uploaded', synced:'Manually uploaded' },
  { id:'mstock', n:'MStock',           ab:'MS', c:'#E63946', val:'₹1,36,316', chg:'+₹1,482',  pct:'+1.1%', cnt:6,  pl:'+₹12,840', status:'synced',   synced:'5m ago' },
];

const COMBINED = [
  { sym:'RELIANCE', name:'Reliance Ind.',       qty:50,  avg:'₹2,840', curr:'₹2,912', pl:'+₹3,600', pct:'+2.5%', accts:['ZE','HD'], up:true },
  { sym:'HDFCBANK', name:'HDFC Bank',           qty:45,  avg:'₹1,580', curr:'₹1,634', pl:'+₹2,430', pct:'+3.4%', accts:['ZE','MS'], up:true },
  { sym:'INFY',     name:'Infosys',             qty:65,  avg:'₹1,380', curr:'₹1,441', pl:'+₹3,965', pct:'+4.4%', accts:['HD','ZE'], up:true },
  { sym:'TCS',      name:'TCS',                 qty:20,  avg:'₹3,820', curr:'₹3,960', pl:'+₹2,800', pct:'+3.7%', accts:['MS'],      up:true },
  { sym:'SBIN',     name:'State Bank of India', qty:80,  avg:'₹785',   curr:'₹812',   pl:'+₹2,160', pct:'+3.4%', accts:['ZE','HD','MS'], up:true },
  { sym:'ZOMATO',   name:'Zomato Ltd',          qty:200, avg:'₹220',   curr:'₹198',   pl:'-₹4,400', pct:'-10.0%', accts:['HD'],     up:false },
  { sym:'WIPRO',    name:'Wipro Ltd',           qty:30,  avg:'₹512',   curr:'₹490',   pl:'-₹660',  pct:'-4.3%', accts:['MS'],       up:false },
];

export default function Portfolio() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [view, setView] = useState<'individual'|'combined'>('individual');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: T.txt }]}>My Portfolios</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/portfolio/investors')}>
          <Text style={[s.aceBtn, { color: ACC.pur }]}>Ace Investors</Text>
        </TouchableOpacity>
      </View>

      {/* Combined summary */}
      <LinearGradient colors={T.cardGrad} style={[s.summaryCard, { borderColor: T.bdr }]}>
        <Text style={[s.summaryMeta, { color: T.dim }]}>COMBINED VALUE · 3 ACCOUNTS · 26 STOCKS</Text>
        <Text style={[s.summaryVal, { color: T.txt }]}>₹8,42,316</Text>
        <Text style={[s.summaryChg, { color: ACC.grn }]}>▲ +₹12,842 (+1.55%) Today</Text>
        <View style={s.summaryStats}>
          {[['Invested','₹7,21,480'],['Total P&L','+₹65,680'],['XIRR','16.7%']].map(([k,v]) => (
            <View key={k}>
              <Text style={[s.sumStatKey, { color: T.dim }]}>{k}</Text>
              <Text style={[s.sumStatVal, { color: T.txt }]}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={s.acctDots}>
          {ACCOUNTS.map(a => (
            <View key={a.id} style={s.dotItem}>
              <View style={[s.dot, { backgroundColor: a.c }]} />
              <Text style={[s.dotLabel, { color: T.dim }]}>{a.ab}</Text>
              <Text style={[s.dotVal, { color: T.txt }]}>{a.val}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* View toggle */}
      <View style={s.toggleWrap}>
        <View style={[s.toggleBar, { backgroundColor: T.surf2 }]}>
          {(['individual','combined'] as const).map(v => (
            <TouchableOpacity key={v} onPress={() => setView(v)}
              style={[s.toggleBtn, view === v && { backgroundColor: ACC.blu }]}>
              <Text style={[s.toggleTxt, { color: view === v ? '#fff' : T.dim }]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {view === 'individual' ? (
          <>
            {ACCOUNTS.map(acc => (
              <View key={acc.id} style={[s.acctCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
                <View style={s.acctHead}>
                  <View style={[s.acctAvatar, { backgroundColor: `${acc.c}20`, borderColor: `${acc.c}40` }]}>
                    <Text style={[s.acctAb, { color: acc.c }]}>{acc.ab}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.acctName, { color: T.txt }]}>{acc.n}</Text>
                    <View style={s.syncRow}>
                      <View style={[s.syncDot, { backgroundColor: acc.status === 'synced' ? ACC.grn : ACC.ylw }]} />
                      <Text style={[s.syncTxt, { color: T.dim }]}>
                        {acc.status === 'synced' ? 'Live sync' : 'Manual upload'} · {acc.synced}
                      </Text>
                    </View>
                  </View>
                  <View style={s.acctVal}>
                    <Text style={[s.acctValTxt, { color: T.txt }]}>{acc.val}</Text>
                    <Text style={[s.acctChg, { color: ACC.grn }]}>{acc.chg}</Text>
                  </View>
                </View>
                <View style={s.acctStats}>
                  {[['Stocks', String(acc.cnt)],['P&L', acc.pl],['Return', acc.pct]].map(([k, v]) => (
                    <View key={k} style={[s.acctStat, { backgroundColor: T.surf2 }]}>
                      <Text style={[s.acctStatKey, { color: T.dim }]}>{k}</Text>
                      <Text style={[s.acctStatVal, { color: T.txt }]}>{v}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.acctBtns}>
                  <TouchableOpacity style={[s.viewBtn, { backgroundColor: `${ACC.blu}14`, borderColor: `${ACC.blu}44` }]}>
                    <Text style={[s.viewBtnTxt, { color: ACC.blu }]}>View Holdings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.syncBtn, { backgroundColor: T.surf2, borderColor: T.bdr }]}>
                    <Text style={[s.syncBtnTxt, { color: T.dim }]}>{acc.status === 'synced' ? 'Re-sync' : 'Upload'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[s.addAcct, { backgroundColor: `${ACC.org}10`, borderColor: `${ACC.org}44` }]}>
              <Text style={{ fontSize: 18, color: ACC.org, lineHeight: 22 }}>+</Text>
              <Text style={[s.addAcctTxt, { color: ACC.org }]}>Add Another Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[s.combinedNote, { backgroundColor: `${ACC.grn}09`, borderColor: `${ACC.grn}22` }]}>
              <Text style={[s.combinedNoteTxt, { color: T.dim }]}>
                <Text style={{ color: T.txt, fontWeight: '700' }}>26 unique positions</Text> across 3 accounts · Overlaps consolidated · Avg cost recalculated
              </Text>
            </View>
            <View style={s.tableHead}>
              {['Stock','Accounts','P&L'].map(h => (
                <Text key={h} style={[s.tableHeadTxt, { color: T.dim }]}>{h}</Text>
              ))}
            </View>
            {COMBINED.map(row => (
              <View key={row.sym} style={[s.combinedRow, {
                backgroundColor: T.surf,
                borderColor: row.up ? `${ACC.grn}20` : `${ACC.red}20`,
              }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowSym, { color: T.txt }]}>{row.sym}</Text>
                  <Text style={[s.rowName, { color: T.dim }]} numberOfLines={1}>{row.name} · ×{row.qty}</Text>
                  <View style={s.rowPrices}>
                    <Text style={[s.rowPriceTxt, { color: T.dim }]}>Avg {row.avg}</Text>
                    <Text style={[s.rowPriceTxt, { color: T.dim }]}>CMP {row.curr}</Text>
                  </View>
                </View>
                <View style={s.rowAccts}>
                  {row.accts.map(ab => {
                    const ac = ACCOUNTS.find(x => x.ab === ab);
                    return (
                      <View key={ab} style={[s.rowAcctTag, { backgroundColor: `${ac?.c ?? '#888'}20`, borderColor: `${ac?.c ?? '#888'}40` }]}>
                        <Text style={[s.rowAcctTxt, { color: ac?.c ?? T.dim }]}>{ab}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.rowPL}>
                  <Text style={[s.rowPLVal, { color: row.up ? ACC.grn : ACC.red }]}>{row.pl}</Text>
                  <Text style={[s.rowPLPct, { color: row.up ? ACC.grn : ACC.red }]}>{row.pct}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  navBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  backTxt:       { fontSize: 24, fontWeight: '300' },
  navTitle:      { fontSize: 16, fontWeight: '800' },
  aceBtn:        { fontSize: 12, fontWeight: '700' },
  summaryCard:   { marginHorizontal: 13, marginBottom: 8, padding: 13, borderRadius: 16, borderWidth: 1 },
  summaryMeta:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  summaryVal:    { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginBottom: 2 },
  summaryChg:    { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  summaryStats:  { flexDirection: 'row', gap: 14, marginBottom: 8 },
  sumStatKey:    { fontSize: 9.5 },
  sumStatVal:    { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
  acctDots:      { flexDirection: 'row', gap: 10 },
  dotItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:           { width: 7, height: 7, borderRadius: 2 },
  dotLabel:      { fontSize: 9.5 },
  dotVal:        { fontSize: 9.5, fontWeight: '600' },
  toggleWrap:    { paddingHorizontal: 13, marginBottom: 8 },
  toggleBar:     { flexDirection: 'row', padding: 3, borderRadius: 12, gap: 2 },
  toggleBtn:     { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  toggleTxt:     { fontSize: 13, fontWeight: '700' },
  list:          { paddingHorizontal: 13, paddingBottom: 24, gap: 9 },
  acctCard:      { padding: 13, borderRadius: 15, borderWidth: 1 },
  acctHead:      { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
  acctAvatar:    { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  acctAb:        { fontSize: 13, fontWeight: '900' },
  acctName:      { fontSize: 14, fontWeight: '700' },
  syncRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  syncDot:       { width: 6, height: 6, borderRadius: 3 },
  syncTxt:       { fontSize: 10 },
  acctVal:       { alignItems: 'flex-end' },
  acctValTxt:    { fontSize: 15, fontWeight: '800' },
  acctChg:       { fontSize: 11, fontWeight: '700' },
  acctStats:     { flexDirection: 'row', gap: 7, marginBottom: 9 },
  acctStat:      { flex: 1, padding: 7, borderRadius: 9, alignItems: 'center' },
  acctStatKey:   { fontSize: 9.5 },
  acctStatVal:   { fontSize: 12, fontWeight: '700', marginTop: 1 },
  acctBtns:      { flexDirection: 'row', gap: 7 },
  viewBtn:       { flex: 1, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  viewBtnTxt:    { fontSize: 12, fontWeight: '700' },
  syncBtn:       { flex: 1, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  syncBtnTxt:    { fontSize: 12, fontWeight: '700' },
  addAcct:       { height: 46, borderRadius: 13, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addAcctTxt:    { fontSize: 13, fontWeight: '700' },
  combinedNote:  { padding: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  combinedNoteTxt:{ fontSize: 11, lineHeight: 17 },
  tableHead:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  tableHeadTxt:  { fontSize: 10, fontWeight: '700' },
  combinedRow:   { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1 },
  rowSym:        { fontSize: 13, fontWeight: '800' },
  rowName:       { fontSize: 10.5 },
  rowPrices:     { flexDirection: 'row', gap: 6, marginTop: 2 },
  rowPriceTxt:   { fontSize: 9.5 },
  rowAccts:      { flexDirection: 'row', gap: 3, flexShrink: 0 },
  rowAcctTag:    { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  rowAcctTxt:    { fontSize: 8.5, fontWeight: '800' },
  rowPL:         { alignItems: 'flex-end', flexShrink: 0 },
  rowPLVal:      { fontSize: 12, fontWeight: '800' },
  rowPLPct:      { fontSize: 10.5 },
});
