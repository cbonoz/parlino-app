import { getApp } from '@react-native-firebase/app';
import { getAI, getGenerativeModel } from '@react-native-firebase/ai';
import type { LearnerSettings } from '@/domain/types';
import { buildSentenceCoachPrompt } from '@/domain/sentenceCoach';
import { getParlinoHybridAI } from '../../modules/parlino-hybrid-ai';
import { getFirebaseSetup, prepareAppCheck } from './firebase';

export type SentenceCoachResult = {
  text: string;
  inferenceSource: 'ON_DEVICE' | 'IN_CLOUD' | 'CLOUD_FALLBACK';
  deviceStatus: string;
};

export async function coachSentence(
  sentence: string,
  settings: LearnerSettings,
  onDeviceStatus?: (status: string) => void,
): Promise<SentenceCoachResult> {
  const trimmedSentence = sentence.trim();
  if (!trimmedSentence) throw new Error('There is no learner sentence to coach.');
  if (!getFirebaseSetup().ready) throw new Error('Connect Firebase AI Logic to get a sentence tip.');

  const prompt = buildSentenceCoachPrompt(trimmedSentence, settings);
  const ai = getAI(getApp(), { appCheck: prepareAppCheck() });
  let deviceStatus = 'UNKNOWN';
  let nativeModule: ReturnType<typeof getParlinoHybridAI> | null = null;

  try {
    nativeModule = getParlinoHybridAI();
    deviceStatus = await nativeModule.getOnDeviceStatus();
    onDeviceStatus?.(deviceStatus);
  } catch (statusError) {
    console.warn('[SentenceCoach] Could not check on-device model support.', statusError);
    onDeviceStatus?.(deviceStatus);
  }

  try {
    nativeModule ??= getParlinoHybridAI();
    const result = await nativeModule.coachSentence(prompt);
    deviceStatus = result.deviceStatus || deviceStatus;
    onDeviceStatus?.(deviceStatus);
    const text = result.text?.trim();
    if (text) {
      return {
        text,
        inferenceSource: result.inferenceSource === 'ON_DEVICE' ? 'ON_DEVICE' : 'IN_CLOUD',
        deviceStatus,
      };
    }
    throw new Error('Hybrid coach returned an empty response.');
  } catch (hybridError) {
    console.warn('[SentenceCoach] Hybrid request failed; trying the cloud model.', hybridError);
  }

  try {
    const model = getGenerativeModel(ai, {
      model: 'gemini-3.5-flash-lite',
      generationConfig: { maxOutputTokens: 128 },
    });
    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();
    if (!text) throw new Error('Cloud coach returned an empty response.');
    return { text, inferenceSource: 'CLOUD_FALLBACK', deviceStatus };
  } catch (cloudError) {
    console.warn('[SentenceCoach] Cloud fallback failed.', cloudError);
    throw new Error('The sentence tip is unavailable right now. Your conversation is still safe—try again in a moment.');
  }
}
