import { isLearnerSettings, isRecapPhrase, isSavedPhrase } from '../src/domain/validation';
import { DEFAULT_SETTINGS } from '../src/domain/types';

describe('data validation', () => {
  it('accepts complete learner settings and rejects missing or invalid values', () => {
    expect(isLearnerSettings({ ...DEFAULT_SETTINGS, onboardingComplete: true })).toBe(true);
    expect(isLearnerSettings({ ...DEFAULT_SETTINGS, targetLanguage: ' ' })).toBe(false);
    expect(isLearnerSettings({ ...DEFAULT_SETTINGS, proficiency: 'expert' })).toBe(false);
    expect(isLearnerSettings(null)).toBe(false);
  });

  it('validates phrase and saved phrase data', () => {
    const phrase = { phrase: '¿Me trae la cuenta?', translation: 'Could I have the bill?' };
    expect(isRecapPhrase(phrase)).toBe(true);
    expect(isRecapPhrase({ ...phrase, translation: '' })).toBe(false);
    expect(isSavedPhrase({ ...phrase, id: 'p1', createdAt: 1, dueAt: 2, reviewCount: 0 })).toBe(true);
    expect(isSavedPhrase({ ...phrase, id: 'p1', createdAt: 1, dueAt: 2, reviewCount: -1 })).toBe(false);
  });
});
