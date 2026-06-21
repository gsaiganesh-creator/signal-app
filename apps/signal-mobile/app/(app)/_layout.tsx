import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

function IconDashboard({ color }: { color: ColorValue }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Rect x={2} y={2} width={8} height={8} rx={2} stroke={color as string} strokeWidth={1.6} />
      <Rect x={12} y={2} width={8} height={8} rx={2} stroke={color as string} strokeWidth={1.6} />
      <Rect x={2} y={12} width={8} height={8} rx={2} stroke={color as string} strokeWidth={1.6} />
      <Rect x={12} y={12} width={8} height={8} rx={2} stroke={color as string} strokeWidth={1.6} />
    </Svg>
  );
}

function IconSignals({ color }: { color: ColorValue }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Polyline points="2,18 6,12 10,14 15,7 20,4" stroke={color as string} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={20} cy={4} r={2} fill={color as string} />
    </Svg>
  );
}

function IconGear({ color }: { color: ColorValue }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Circle cx={11} cy={11} r={3.5} stroke={color as string} strokeWidth={1.6} />
      <Path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.41 1.41M16.37 16.37l1.41 1.41M4.22 17.78l1.41-1.41M16.37 5.63l1.41-1.41" stroke={color as string} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function IconPortfolio({ color }: { color: ColorValue }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Rect x={2} y={6} width={18} height={14} rx={2} stroke={color as string} strokeWidth={1.6} />
      <Path d="M7 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color as string} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export default function AppLayout() {
  const { T, ACC } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.surf,
          borderTopColor: T.bdr,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: ACC.blu,
        tabBarInactiveTintColor: T.dim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <IconDashboard color={color} /> }}
      />
      <Tabs.Screen
        name="signals"
        options={{ title: 'Signals', tabBarIcon: ({ color }) => <IconSignals color={color} />,
          tabBarBadge: 10, tabBarBadgeStyle: { backgroundColor: ACC.red, fontSize: 9 } }}
      />
      <Tabs.Screen
        name="portfolio/index"
        options={{ title: 'Portfolio', tabBarIcon: ({ color }) => <IconPortfolio color={color} /> }}
      />
      <Tabs.Screen
        name="algo/index"
        options={{ title: 'Algo', tabBarIcon: ({ color }) => <IconGear color={color} /> }}
      />
      {/* hidden screens */}
      <Tabs.Screen name="analysis" options={{ href: null }} />
      <Tabs.Screen name="stocks/[ticker]" options={{ href: null }} />
      <Tabs.Screen name="algo/params" options={{ href: null }} />
      <Tabs.Screen name="algo/builder" options={{ href: null }} />
      <Tabs.Screen name="algo/code" options={{ href: null }} />
      <Tabs.Screen name="algo/deploy" options={{ href: null }} />
      <Tabs.Screen name="algo/paper" options={{ href: null }} />
      <Tabs.Screen name="portfolio/investors" options={{ href: null }} />
      <Tabs.Screen name="portfolio/investor" options={{ href: null }} />
    </Tabs>
  );
}
