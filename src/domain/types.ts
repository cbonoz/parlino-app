export type Proficiency = 'beginner' | 'intermediate' | 'advanced';

export type LearnerSettings = {
  targetLanguage: string;
  nativeLanguage: string;
  proficiency: Proficiency;
  goal: string;
  onboardingComplete: boolean;
  saveTranscripts: boolean;
};

export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  objective: string;
};

export type TranscriptTurn = { role: 'learner' | 'tutor'; text: string };

export type RecapCorrection = {
  original: string;
  improved: string;
  explanation: string;
};

export type RecapPhrase = { phrase: string; translation: string; note?: string };

export type SessionRecap = {
  corrections: RecapCorrection[];
  phrases: RecapPhrase[];
  positiveNote: string;
};

export type SavedPhrase = RecapPhrase & {
  id: string;
  createdAt: number;
  dueAt: number;
  reviewCount: number;
  sourceSessionId?: string;
};

export type SessionRecord = {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  startedAt: number;
  durationSeconds: number;
  learnerTurnCount?: number;
  tutorTurnCount?: number;
  summary?: SessionRecap | null;
  transcript?: TranscriptTurn[];
};

export const DEFAULT_SETTINGS: LearnerSettings = {
  targetLanguage: 'Spanish',
  nativeLanguage: 'English',
  proficiency: 'beginner',
  goal: 'Travel',
  onboardingComplete: false,
  saveTranscripts: false,
};

export const SCENARIOS: Scenario[] = [
  { id: 'food', title: 'Order at a café', subtitle: 'A table for one, please', icon: '☕', objective: 'Order a drink and a snack politely.' },
  { id: 'travel', title: 'Find your way', subtitle: 'Ask a local for directions', icon: '↗', objective: 'Ask how to get somewhere and understand the reply.' },
  { id: 'small-talk', title: 'Meet someone new', subtitle: 'Easy, everyday small talk', icon: '✳', objective: 'Introduce yourself and keep a friendly chat going.' },
  { id: 'work', title: 'At the workplace', subtitle: 'Share an idea with a colleague', icon: '▤', objective: 'Explain a simple idea and ask a follow-up question.' },
];
