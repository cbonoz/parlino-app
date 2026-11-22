import { countSessionTurns } from '@/domain/sessionStats';

describe('countSessionTurns', () => {
  it('counts learner and tutor turns separately', () => {
    expect(countSessionTurns([
      { role: 'tutor', text: 'Hola.' },
      { role: 'learner', text: 'Quiero un café.' },
      { role: 'tutor', text: '¿Algo más?' },
    ])).toEqual({ learnerTurnCount: 1, tutorTurnCount: 2 });
  });

  it('returns zero counts for an empty transcript', () => {
    expect(countSessionTurns([])).toEqual({ learnerTurnCount: 0, tutorTurnCount: 0 });
  });
});
