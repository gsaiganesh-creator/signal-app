import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import { ACC } from '@/constants/theme';

type Props = {
  data?: number[];
  color?: string;
  w?: number;
  h?: number;
};

export function Spark({ data = [], color = ACC.blu, w = 80, h = 28 }: Props) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`)
    .join(' ');
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
