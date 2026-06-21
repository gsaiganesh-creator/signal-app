import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { PBar } from '@/components/ui/PBar';

const SIGNALS = [
  {
    sym:'RELIANCE',  name:'Reliance Industries', sub:'NSE · Large Cap',
    badge:'STRONG BUY', btype:'sbuy', conf:87,
    cmp:'₹2,912', target:'₹3,080', sl:'₹2,820', rr:'1.8:1',
    tags:['RSI=34 ↑','EMA cross ✓','Del.%=66','Vol 2.1×','ADX=28'],
    time:'Today 09:32 IST', sector:'Energy', up:true,
  },
  {
    sym:'TATAMOTORS', name:'Tata Motors', sub:'NSE · Auto',
    badge:'STRONG BUY', btype:'sbuy', conf:81,
    cmp:'₹960', target:'₹1,040', sl:'₹930', rr:'2.7:1',
    tags:['RF score=0.81','Vol 2.4×','Sector ▲','OBV rising'],
    time:'Today 09:31 IST', sector:'Auto', up:true,
  },
  {
    sym:'TCS',       name:'Tata Consultancy', sub:'NSE · IT',
    badge:'BUY', btype:'buy', conf:73,
    cmp:'₹3,880', target:'₹4,100', sl:'₹3,780', rr:'2.2:1',
    tags:['MACD cross ✓','IT +4.1%','Del.%=58'],
    time:'Today 09:35 IST', sector:'IT', up:true,
  },
  {
    sym:'SBIN',      name:'State Bank of India', sub:'NSE · Banking',
    badge:'BUY', btype:'buy', conf:76,
    cmp:'₹824', target:'₹872', sl:'₹798', rr:'1.8:1',
    tags:['RSI=38','Vol surge 2.8×','BB lower band','DII buying'],
    time:'Today 09:40 IST', sector:'Banking', up:true,
  },
  {
    sym:'INFY',      name:'Infosys Ltd', sub:'NSE · IT',
    badge:'BUY', btype:'buy', conf:69,
    cmp:'₹1,492', target:'₹1,580', sl:'₹1,450', rr:'2.2:1',
    tags:['EMA20>EMA50','ADX=26','IT momentum'],
    time:'Today 09:44 IST', sector:'IT', up:true,
  },
  {
    sym:'HDFCBANK',  name:'HDFC Bank', sub:'NSE · Banking',
    badge:'HOLD', btype:'hold', conf:58,
    cmp:'₹1,634', target:'—', sl:'—', rr:'—',
    tags:['RSI=52 neutral','EMA50 test'],
    time:'Today 09:38 IST', sector:'Banking', up:null,
    note:'Conflicting signals — RSI neutral (52), price near EMA50 support. Wait for breakout above ₹1,650.',
  },
  {
    sym:'ZOMATO',    name:'Zomato Ltd', sub:'NSE · Consumer',
    badge:'SELL', btype:'sell', conf:74,
    cmp:'₹198', target:'₹176', sl:'₹208', rr:'2.2:1',
    tags:['RSI=71','Below EMA50','FII net sell'],
    time:'Today 09:30 IST', sector:'Consumer', up:false,
  },
];

const FILTERS = [
  { key:'all',  label:'All (10)' },
  { key:'buy',  label:'🟢 BUY (7)' },
  { key:'sell', label:'🔴 SELL (2)' },
  { key:'hold', label:'🟡 HOLD (1)' },
  { key:'mom',  label:'🚀 Momentum' },
  { key:'swing',label:'🔄 Swing' },
];

function badgeStyle(btype: string, ACC: any) {
  switch (btype) {
    case 'sbuy': return { bg: `${ACC.grn}22`, bc: `${ACC.grn}44`, tc: ACC.grn };
    case 'buy':  return { bg: `${ACC.grn}12`, bc: `${ACC.grn}2A`, tc: ACC.grn };
    case 'sell': return { bg: `${ACC.red}18`, bc: `${ACC.red}35`, tc: ACC.red };
    case 'hold': return { bg: `${ACC.ylw}15`, bc: `${ACC.ylw}35`, tc: ACC.ylw };
    default:     return { bg: '#fff1', bc: '#fff2', tc: '#fff' };
  }
}

export default function Signals() {
  const { T, ACC } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? SIGNALS
    : filter === 'buy'  ? SIGNALS.filter(s => s.btype === 'buy' || s.btype === 'sbuy')
    : filter === 'sell' ? SIGNALS.filter(s => s.btype === 'sell')
    : filter === 'hold' ? SIGNALS.filter(s => s.btype === 'hold')
    : SIGNALS;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.h1, { color: T.txt }]}>Live Signals</Text>
          <Text style={[s.sub, { color: T.dim }]}>Market open · 10 signals fired · Accuracy 90d: <Text style={{ color: ACC.grn, fontWeight: '700' }}>71.4%</Text></Text>
        </View>
        <View style={[s.liveDot, { backgroundColor: `${ACC.grn}18`, borderColor: `${ACC.grn}44` }]}>
          <View style={[s.dot, { backgroundColor: ACC.grn }]} />
          <Text style={[s.liveLabel, { color: ACC.grn }]}>LIVE</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={[
              s.filterChip,
              { borderColor: filter === f.key ? ACC.blu : T.bdr,
                backgroundColor: filter === f.key ? `${ACC.blu}18` : 'transparent' },
            ]}>
            <Text style={[s.filterTxt, { color: filter === f.key ? ACC.bluL : T.dim, fontWeight: filter === f.key ? '700' : '500' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {filtered.map(sig => {
          const bs = badgeStyle(sig.btype, ACC);
          return (
            <TouchableOpacity key={sig.sym}
              onPress={() => router.push(`/(app)/stocks/${sig.sym}`)}
              style={[s.card, { backgroundColor: T.surf, borderColor: sig.btype === 'sbuy' ? `${ACC.grn}33` : sig.btype === 'sell' ? `${ACC.red}28` : T.bdr }]}>

              {/* Card head */}
              <View style={s.cardHead}>
                <View>
                  <Text style={[s.sym, { color: T.txt }]}>{sig.sym}</Text>
                  <Text style={[s.stockSub, { color: T.dim }]}>{sig.name} · {sig.sub}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: bs.bg, borderColor: bs.bc }]}>
                  <Text style={[s.badgeTxt, { color: bs.tc }]}>{sig.badge}</Text>
                </View>
              </View>

              {/* Confidence */}
              <View style={s.confRow}>
                <Text style={[s.confLabel, { color: T.dim }]}>Model confidence</Text>
                <Text style={[s.confPct, { color: sig.conf >= 75 ? ACC.grn : sig.conf >= 60 ? ACC.ylw : T.dim }]}>{sig.conf}%</Text>
              </View>
              <PBar val={sig.conf} color={sig.conf >= 75 ? ACC.grn : sig.conf >= 60 ? ACC.ylw : T.dim} h={4} />

              {/* Note for HOLD */}
              {sig.note ? (
                <Text style={[s.note, { color: T.dim }]}>{sig.note}</Text>
              ) : (
                /* Levels */
                <View style={[s.levels, { borderColor: T.bdr }]}>
                  {[['CMP', sig.cmp],['Target', sig.target],['Stop Loss', sig.sl],['R:R', sig.rr]].map(([l,v]) => (
                    <View key={l} style={[s.level, { borderRightColor: T.bdr }]}>
                      <Text style={[s.levelLbl, { color: T.dim }]}>{l}</Text>
                      <Text style={[s.levelVal, { color: l === 'Target' ? ACC.grn : l === 'Stop Loss' ? ACC.red : T.txt }]}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Indicator tags */}
              <View style={s.tags}>
                {sig.tags.map(tag => (
                  <View key={tag} style={[s.tag, { backgroundColor: `${ACC.blu}12`, borderColor: `${ACC.blu}28` }]}>
                    <Text style={[s.tagTxt, { color: ACC.bluL }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={s.foot}>
                <Text style={[s.time, { color: T.dim }]}>{sig.time}</Text>
                <View style={[s.sector, { backgroundColor: T.surf2 }]}>
                  <Text style={[s.sectorTxt, { color: T.dim }]}>{sig.sector}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* SEBI disclaimer */}
        <View style={[s.sebi, { backgroundColor: T.surf, borderColor: T.bdr }]}>
          <Text style={[s.sebiTxt, { color: T.dim }]}>
            ⚠️ <Text style={{ color: T.txt, fontWeight: '600' }}>Not SEBI advice.</Text> These are ML-generated signals for educational use only. Not SEBI registered. DYOR before trading.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  h1:         { fontSize: 22, fontWeight: '800' },
  sub:        { fontSize: 11.5, marginTop: 3 },
  liveDot:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  liveLabel:  { fontSize: 11, fontWeight: '800' },
  filters:    { paddingHorizontal: 13, paddingBottom: 8, gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterTxt:  { fontSize: 12 },
  list:       { paddingHorizontal: 13, paddingBottom: 24, gap: 10 },
  card:       { padding: 14, borderRadius: 14, borderWidth: 1, gap: 9 },
  cardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sym:        { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  stockSub:   { fontSize: 11, marginTop: 2 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  badgeTxt:   { fontSize: 11, fontWeight: '800' },
  confRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  confLabel:  { fontSize: 11 },
  confPct:    { fontSize: 11, fontWeight: '700' },
  note:       { fontSize: 11.5, lineHeight: 17 },
  levels:     { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  level:      { flex: 1, padding: 8, paddingHorizontal: 10, borderRightWidth: 1, alignItems: 'center' },
  levelLbl:   { fontSize: 10, marginBottom: 3 },
  levelVal:   { fontSize: 12.5, fontWeight: '800' },
  tags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  tagTxt:     { fontSize: 10.5, fontWeight: '600' },
  foot:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(28,46,74,0.6)' },
  time:       { fontSize: 11 },
  sector:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  sectorTxt:  { fontSize: 10.5, fontWeight: '700' },
  sebi:       { padding: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  sebiTxt:    { fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
