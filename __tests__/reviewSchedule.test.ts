import { daysUntil, isDue, nextReviewAt, REVIEW_INTERVAL_DAYS } from '../src/domain/reviewSchedule';

describe('saved phrase review schedule', () => {
  const day = 24 * 60 * 60 * 1000;

  it('uses the documented 1, 3, 7, 14, then 30 day cadence', () => {
    REVIEW_INTERVAL_DAYS.forEach((interval, index) => {
      expect(nextReviewAt(index, 1_000)).toBe(1_000 + interval * day);
    });
    expect(nextReviewAt(100, 1_000)).toBe(1_000 + 30 * day);
  });

  it('handles invalid review counts safely and checks due timestamps', () => {
    expect(nextReviewAt(-1, 0)).toBe(day);
    expect(nextReviewAt(Number.NaN, 0)).toBe(day);
    expect(isDue(1_000, 1_000)).toBe(true);
    expect(isDue(1_001, 1_000)).toBe(false);
    expect(isDue(Number.NaN, 1_000)).toBe(false);
  });

  it('labels the next review in whole days with a minimum of one', () => {
    expect(daysUntil(1_000 + day, 1_000)).toBe(1);
    expect(daysUntil(1_000 + 2 * day - 1, 1_000)).toBe(2);
    expect(daysUntil(1_000, 1_000)).toBe(1);
    expect(daysUntil(Number.NaN, 1_000)).toBe(1);
  });
});
