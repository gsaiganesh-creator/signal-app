import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const HOLDINGS = [
  { sym:'NEULAND',  name:'Neuland Laboratories', stake:'2.4%', val:'₹180Cr', sector:'Pharma',    chg:'+42%', up:true },
  { sym:'EPIGRAL',  name:'Epigral Ltd',           stake:'3.1%', val:'₹142Cr', sector:'Chemicals', chg:'+28%', up:true },
  { sym:'HERANBA',  name:'Heranba Industries',    stake:'4.2%', val:'₹98Cr',  sector:'Agrochem',  chg:'+18%', up:true },
  { sym:'FINEORG',  name:'Fine Organics',         stake:'1.8%', val:'₹188Cr', sector:'Chemicals', chg:'+15%', up:true },
  { sym:'TATTECH',  name:'Tata Technologies',     stake:'1.2%', val:'₹210Cr', sector:'IT',        chg:'-4%',  up:false },
  { sym:'SKIPPER',  name:'Skipper Ltd',           stake:'5.3%', val:'₹84Cr',  sector:'Infra',     chg:'+61%', up:true },
  { sym:'PARAS',    name:'Paras Defence',         stake:'2.7%', val:'₹76Cr',  sector:'Defence',   chg:'+35%', up:true },
  { sym:'BOROLTD',  name:'Borosil Ltd',           stake:'1.5%', val:'₹62Cr',  sector:'Consumer',  chg:'+12%', up:true },
];

const BIO_STATS = [
  ['Focus','Small/Mid',''],  ['Est. CAGR','+34%','#00D4A0'], ['Holdings','36',''],
  ['Style','Growth',''],     ['Horizon','3–5 Years',''],     ['Last Filed','Mar 2025',''],
];

const COLOR = '#8B5CF6';

export default function InvestorDetail() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: T.txt }]}>Ashish Kacholia</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {/* Bio card */}
        <LinearGradient colors={T.cardGrad} style={[s.bioCard, { borderColor: T.bdr }]}>
          <View style={s.bioHead}>
            <View style={[s.avatar, { backgroundColor: `${COLOR}20`, borderColor: `${COLOR}44` }]}>
              <Text style={[s.avatarTxt, { color: COLOR }]}>AK</Text>
            </View>
            <View>
              <Text style={[s.investorName, { color: T.txt }]}>Ashish Kacholia</Text>
              <Text style={[s.investorSub, { color: T.dim }]}>Small-cap specialist · Mumbai</Text>
              <Text style={[s.investorPorfolio, { color: COLOR }]}>36 known holdings · ~₹2,800Cr estimated</Text>
            </View>
          </View>
          <View style={s.bioGrid}>
            {BIO_STATS.map(([k, v, c]) => (
              <View key={k} style={[s.bioStat, { backgroundColor: T.surf2 }]}>
                <Text style={[s.bioStatKey, { color: T.dim }]}>{k}</Text>
                <Text style={[s.bioStatVal, { color: c || T.txt }]}>{v}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Source note */}
        <View style={[s.sourceNote, { backgroundColor: `${ACC.ylw}09`, borderColor: `${ACC.ylw}28` }]}>
          <Text style={[s.sourceTxt, { color: T.dim }]}>
            📋 From BSE/NSE shareholding disclosures. Only stakes ≥1% are disclosed publicly.{' '}
            <Text style={{ color: ACC.ylw, fontWeight: '600' }}>Data as of: Mar 2025 (Q4 FY25)</Text>
          </Text>
        </View>

        <Text style={[s.sectionLabel, { color: T.dim }]}>KNOWN HOLDINGS</Text>

        {HOLDINGS.map(h => (
          <View key={h.sym} style={[s.holdingRow, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <View style={[s.holdingIcon, { backgroundColor: `${COLOR}18`, borderColor: `${COLOR}30` }]}>
              <Text style={[s.holdingIconTxt, { color: COLOR }]}>{h.sym.slice(0, 5)}</Text>
            </View>
            <View style={s.holdingInfo}>
              <Text style={[s.holdingSym, { color: T.txt }]}>{h.sym}</Text>
              <Text style={[s.holdingName, { color: T.dim }]} numberOfLines={1}>{h.name}</Text>
              <View style={s.holdingMeta}>
                <Text style={[s.stakeTxt, { color: T.dim }]}>Stake: <Text style={{ color: T.txt, fontWeight: '600' }}>{h.stake}</Text></Text>
                <View style={[s.sectorTag, { backgroundColor: T.surf2 }]}>
                  <Text style={[s.sectorTxt, { color: T.dim }]}>{h.sector}</Text>
                </View>
              </View>
            </View>
            <View style={s.holdingRight}>
              <Text style={[s.holdingVal, { color: T.txt }]}>{h.val}</Text>
              <Text style={[s.holdingChg, { color: h.up ? ACC.grn : ACC.red }]}>{h.chg}</Text>
            </View>
          </View>
        ))}

        <View style={[s.sebiNote, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <Text style={[s.sebiTxt, { color: T.dim }]}>
            ⚠️ <Text style={{ fontWeight: '600', color: T.txt }}>Not investment advice.</Text> SIGNAL is not SEBI registered. Study investor portfolios for learning only. Always do your own research (DYOR).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1 },
  navBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  backTxt:           { fontSize: 24, fontWeight: '300' },
  navTitle:          { fontSize: 16, fontWeight: '800' },
  list:              { paddingHorizontal: 13, paddingBottom: 24, gap: 9 },
  bioCard:           { padding: 14, borderRadius: 15, borderWidth: 1 },
  bioHead:           { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 },
  avatar:            { width: 54, height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:         { fontSize: 18, fontWeight: '900' },
  investorName:      { fontSize: 16, fontWeight: '800' },
  investorSub:       { fontSize: 11, marginTop: 2 },
  investorPorfolio:  { fontSize: 10.5, fontWeight: '600', marginTop: 3 },
  bioGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  bioStat:           { width: '31%', padding: 7, borderRadius: 9, alignItems: 'center' },
  bioStatKey:        { fontSize: 9 },
  bioStatVal:        { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
  sourceNote:        { padding: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  sourceTxt:         { fontSize: 10, lineHeight: 16 },
  sectionLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingLeft: 2 },
  holdingRow:        { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1 },
  holdingIcon:       { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  holdingIconTxt:    { fontSize: 9, fontWeight: '900' },
  holdingInfo:       { flex: 1 },
  holdingSym:        { fontSize: 13, fontWeight: '700' },
  holdingName:       { fontSize: 10.5 },
  holdingMeta:       { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 2 },
  stakeTxt:          { fontSize: 10 },
  sectorTag:         { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  sectorTxt:         { fontSize: 10 },
  holdingRight:      { alignItems: 'flex-end', flexShrink: 0 },
  holdingVal:        { fontSize: 12, fontWeight: '700' },
  holdingChg:        { fontSize: 11, fontWeight: '700' },
  sebiNote:          { padding: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  sebiTxt:           { fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
