/** A lightweight reminder cadence, not a scientifically validated learning algorithm. */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export function nextReviewAt(reviewCount: number, from = Date.now()): number {
  const safeCount = Number.isFinite(reviewCount) ? Math.max(0, Math.floor(reviewCount)) : 0;
  const days = REVIEW_INTERVAL_DAYS[Math.min(safeCount, REVIEW_INTERVAL_DAYS.length - 1)];
  return from + days * 24 * 60 * 60 * 1000;
}

export function isDue(dueAt: number, now = Date.now()): boolean {
  return Number.isFinite(dueAt) && dueAt <= now;
}
