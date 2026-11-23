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
  icon: './images/parlino-app-icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  platforms: ['android'],
  android: {
    ...(existsSync(googleServicesJson) ? { googleServicesFile: './google-services.json' } : {}),
    package: 'com.parlino.app',
    adaptiveIcon: {
      foregroundImage: './images/parlino-adaptive-foreground.png',
      monochromeImage: './images/parlino-adaptive-monochrome.png',
      backgroundColor: '#F7F7F2',
    },
  },
  plugins: [
    'expo-router',
    ['expo-audio', { microphonePermission: 'Allow Parlino to use your microphone for live speaking practice.' }],
    ...(hasAndroidFirebaseConfig ? ['@react-native-firebase/app', '@react-native-firebase/app-check'] : []),
    ['expo-build-properties', { android: { kotlinVersion: '2.4.0', minSdkVersion: 26 } }],
    [
      'react-native-audio-api',
      {
        androidPermissions: ['android.permission.MODIFY_AUDIO_SETTINGS'],
      },
    ],
  ],
  extra: {
    appCheckProvider: process.env.PARLINO_APP_CHECK_PROVIDER === 'debug' ? 'debug' : 'playIntegrity',
  },
  experiments: { typedRoutes: true },
};

export default config;
