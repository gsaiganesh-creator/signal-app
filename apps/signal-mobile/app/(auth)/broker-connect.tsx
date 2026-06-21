import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Tag } from '@/components/ui/Tag';

const BROKERS = [
  { n: 'Zerodha Kite',    ab: 'ZE', color: '#387ED1', tag: 'Popular' },
  { n: 'mStock',          ab: 'MS', color: '#E63946', tag: 'Your Broker' },
  { n: 'HDFC Securities', ab: 'HD', color: '#004C8F', tag: null },
  { n: 'Groww',           ab: 'GR', color: '#00D09C', tag: null },
  { n: 'Upstox',          ab: 'UP', color: '#7B2FBE', tag: null },
  { n: 'Angel One',       ab: 'AO', color: '#E87722', tag: null },
];

export default function BrokerConnect() {
  const { T, ACC } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backTxt, { color: T.dim }]}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={[s.h1, { color: T.txt }]}>Connect Broker</Text>
        <Text style={[s.sub, { color: T.dim }]}>Link your demat for live portfolio sync.</Text>

        <View style={s.list}>
          {BROKERS.map((b, i) => (
            <TouchableOpacity
              key={b.n}
              onPress={() => router.push('/analyzing')}
              style={[
                s.row,
                {
                  backgroundColor: i === 1 ? `${ACC.blu}0C` : T.surf,
                  borderColor: i === 1 ? ACC.blu : T.bdr,
                },
              ]}
            >
              <View style={[s.avatar, { backgroundColor: `${b.color}20`, borderColor: `${b.color}40` }]}>
                <Text style={[s.avatarTxt, { color: b.color }]}>{b.ab}</Text>
              </View>
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={[s.name, { color: T.txt }]}>{b.n}</Text>
                  {b.tag && <Tag label={b.tag} color={b.tag === 'Your Broker' ? ACC.org : ACC.grn} />}
                </View>
                <Text style={[s.hint, { color: T.dim }]}>API connect · Instant sync</Text>
              </View>
              <Text style={[s.arrow, { color: T.dim }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.divider}>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
          <Text style={[s.orTxt, { color: T.dim }]}>or import manually</Text>
          <View style={[s.line, { backgroundColor: T.bdr }]} />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/upload')}
          style={[s.upload, { backgroundColor: `${ACC.org}14`, borderColor: `${ACC.org}44` }]}
        >
          <Text style={{ fontSize: 18 }}>📊</Text>
          <Text style={[s.uploadTxt, { color: ACC.orgL }]}> Upload Excel Portfolio</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  scroll:    { padding: 18, paddingBottom: 40 },
  back:      { marginBottom: 12 },
  backTxt:   { fontSize: 16 },
  h1:        { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  sub:       { fontSize: 13, marginBottom: 16 },
  list:      { gap: 8, marginBottom: 16 },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1, gap: 12 },
  avatar:    { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarTxt: { fontSize: 11, fontWeight: '900' },
  info:      { flex: 1 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name:      { fontSize: 14, fontWeight: '700' },
  hint:      { fontSize: 11, marginTop: 1 },
  arrow:     { fontSize: 18 },
  divider:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  line:      { flex: 1, height: 1 },
  orTxt:     { fontSize: 11 },
  upload:    { height: 50, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadTxt: { fontSize: 15, fontWeight: '700' },
});
