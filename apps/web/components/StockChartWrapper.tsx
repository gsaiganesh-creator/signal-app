'use client';

// Client boundary wrapper — allows ssr:false dynamic import from server pages
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type StockChart from './StockChart';

const Chart = dynamic(() => import('./StockChart'), { ssr: false });

export function StockChartWrapper(props: ComponentProps<typeof StockChart>) {
  return <Chart {...props} />;
}
