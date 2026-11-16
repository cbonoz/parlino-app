import { getApp, getApps } from '@react-native-firebase/app';
import Constants from 'expo-constants';
import {
  ReactNativeFirebaseAppCheckProvider,
  initializeAppCheck,
} from '@react-native-firebase/app-check';

let appCheckInitialized = false;

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

export function prepareAppCheck(): void {
  if (appCheckInitialized || !getFirebaseSetup().ready) return;
  const provider = new ReactNativeFirebaseAppCheckProvider();
  const useDebugProvider = __DEV__ || Constants.expoConfig?.extra?.appCheckDebug === true;
  provider.configure({
    android: { provider: useDebugProvider ? 'debug' : 'playIntegrity' },
  });
  initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
  appCheckInitialized = true;
}
