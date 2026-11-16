import type { Scenario, TranscriptTurn } from '@/domain/types';

export type SessionDraft = {
  id: string;
  scenario: Scenario;
  startedAt: number;
  durationSeconds: number;
  turns: TranscriptTurn[];
};

let currentDraft: SessionDraft | null = null;

export function setSessionDraft(draft: SessionDraft): void { currentDraft = draft; }
export function getSessionDraft(): SessionDraft | null { return currentDraft; }
export function clearSessionDraft(): void { currentDraft = null; }
