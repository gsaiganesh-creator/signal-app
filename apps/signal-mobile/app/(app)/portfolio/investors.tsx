import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const INVESTORS = [
  { id:'ashish',      initials:'AK', color:'#8B5CF6', name:'Ashish Kacholia',     tag:'Small-cap Hunter', desc:'Quality small & mid-cap growth investor, Mumbai', stocks:36, val:'~₹2,800Cr', cagr:'+34%', top:'Neuland Labs' },
  { id:'dolly',       initials:'DK', color:'#E87722', name:'Dolly Khanna',         tag:'Mid-cap Queen',    desc:'Chennai-based, discovered multi-baggers early',   stocks:30, val:'~₹1,200Cr', cagr:'+28%', top:'Fiem Industries' },
  { id:'vijay',       initials:'VK', color:'#00D4A0', name:'Vijay Kedia',          tag:'QGLP Investor',   desc:'Quality, Growth, Longevity, Price framework',      stocks:12, val:'~₹950Cr',   cagr:'+31%', top:'Atul Auto' },
  { id:'porinju',     initials:'PV', color:'#E63946', name:'Porinju Veliyath',     tag:'Contrarian',       desc:'Contrarian value investor, micro-cap specialist',  stocks:22, val:'~₹480Cr',   cagr:'+22%', top:'Genesys Intl' },
  { id:'radhakishan', initials:'RD', color:'#1740F5', name:'Radhakishan Damani',   tag:'Value Legend',     desc:'Founder of DMart, long-term quality compounder',  stocks:8,  val:'~₹4,200Cr', cagr:'+41%', top:'VST Industries' },
];

export default function TopInvestors() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: T.txt }]}>Ace Investors</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.disclaimer}>
        <View style={[s.disclaimerCard, { backgroundColor: `${ACC.ylw}09`, borderColor: `${ACC.ylw}28` }]}>
          <Text style={[s.disclaimerTxt, { color: T.dim }]}>
            📋 Based on{' '}
            <Text style={{ color: T.txt, fontWeight: '600' }}>BSE/NSE public shareholding disclosures</Text>
            {' '}(≥1% stake only). Typically one quarter old. For reference only.
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {INVESTORS.map(inv => (
          <TouchableOpacity key={inv.id} onPress={() => router.push('/(app)/portfolio/investor')}
            style={[s.card, { backgroundColor: T.surf, borderColor: T.bdr }]}>
            <View style={s.cardHead}>
              <View style={[s.avatar, { backgroundColor: `${inv.color}20`, borderColor: `${inv.color}44` }]}>
                <Text style={[s.avatarTxt, { color: inv.color }]}>{inv.initials}</Text>
              </View>
              <View style={s.bio}>
                <View style={s.nameRow}>
                  <Text style={[s.name, { color: T.txt }]}>{inv.name}</Text>
                  <View style={[s.tagBadge, { backgroundColor: `${inv.color}18` }]}>
                    <Text style={[s.tagTxt, { color: inv.color }]}>{inv.tag}</Text>
                  </View>
                </View>
                <Text style={[s.desc, { color: T.dim }]}>{inv.desc}</Text>
              </View>
              <Text style={[s.chevron, { color: T.dim }]}>›</Text>
            </View>
            <View style={s.stats}>
              {[['Stocks', String(inv.stocks)],['Portfolio', inv.val],['Est. CAGR', inv.cagr]].map(([k, v]) => (
                <View key={k} style={[s.stat, { backgroundColor: T.surf2 }]}>
                  <Text style={[s.statKey, { color: T.dim }]}>{k}</Text>
                  <Text style={[s.statVal, { color: T.txt }]}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={s.topHolding}>
              <Text style={[s.topLabel, { color: T.dim }]}>Top holding:</Text>
              <View style={[s.topTag, { backgroundColor: `${inv.color}14` }]}>
                <Text style={[s.topTxt, { color: inv.color }]}>{inv.top}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={[s.sebiNote, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <Text style={[s.sebiTxt, { color: T.dim }]}>
            ⚠️ <Text style={{ fontWeight: '600', color: T.txt }}>Not investment advice.</Text> SIGNAL is not SEBI registered. Study these portfolios for learning only. Always do your own research (DYOR).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1 },
  navBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  backTxt:         { fontSize: 24, fontWeight: '300' },
  navTitle:        { fontSize: 16, fontWeight: '800' },
  disclaimer:      { paddingHorizontal: 13, marginBottom: 4 },
  disclaimerCard:  { padding: 8, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  disclaimerTxt:   { fontSize: 10.5, lineHeight: 16 },
  list:            { paddingHorizontal: 13, paddingBottom: 24, gap: 10 },
  card:            { padding: 13, borderRadius: 16, borderWidth: 1 },
  cardHead:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar:          { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:       { fontSize: 14, fontWeight: '900' },
  bio:             { flex: 1 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name:            { fontSize: 14, fontWeight: '800' },
  tagBadge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tagTxt:          { fontSize: 10, fontWeight: '700' },
  desc:            { fontSize: 11, marginTop: 2 },
  chevron:         { fontSize: 18, flexShrink: 0 },
  stats:           { flexDirection: 'row', gap: 7, marginBottom: 8 },
  stat:            { flex: 1, padding: 7, borderRadius: 9, alignItems: 'center' },
  statKey:         { fontSize: 9.5 },
  statVal:         { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
  topHolding:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topLabel:        { fontSize: 10.5 },
  topTag:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  topTxt:          { fontSize: 11, fontWeight: '700' },
  sebiNote:        { padding: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  sebiTxt:         { fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
