import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACC } from '@/constants/theme';

type Props = { label: string; color?: string };

export function Tag({ label, color = ACC.grn }: Props) {
  return (
    <View style={[s.wrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[s.txt, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  txt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
});
