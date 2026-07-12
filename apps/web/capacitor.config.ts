import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gsaiganesh.signal.app',
  appName: 'SignalGenie',
  webDir: 'public',           // not used — server.url overrides (live deploy)
  server: {
    url: 'https://signalgenie.ai',
    cleartext: false,         // HTTPS only
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#070D1A',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    allowsLinkPreview: false,
  },
  android: {
    backgroundColor: '#070D1A',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#070D1A',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
