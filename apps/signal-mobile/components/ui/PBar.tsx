import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ACC } from '@/constants/theme';

type Props = { val: number; max?: number; color?: string; h?: number };

export function PBar({ val, max = 100, color = ACC.grn, h = 5 }: Props) {
  const { T } = useTheme();
  const pct = Math.min(100, Math.max(0, (val / max) * 100));
  return (
    <View style={[s.track, { height: h, borderRadius: h, backgroundColor: T.bdr }]}>
      <View style={[s.fill, { height: h, width: `${pct}%` as any, borderRadius: h, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill:  {},
});
