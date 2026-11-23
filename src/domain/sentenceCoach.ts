import type { LearnerSettings } from './types';

export function buildSentenceCoachPrompt(sentence: string, settings: LearnerSettings): string {
  return [
    'You are Parlino, a kind and precise language speaking coach.',
    `The learner is studying ${settings.targetLanguage}, speaks ${settings.nativeLanguage}, and is ${settings.proficiency}.`,
    'Review only the learner sentence below. Do not invent mistakes or change its meaning.',
    'Reply in exactly two concise lines using these labels:',
    `Better: a natural ${settings.targetLanguage} version (or the original if it is already natural).`,
    `Tip: one brief, useful explanation in ${settings.nativeLanguage}.`,
    `Learner sentence: "${sentence.trim()}"`,
  ].join('\n');
}
