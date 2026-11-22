import { getApp, getApps } from '@react-native-firebase/app';
import Constants from 'expo-constants';
import {
  ReactNativeFirebaseAppCheckProvider,
  initializeAppCheck,
  type AppCheck,
} from '@react-native-firebase/app-check';

let appCheckInstance: AppCheck | undefined;

export type FirebaseSetup = { ready: boolean; message: string };

export function getFirebaseSetup(): FirebaseSetup {
  try {
    if (getApps().length === 0) {
      return { ready: false, message: 'Add the native Firebase configuration files and rebuild the development app.' };
    }
    const { apiKey, projectId, appId } = getApp().options;
    if (!apiKey || !projectId || !appId) {
      return { ready: false, message: 'The Firebase app is missing its API key, project ID, or app ID.' };
    }
    return { ready: true, message: 'Firebase is connected.' };
  } catch {
    return { ready: false, message: 'Firebase is not configured in this native build yet.' };
  }
}

export function prepareAppCheck(): AppCheck {
  if (appCheckInstance) return appCheckInstance;
  if (!getFirebaseSetup().ready) {
    throw new Error('Firebase is not configured for App Check.');
  }

  const provider = new ReactNativeFirebaseAppCheckProvider();
  const useDebugProvider =
    __DEV__ ||
    process.env.EXPO_PUBLIC_APP_CHECK_DEBUG === 'true' ||
    Constants.expoConfig?.extra?.appCheckProvider === 'debug';
  if (useDebugProvider) {
    console.info('[AppCheck] Debug provider enabled for this test build.');
  }
  provider.configure({
    android: { provider: useDebugProvider ? 'debug' : 'playIntegrity' },
  });
  appCheckInstance = initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
  return appCheckInstance;
}
