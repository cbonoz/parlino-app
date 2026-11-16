import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme';

function TabGlyph({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.deepGreen : colors.muted, fontSize: 19, fontWeight: '700' }}>{symbol}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.deepGreen,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.line, height: 82, paddingTop: 10, paddingBottom: 19 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 4 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Practice', tabBarIcon: ({ focused }) => <TabGlyph symbol="◉" focused={focused} /> }} />
      <Tabs.Screen name="review" options={{ title: 'Review', tabBarIcon: ({ focused }) => <TabGlyph symbol="↻" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'You', tabBarIcon: ({ focused }) => <TabGlyph symbol="◌" focused={focused} /> }} />
    </Tabs>
  );
}
