import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { loadSettings } from '@/services/progress';
import { colors } from '@/theme';

export default function IndexRoute() {
  const [complete, setComplete] = useState<boolean | null>(null);
  useEffect(() => { void loadSettings().then((settings) => setComplete(settings.onboardingComplete)); }, []);
  if (complete === null) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator color={colors.green} /></View>;
  return <Redirect href={complete ? '/(tabs)' : '/onboarding'} />;
}
