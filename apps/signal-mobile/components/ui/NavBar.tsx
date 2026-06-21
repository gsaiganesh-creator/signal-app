import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
};

export function NavBar({ title, back = false, right }: Props) {
  const { T } = useTheme();
  const router = useRouter();
  return (
    <View style={[s.wrap, { borderBottomColor: T.bdr }]}>
      {back ? (
        <TouchableOpacity onPress={() => router.back()} style={s.btn}>
          <Text style={[s.chevron, { color: T.dim }]}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.btn} />
      )}
      <Text style={[s.title, { color: T.txt }]}>{title}</Text>
      <View style={s.btn}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  btn:     { width: 36, alignItems: 'center' },
  title:   { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  chevron: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
