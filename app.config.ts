import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExpoConfig } from 'expo/config';

const googleServicesJson = resolve(__dirname, 'google-services.json');
const hasAndroidFirebaseConfig = existsSync(googleServicesJson);

const config: ExpoConfig = {
  name: 'Parlino',
  slug: 'parlino',
  scheme: 'parlino',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  platforms: ['android'],
  android: {
    ...(existsSync(googleServicesJson) ? { googleServicesFile: './google-services.json' } : {}),
    package: 'com.parlino.app',
  },
  plugins: [
    'expo-router',
    ['expo-audio', { microphonePermission: 'Allow Parlino to use your microphone for live speaking practice.' }],
    ...(hasAndroidFirebaseConfig ? ['@react-native-firebase/app', '@react-native-firebase/app-check'] : []),
    ['expo-build-properties', { android: { kotlinVersion: '2.4.0' } }],
    [
      'react-native-audio-api',
      {
        androidPermissions: ['android.permission.MODIFY_AUDIO_SETTINGS'],
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
