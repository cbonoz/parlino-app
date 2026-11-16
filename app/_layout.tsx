import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { prepareAppCheck } from '@/services/firebase';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    try { prepareAppCheck(); } catch { /* Firebase setup screens explain missing native config. */ }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="conversation" options={{ presentation: 'card' }} />
        <Stack.Screen name="recap" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
