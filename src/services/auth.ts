import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import { getFirebaseSetup, prepareAppCheck } from './firebase';

export async function ensureAnonymousUser(): Promise<string | null> {
  if (!getFirebaseSetup().ready) return null;
  prepareAppCheck();
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}
