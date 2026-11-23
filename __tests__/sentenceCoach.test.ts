import { DEFAULT_SETTINGS } from '@/domain/types';
import { buildSentenceCoachPrompt } from '@/domain/sentenceCoach';

describe('buildSentenceCoachPrompt', () => {
  it('keeps coaching scoped to one learner sentence and the selected languages', () => {
    const prompt = buildSentenceCoachPrompt('  Yo gusto café.  ', {
      ...DEFAULT_SETTINGS,
      targetLanguage: 'Spanish',
      nativeLanguage: 'English',
      proficiency: 'beginner',
    });

    expect(prompt).toContain('studying Spanish');
    expect(prompt).toContain('speaks English');
    expect(prompt).toContain('is beginner');
    expect(prompt).toContain('Learner sentence: "Yo gusto café."');
    expect(prompt).toContain('Do not invent mistakes or change its meaning.');
    expect(prompt).not.toContain('Tutor:');
  });
});
