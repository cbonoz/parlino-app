import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, setDoc } from '@react-native-firebase/firestore';
import type { LearnerSettings, SavedPhrase, SessionRecord } from '@/domain/types';
import { nextReviewAt } from '@/domain/reviewSchedule';
import { isLearnerSettings, isSavedPhrase } from '@/domain/validation';
import { ensureAnonymousUser } from './auth';
import { getFirebaseSetup, prepareAppCheck } from './firebase';
import {
  getLocalPhrases, getLocalSessions, getLocalSettings, putLocalPhrase,
  putLocalSession, replaceLocalPhrases, setLocalSettings,
} from './localStore';

function userCollection(uid: string, name: 'sessions' | 'savedPhrases') {
  return collection(getFirestore(), 'users', uid, name);
}

export async function loadSettings(): Promise<LearnerSettings> {
  const local = await getLocalSettings();
  if (!getFirebaseSetup().ready) return local;
  try {
    prepareAppCheck();
    const uid = await ensureAnonymousUser();
    if (!uid) return local;
    const snapshot = await getDoc(doc(getFirestore(), 'users', uid, 'settings', 'profile'));
    const remote = snapshot.data();
    if (isLearnerSettings(remote)) {
      await setLocalSettings(remote);
      return remote;
    }
    await setDoc(doc(getFirestore(), 'users', uid, 'settings', 'profile'), local, { merge: true });
    return local;
  } catch {
    return local;
  }
}

export async function saveSettings(settings: LearnerSettings): Promise<void> {
  await setLocalSettings(settings);
  if (!getFirebaseSetup().ready) return;
  prepareAppCheck();
  const uid = await ensureAnonymousUser();
  if (uid) await setDoc(doc(getFirestore(), 'users', uid, 'settings', 'profile'), settings, { merge: true });
}

export async function loadSessions(): Promise<SessionRecord[]> {
  const local = await getLocalSessions();
  if (!getFirebaseSetup().ready) return local;
  try {
    prepareAppCheck();
    const uid = await ensureAnonymousUser();
    if (!uid) return local;
    const snapshot = await getDocs(query(userCollection(uid, 'sessions'), orderBy('startedAt', 'desc')));
    const remote = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SessionRecord);
    const remoteIds = new Set(remote.map((item) => item.id));
    const localOnly = local.filter((item) => !remoteIds.has(item.id));
    await Promise.all(localOnly.map(({ id, ...data }) => setDoc(doc(userCollection(uid, 'sessions'), id), data)));
    return [...remote, ...localOnly].sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return local;
  }
}

export async function saveSession(session: SessionRecord): Promise<void> {
  await saveSessionLocally(session);
  await syncSession(session);
}

export async function saveSessionLocally(session: SessionRecord): Promise<void> {
  await putLocalSession(session);
}

export async function syncSession(session: SessionRecord): Promise<void> {
  if (!getFirebaseSetup().ready) return;
  prepareAppCheck();
  const uid = await ensureAnonymousUser();
  if (!uid) return;
  const { id, ...data } = session;
  await setDoc(doc(userCollection(uid, 'sessions'), id), data);
}

export async function loadSavedPhrases(): Promise<SavedPhrase[]> {
  const local = await getLocalPhrases();
  if (!getFirebaseSetup().ready) return local;
  try {
    prepareAppCheck();
    const uid = await ensureAnonymousUser();
    if (!uid) return local;
    const snapshot = await getDocs(userCollection(uid, 'savedPhrases'));
    const remote = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as SavedPhrase)
      .filter(isSavedPhrase)
      .sort((a, b) => a.dueAt - b.dueAt);
    const remoteIds = new Set(remote.map((item) => item.id));
    const localOnly = local.filter((item) => !remoteIds.has(item.id));
    await Promise.all(localOnly.map(({ id, ...data }) => setDoc(doc(userCollection(uid, 'savedPhrases'), id), data)));
    const merged = [...remote, ...localOnly].sort((a, b) => a.dueAt - b.dueAt);
    if (remote.length || localOnly.length) await replaceLocalPhrases(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function savePhrase(phrase: SavedPhrase): Promise<void> {
  await putLocalPhrase(phrase);
  if (!getFirebaseSetup().ready) return;
  prepareAppCheck();
  const uid = await ensureAnonymousUser();
  if (!uid) return;
  const { id, ...data } = phrase;
  await setDoc(doc(userCollection(uid, 'savedPhrases'), id), data);
}

export async function markPhraseReviewed(phrase: SavedPhrase): Promise<SavedPhrase> {
  const reviewCount = phrase.reviewCount + 1;
  const updated = { ...phrase, reviewCount, dueAt: nextReviewAt(reviewCount) };
  await savePhrase(updated);
  return updated;
}
