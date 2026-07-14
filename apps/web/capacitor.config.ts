import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.signalgenie.signal.native',
  appName: 'SignalGenie2.0',
  webDir: 'public',           // not used — server.url overrides (live deploy)
  server: {
    url: 'https://signalgenie.ai',
    cleartext: false,         // HTTPS only
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#070D1A',
    scrollEnabled: true,
    // Was true with no matching WKAppBoundDomains entry in Info.plist — per
    // WebKit's documented behavior that combination leaves navigation
    // unbound/restricted, which can degrade the WebView toward Safari-style
    // chrome instead of a clean native container. This app has no local
    // bundled content (server.url overrides webDir entirely, 100% remote),
    // so the app-bound-domains restriction doesn't serve its intended
    // purpose here anyway — turning it off instead of adding a
    // WKAppBoundDomains array neither of us has verified the right values for.
    limitsNavigationsToAppBoundDomains: false,
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
