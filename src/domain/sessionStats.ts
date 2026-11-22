import type { TranscriptTurn } from './types';

export type SessionTurnStats = {
  learnerTurnCount: number;
  tutorTurnCount: number;
};

export function countSessionTurns(turns: TranscriptTurn[]): SessionTurnStats {
  return turns.reduce<SessionTurnStats>((stats, turn) => {
    if (turn.role === 'learner') stats.learnerTurnCount += 1;
    else stats.tutorTurnCount += 1;
    return stats;
  }, { learnerTurnCount: 0, tutorTurnCount: 0 });
}
