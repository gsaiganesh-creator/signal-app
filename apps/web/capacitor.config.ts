import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.signal.app',
  appName: 'SIGNAL',
  webDir: 'out',
  server: {
    url: 'https://signal-app-api.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
