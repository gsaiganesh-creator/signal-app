import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/hooks/useTheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Catch fatal JS errors in production and show them instead of crashing
if (!__DEV__) {
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[SIGNAL] Fatal JS error:', error?.message, error?.stack);
    prev?.(error, isFatal);
  });
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message ?? 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.err}>
          <Text style={s.errTitle}>Something went wrong</Text>
          <Text style={s.errMsg}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="analyzing" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  err:      { flex: 1, backgroundColor: '#070D1A', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTitle: { color: '#FF3B5C', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  errMsg:   { color: '#7A8BAA', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
