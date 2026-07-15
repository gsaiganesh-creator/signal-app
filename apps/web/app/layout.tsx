export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CapacitorOAuthListener } from '@/components/CapacitorOAuthListener';
import { NativeNavBridge } from '@/components/NativeNavBridge';

export const metadata: Metadata = {
  title: 'SignalGenie — ML-Powered Algo Trading',
  description: 'Portfolio analysis, ML signals, Algo Builder, Paper Trading. Not SEBI advice.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SignalGenie',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0E1628',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E1628" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body>
        {/* Prevent flash of wrong theme — runs before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('signal-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
        <ThemeProvider>{children}</ThemeProvider>
        <CapacitorOAuthListener />
        <NativeNavBridge />
      </body>
    </html>
  );
}
