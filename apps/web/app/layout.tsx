import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGNAL — ML-Powered Algo Trading Platform',
  description: 'Portfolio analysis, Random Forest signals, Algo Builder, Paper Trading — at ₹299/month. Not SEBI advice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
