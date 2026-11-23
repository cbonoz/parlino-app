import { DEFAULT_SETTINGS } from '@/domain/types';
import { buildSentenceCoachPrompt } from '@/domain/sentenceCoach';
import { createCustomScenario } from '@/domain/scenarios';
import { buildTutorInstruction } from '@/services/tutorPrompt';

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

describe('createCustomScenario', () => {
  it('trims and creates a scenario with a bounded title and objective', () => {
    expect(createCustomScenario('  At the market  ', '  Ask about fresh fruit.  ')).toEqual({
      id: 'custom',
      title: 'At the market',
      subtitle: 'Your own practice scenario',
      icon: '✦',
      objective: 'Ask about fresh fruit.',
    });
  });

  it('rejects a missing title or practice goal', () => {
    expect(createCustomScenario('', 'Practice a greeting.')).toBeNull();
    expect(createCustomScenario('At the market', '   ')).toBeNull();
  });

  it('uses the custom situation and goal in the tutor instruction', () => {
    const scenario = createCustomScenario('At the market', 'Ask about fresh fruit.');
    expect(scenario).not.toBeNull();
    if (!scenario) return;

    const instruction = buildTutorInstruction({ settings: DEFAULT_SETTINGS, scenario });
    expect(instruction).toContain('Scenario title: "At the market"');
    expect(instruction).toContain('Objective: "Ask about fresh fruit."');
    expect(instruction).toContain('Treat the scenario as role-play context');
  });
});
