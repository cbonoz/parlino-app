import { getApp } from '@react-native-firebase/app';
import { getAI, getGenerativeModel } from '@react-native-firebase/ai';
import type { LearnerSettings, SessionRecap, TranscriptTurn } from '@/domain/types';
import { parseRecap } from '@/domain/recap';
import { getFirebaseSetup, prepareAppCheck } from './firebase';
import { shouldUseFallbackRecapModel } from './recapFallback';

export async function createSessionRecap(
  turns: TranscriptTurn[],
  settings: LearnerSettings,
): Promise<SessionRecap> {
  if (!getFirebaseSetup().ready) throw new Error('Connect Firebase AI Logic to create a session recap.');
  if (turns.length === 0) throw new Error('There is no transcript to recap yet.');
  const ai = getAI(getApp(), { appCheck: prepareAppCheck() });
  const transcript = turns.map((turn) => `${turn.role === 'learner' ? 'Learner' : 'Tutor'}: ${turn.text}`).join('\n');
  const prompt = [
    `Create a kind, concise language-learning recap for a ${settings.proficiency} learner of ${settings.targetLanguage}.`,
    'Return JSON only with this shape: {"corrections":[{"original":"...","improved":"...","explanation":"..."}],"phrases":[{"phrase":"...","translation":"...","note":"..."}],"positiveNote":"..."}.',
    'Include at most 3 corrections that are clearly supported by the learner transcript and at most 4 useful phrases from the exchange. Be gentle. Do not invent mistakes. If there are no clear corrections, return an empty corrections array.',
    `Transcript:\n${transcript.slice(0, 12000)}`,
  ].join('\n\n');

  let text: string;
  try {
    const model = getGenerativeModel(ai, {
      model: 'gemini-3.8-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const response = await model.generateContent(prompt);
    text = response.response.text();
  } catch (error) {
    if (!shouldUseFallbackRecapModel(error)) throw error;
    console.warn('[Recap] Gemini 3.8 Flash is busy; retrying with Gemini 3.5 Flash-Lite.');
    const fallbackModel = getGenerativeModel(ai, {
      model: 'gemini-3.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const fallbackResponse = await fallbackModel.generateContent(prompt);
    text = fallbackResponse.response.text();
  }

  const recap = parseRecap(text);
  if (!recap) throw new Error('The recap response could not be read. Your session is still saved.');
  return recap;
}
