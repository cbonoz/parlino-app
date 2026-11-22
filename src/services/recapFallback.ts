export function shouldUseFallbackRecapModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(?:429|500|502|503|504)\b|high demand|temporarily unavailable|overload(?:ed)?/i.test(message);
}
