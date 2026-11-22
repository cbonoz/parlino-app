import { shouldUseFallbackRecapModel } from '@/services/recapFallback';

describe('shouldUseFallbackRecapModel', () => {
  it.each([
    'HTTP [429] rate limit exceeded',
    'request failed with [500] model is currently experiencing high demand',
    'HTTP 503 service temporarily unavailable',
    'model overload; please try again',
  ])('uses the fallback for transient service errors: %s', (message) => {
    expect(shouldUseFallbackRecapModel(new Error(message))).toBe(true);
  });

  it.each([
    'Firebase App Check token is invalid (403)',
    'invalid model configuration (400)',
  ])('does not use the fallback for request configuration errors: %s', (message) => {
    expect(shouldUseFallbackRecapModel(new Error(message))).toBe(false);
  });
});
