import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearnerSettings, SavedPhrase, SessionRecord } from '@/domain/types';
import { DEFAULT_SETTINGS } from '@/domain/types';
import { isLearnerSettings, isSavedPhrase } from '@/domain/validation';

const SETTINGS_KEY = '@language-practice/settings';
const SESSIONS_KEY = '@language-practice/sessions';
const PHRASES_KEY = '@language-practice/phrases';

async function readArray<T>(key: string, predicate: (value: unknown) => value is T): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(predicate) : [];
  } catch {
    return [];
  }
}

export async function getLocalSettings(): Promise<LearnerSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (isLearnerSettings(value)) return value;
    }
  } catch {
    // An unreadable local setting falls back to the safe first-run defaults.
  }
  return DEFAULT_SETTINGS;
}

export async function setLocalSettings(settings: LearnerSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getLocalSessions(): Promise<SessionRecord[]> {
  return readArray<SessionRecord>(SESSIONS_KEY, (value): value is SessionRecord => {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    return typeof item.id === 'string' && typeof item.scenarioTitle === 'string' &&
      Number.isFinite(item.startedAt) && Number.isFinite(item.durationSeconds);
  });
}

export async function putLocalSession(session: SessionRecord): Promise<void> {
  const sessions = await getLocalSessions();
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...sessions.filter((item) => item.id !== session.id)].slice(0, 30)));
}

export async function getLocalPhrases(): Promise<SavedPhrase[]> {
  return readArray<SavedPhrase>(PHRASES_KEY, isSavedPhrase);
}

export async function putLocalPhrase(phrase: SavedPhrase): Promise<void> {
  const phrases = await getLocalPhrases();
  await AsyncStorage.setItem(PHRASES_KEY, JSON.stringify([phrase, ...phrases.filter((item) => item.id !== phrase.id)]));
}

export async function replaceLocalPhrases(phrases: SavedPhrase[]): Promise<void> {
  await AsyncStorage.setItem(PHRASES_KEY, JSON.stringify(phrases.filter(isSavedPhrase)));
}
