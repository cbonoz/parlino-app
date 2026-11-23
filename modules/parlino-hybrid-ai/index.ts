import { requireNativeModule } from 'expo-modules-core';

export type HybridCoachResult = {
  text: string;
  inferenceSource: string;
};

type ParlinoHybridAINativeModule = {
  getOnDeviceStatus(): Promise<string>;
  coachSentence(prompt: string): Promise<HybridCoachResult & { deviceStatus: string }>;
};

export function getParlinoHybridAI(): ParlinoHybridAINativeModule {
  return requireNativeModule<ParlinoHybridAINativeModule>('ParlinoHybridAI');
}
