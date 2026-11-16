import type { LearnerSettings, Proficiency, RecapPhrase, SavedPhrase } from './types';

const proficiencyValues: Proficiency[] = ['beginner', 'intermediate', 'advanced'];

export function isLearnerSettings(value: unknown): value is LearnerSettings {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.targetLanguage === 'string' && candidate.targetLanguage.trim().length > 0 &&
    typeof candidate.nativeLanguage === 'string' && candidate.nativeLanguage.trim().length > 0 &&
    proficiencyValues.includes(candidate.proficiency as Proficiency) &&
    typeof candidate.goal === 'string' && candidate.goal.trim().length > 0 &&
    typeof candidate.onboardingComplete === 'boolean' &&
    typeof candidate.saveTranscripts === 'boolean'
  );
}

export function isRecapPhrase(value: unknown): value is RecapPhrase {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.phrase === 'string' && candidate.phrase.trim().length > 0 &&
    typeof candidate.translation === 'string' && candidate.translation.trim().length > 0 &&
    (candidate.note === undefined || typeof candidate.note === 'string');
}

export function isSavedPhrase(value: unknown): value is SavedPhrase {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return isRecapPhrase(value) && typeof candidate.id === 'string' &&
    Number.isFinite(candidate.createdAt) && Number.isFinite(candidate.dueAt) &&
    Number.isInteger(candidate.reviewCount) && (candidate.reviewCount as number) >= 0;
}
