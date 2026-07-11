import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spark } from '@/components/ui/Spark';
import { Tag } from '@/components/ui/Tag';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

const INDICES = [
  { n:'NIFTY 50',   v:'24,812', chg:'+0.92%', up:true },
  { n:'SENSEX',     v:'81,540', chg:'+0.88%', up:true },
  { n:'BANK NIFTY', v:'53,240', chg:'+1.24%', up:true },
  { n:'NIFTY IT',   v:'38,120', chg:'+2.10%', up:true },
];

const HOLDINGS = [
  { t:'RELIANCE',   p:2912, chg:1.8,  sig:'BUY',  cat:'Momentum', data:[42,45,44,48,46,50,52,51,55,58] },
  { t:'HDFCBANK',   p:1634, chg:-0.4, sig:'HOLD', cat:'Swing',    data:[50,48,52,49,51,50,48,47,45,46] },
  { t:'TCS',        p:3880, chg:2.2,  sig:'BUY',  cat:'LongTrm',  data:[30,32,31,35,38,36,40,42,44,47] },
  { t:'TATAMOTORS', p:960,  chg:1.5,  sig:'BUY',  cat:'Momentum', data:[28,30,29,32,35,38,36,40,42,44] },
];

const TWEETS = [
  { time:'2h ago', text:'🎯 RF PICK: $TATAMOTORS — STRONG BUY · Conf. 81% · Entry ₹960 · Target ₹1,040 · SL ₹930 · RSI=34, EMA golden cross ✓ #NSE #AlgoTrading' },
  { time:'Yesterday', text:'📊 Week 23 Scorecard: 14 signals · ✅ 10 targets hit (71.4%) · ⛔ 2 SL · ⏳ 2 open. Transparency is everything. #SIGNAL' },
  { time:'2d ago', text:'🧪 Paper Trade Day 6: RSI+EMA strategy virtual P&L: +₹8,420 on ₹1L capital (+8.4%) · 7 signals · 5 wins. Going live next week!' },
];

export default function Dashboard() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const { session } = useSession();

  const meta      = session?.user?.user_metadata ?? {};
  const fullName  = (meta.full_name ?? meta.name ?? session?.user?.email ?? 'Welcome') as string;
  const initials  = fullName.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.greet, { color: T.dim }]}>Namaste 👋</Text>
            <Text style={[s.userName, { color: T.txt }]}>{fullName}</Text>
          </View>
          <TouchableOpacity onPress={confirmSignOut}>
            <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
              <Text style={s.avatarTxt}>{initials || '?'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hero stats row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.heroRow}>
          {[
            { l:'Portfolio Value', v:'₹18,70,420', sub:'Total across 3 accounts', c: T.txt },
            { l:"Today's P&L",    v:'+₹12,842',   sub:'+0.69% today',             c: ACC.grn },
            { l:'Active Signals', v:'10',           sub:'Fired today',              c: ACC.bluL },
            { l:'Accuracy (90d)', v:'71.4%',        sub:'RF model precision',       c: ACC.grn },
          ].map(card => (
            <View key={card.l} style={[s.heroCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <Text style={[s.heroLabel, { color: T.dim }]}>{card.l}</Text>
              <Text style={[s.heroVal, { color: card.c }]}>{card.v}</Text>
              <Text style={[s.heroSub, { color: T.dim }]}>{card.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* RF Pick of Day */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/stocks/TATAMOTORS')}
          style={[s.rfCard, { backgroundColor: `${ACC.blu}09`, borderColor: `${ACC.blu}28` }]}>
          <View>
            <Text style={[s.rfLabel, { color: ACC.bluL }]}>🤖 RF PICK OF THE DAY</Text>
            <Text style={[s.rfSym, { color: T.txt }]}>TATAMOTORS</Text>
            <Text style={[s.rfPrice, { color: T.txt }]}>₹960 <Text style={{ color: ACC.grn, fontSize: 13 }}>▲ +1.5%</Text></Text>
          </View>
          <View style={s.rfRight}>
            <View style={[s.rfBadge, { backgroundColor: `${ACC.grn}20`, borderColor: `${ACC.grn}44` }]}>
              <Text style={[s.rfBadgeTxt, { color: ACC.grn }]}>STRONG BUY</Text>
            </View>
            <Text style={[s.rfConf, { color: T.dim }]}>Conf. 81%</Text>
            <Text style={[s.rfArrow, { color: T.dim }]}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Market overview */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: T.txt }]}>Market Overview</Text>
          <View style={s.mktGrid}>
            {INDICES.map(idx => (
              <View key={idx.n} style={[s.mktCard, { backgroundColor: T.surf2, borderColor: T.bdr }]}>
                <Text style={[s.mktName, { color: T.dim }]}>{idx.n}</Text>
                <Text style={[s.mktVal, { color: T.txt }]}>{idx.v}</Text>
                <Text style={[s.mktChg, { color: idx.up ? ACC.grn : ACC.red }]}>
                  {idx.up ? '▲' : '▼'} {idx.chg}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ML alert */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/signals')}
          style={[s.alert, { backgroundColor: `${ACC.org}0F`, borderColor: `${ACC.org}44` }]}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
          <View style={s.alertInfo}>
            <Text style={[s.alertLabel, { color: ACC.orgL }]}>ML SIGNALS TODAY</Text>
            <Text style={[s.alertTxt, { color: T.txt }]}>7 BUY · 1 HOLD · 2 SELL signals fired</Text>
          </View>
          <Text style={[s.alertCta, { color: ACC.org }]}>View →</Text>
        </TouchableOpacity>

        {/* Research Picks */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: T.txt }]}>🔬 Deep Research</Text>
            <Text style={[s.sectionCta, { color: T.dim }]}>AI Analysis</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
            {[
              { sym:'HINDCOPPER', name:"India's Only Copper Miner", cmp:'₹560', tag:'STRONG BUY 84%', note:'EV + RE tailwind · PSU re-rating', up:true, tagC: ACC.grn },
              { sym:'TARIL',      name:'Transformers & Rectifiers', cmp:'₹292', tag:'BUY 76%',         note:'70% market share · Order ₹1,250Cr', up:true, tagC: ACC.grn },
            ].map(r => (
              <TouchableOpacity key={r.sym}
                onPress={() => router.push(`/(app)/stocks/${r.sym}`)}
                style={[s.resCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
                <View style={s.resHead}>
                  <Text style={[s.resSym, { color: T.txt }]}>{r.sym}</Text>
                  <View style={[s.resTagBadge, { backgroundColor: `${r.tagC}18` }]}>
                    <Text style={[s.resTagTxt, { color: r.tagC }]}>{r.tag}</Text>
                  </View>
                </View>
                <Text style={[s.resName, { color: T.dim }]}>{r.name}</Text>
                <Text style={[s.resCmp, { color: T.txt }]}>{r.cmp}</Text>
                <Text style={[s.resNote, { color: T.dim }]}>{r.note}</Text>
                <Text style={[s.resMore, { color: ACC.bluL }]}>Full analysis →</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Holdings */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: T.txt }]}>Holdings</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/portfolio/index')}>
              <Text style={[s.sectionCta, { color: ACC.bluL }]}>View All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
            {HOLDINGS.map(h => (
              <TouchableOpacity key={h.t}
                onPress={() => router.push(`/(app)/stocks/${h.t}`)}
                style={[s.holdingCard, { backgroundColor: T.surf, borderColor: T.bdr }]}>
                <View style={s.holdingHead}>
                  <Text style={[s.holdingTicker, { color: T.txt }]}>{h.t}</Text>
                  <View style={[s.sigBadge, { backgroundColor: h.sig === 'BUY' ? `${ACC.grn}22` : `${ACC.ylw}22` }]}>
                    <Text style={[s.sigTxt, { color: h.sig === 'BUY' ? ACC.grn : ACC.ylw }]}>{h.sig}</Text>
                  </View>
                </View>
                <Spark data={h.data} color={h.chg >= 0 ? ACC.grn : ACC.red} w={74} h={22} />
                <Text style={[s.holdingPrice, { color: T.txt }]}>₹{h.p.toLocaleString()}</Text>
                <Text style={[s.holdingChg, { color: h.chg >= 0 ? ACC.grn : ACC.red }]}>
                  {h.chg >= 0 ? '▲' : '▼'} {Math.abs(h.chg)}%
                </Text>
                <Tag label={h.cat} color={h.cat === 'Momentum' ? ACC.org : h.cat === 'Swing' ? ACC.ylw : ACC.pur} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Today's top signals */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: T.txt }]}>Today's Signals</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/signals')}>
              <Text style={[s.sectionCta, { color: ACC.bluL }]}>View all →</Text>
            </TouchableOpacity>
          </View>
          {[
            { sym:'RELIANCE',   time:'09:32', note:'RSI=34.2 · EMA20>EMA50 · Del.%=66 · Conf. 87%', c: ACC.grn },
            { sym:'TATAMOTORS', time:'09:31', note:'RF score 0.81 · Vol 2.4× avg · Sector momentum ▲', c: ACC.grn },
            { sym:'ZOMATO',     time:'09:30', note:'RSI=71 · Below EMA50 · FII net sell · Conf. 74%',  c: ACC.red },
          ].map(sig => (
            <TouchableOpacity key={sig.sym}
              onPress={() => router.push(`/(app)/stocks/${sig.sym}`)}
              style={[s.sigRow, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <View style={[s.sigIcon, { backgroundColor: `${sig.c}18` }]}>
                <Text style={[s.sigIconTxt, { color: sig.c }]}>{sig.sym.slice(0, 4)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sigSym, { color: T.txt }]}>{sig.sym}</Text>
                <Text style={[s.sigNote, { color: T.dim }]}>{sig.note}</Text>
              </View>
              <Text style={[s.sigTime, { color: T.dim }]}>{sig.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 𝕏 Track Record */}
        <View style={[s.section, { paddingBottom: 20 }]}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: T.txt }]}>𝕏 Track Record</Text>
            <Text style={[s.sectionCta, { color: ACC.bluL }]}>View all on Twitter →</Text>
          </View>
          {TWEETS.map((tw, i) => (
            <View key={i} style={[s.tweetRow, { backgroundColor: T.surf, borderColor: T.bdr }]}>
              <LinearGradient colors={[ACC.blu, ACC.org]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tweetAv}>
                <Text style={s.tweetAvTxt}>{initials || 'SG'}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.tweetTime, { color: T.dim }]}>{tw.time}</Text>
                <Text style={[s.tweetTxt, { color: T.txt }]}>{tw.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  greet:         { fontSize: 12 },
  userName:      { fontSize: 20, fontWeight: '800' },
  avatar:        { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroRow:       { paddingHorizontal: 13, gap: 9, marginBottom: 9 },
  heroCard:      { padding: 14, borderRadius: 13, borderWidth: 1, minWidth: 140 },
  heroLabel:     { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  heroVal:       { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  heroSub:       { fontSize: 10, marginTop: 3 },
  rfCard:        { marginHorizontal: 13, marginBottom: 9, padding: 12, borderRadius: 13, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rfLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  rfSym:         { fontSize: 18, fontWeight: '900' },
  rfPrice:       { fontSize: 15, fontWeight: '700', marginTop: 2 },
  rfRight:       { alignItems: 'flex-end', gap: 4 },
  rfBadge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  rfBadgeTxt:    { fontSize: 10, fontWeight: '800' },
  rfConf:        { fontSize: 11 },
  rfArrow:       { fontSize: 18 },
  section:       { paddingHorizontal: 13, marginBottom: 8 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle:  { fontSize: 13, fontWeight: '700' },
  sectionCta:    { fontSize: 12 },
  mktGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mktCard:       { width: '47%', padding: 11, borderRadius: 11, borderWidth: 1 },
  mktName:       { fontSize: 10, marginBottom: 3 },
  mktVal:        { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  mktChg:        { fontSize: 12, fontWeight: '700', marginTop: 2 },
  alert:         { marginHorizontal: 13, marginBottom: 8, padding: 9, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertInfo:     { flex: 1 },
  alertLabel:    { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4 },
  alertTxt:      { fontSize: 12.5 },
  alertCta:      { fontSize: 12, fontWeight: '700' },
  resCard:       { width: 200, padding: 12, borderRadius: 13, borderWidth: 1, gap: 4 },
  resHead:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  resSym:        { fontSize: 14, fontWeight: '900' },
  resTagBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  resTagTxt:     { fontSize: 9, fontWeight: '800' },
  resName:       { fontSize: 10.5 },
  resCmp:        { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  resNote:       { fontSize: 10, lineHeight: 15 },
  resMore:       { fontSize: 11, fontWeight: '700', marginTop: 3 },
  holdingCard:   { width: 110, padding: 10, borderRadius: 13, borderWidth: 1, gap: 3 },
  holdingHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  holdingTicker: { fontSize: 12, fontWeight: '800' },
  sigBadge:      { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  sigTxt:        { fontSize: 9, fontWeight: '700' },
  holdingPrice:  { fontSize: 12, fontWeight: '700' },
  holdingChg:    { fontSize: 10 },
  sigRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  sigIcon:       { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sigIconTxt:    { fontSize: 9, fontWeight: '900' },
  sigSym:        { fontSize: 12, fontWeight: '800' },
  sigNote:       { fontSize: 10.5, marginTop: 1 },
  sigTime:       { fontSize: 10.5, flexShrink: 0 },
  tweetRow:      { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  tweetAv:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tweetAvTxt:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  tweetTime:     { fontSize: 10, marginBottom: 3 },
  tweetTxt:      { fontSize: 11.5, lineHeight: 17 },
});
