import { isRecapPhrase } from './validation';
import type { RecapCorrection, RecapPhrase, SessionRecap } from './types';

const cleanText = (value: unknown, maxLength = 260): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

function parseCorrection(value: unknown): RecapCorrection | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const original = cleanText(item.original, 180);
  const improved = cleanText(item.improved, 180);
  const explanation = cleanText(item.explanation, 220);
  return original && improved && explanation ? { original, improved, explanation } : null;
}

function parsePhrase(value: unknown): RecapPhrase | null {
  if (!isRecapPhrase(value)) return null;
  return {
    phrase: cleanText(value.phrase, 180),
    translation: cleanText(value.translation, 180),
    ...(value.note ? { note: cleanText(value.note, 180) } : {}),
  };
}

/** Parses model JSON defensively; malformed items are omitted rather than shown as invented feedback. */
export function parseRecap(input: unknown): SessionRecap | null {
  let value = input;
  if (typeof input === 'string') {
    const json = input.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      value = JSON.parse(json);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const corrections = Array.isArray(item.corrections)
    ? item.corrections.map(parseCorrection).filter((entry): entry is RecapCorrection => entry !== null).slice(0, 3)
    : [];
  const phrases = Array.isArray(item.phrases)
    ? item.phrases.map(parsePhrase).filter((entry): entry is RecapPhrase => entry !== null).slice(0, 4)
    : [];
  const positiveNote = cleanText(item.positiveNote, 240);
  if (!positiveNote && corrections.length === 0 && phrases.length === 0) return null;
  return { corrections, phrases, positiveNote: positiveNote || 'You showed up and kept the conversation moving. That is real progress.' };
}
