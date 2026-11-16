import { getApp } from '@react-native-firebase/app';
import { getAI, getLiveGenerativeModel, ResponseModality } from '@react-native-firebase/ai';
import type { LearnerSettings, Scenario, TranscriptTurn } from '@/domain/types';
import { getFirebaseSetup, prepareAppCheck } from './firebase';
import { buildTutorInstruction } from './tutorPrompt';

export type LiveState = 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';
export type LiveEvent =
  | { type: 'state'; state: LiveState }
  | { type: 'transcript'; turn: TranscriptTurn }
  | { type: 'audio'; base64: string; sampleRate: number }
  | { type: 'error'; message: string };

export interface LiveConversation {
  startTutorTurn(): Promise<void>;
  sendAudio(base64Pcm: string): Promise<void>;
  close(): Promise<void>;
}

/** Native Firebase AI Logic provider. There is deliberately no simulated fallback. */
export async function connectLiveConversation(
  settings: LearnerSettings,
  scenario: Scenario,
  onEvent: (event: LiveEvent) => void,
  realTimeCorrections = false,
): Promise<LiveConversation> {
  const setup = getFirebaseSetup();
  if (!setup.ready) throw new Error(setup.message);
  prepareAppCheck();
  const tutorInstruction = buildTutorInstruction({ settings, scenario, realTimeCorrections });
  const model = getLiveGenerativeModel(getAI(getApp()), {
    // The RNFirebase Live API guide currently documents this native-audio Live model.
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
  onEvent({ type: 'state', state: 'connecting' });
  const session = await model.connect();
  let closed = false;
  let sendQueue = Promise.resolve();

  void (async () => {
    try {
      for await (const message of session.receive()) {
        if (closed) break;
        if (message.type === 'serverContent') {
          if (message.inputTranscription?.text) {
            onEvent({ type: 'transcript', turn: { role: 'learner', text: message.inputTranscription.text } });
          }
          if (message.outputTranscription?.text) {
            onEvent({ type: 'transcript', turn: { role: 'tutor', text: message.outputTranscription.text } });
          }
          const parts = message.modelTurn?.parts ?? [];
          for (const part of parts) {
            if ('inlineData' in part && part.inlineData?.data) {
              onEvent({ type: 'audio', base64: part.inlineData.data, sampleRate: 24_000 });
              onEvent({ type: 'state', state: 'speaking' });
            }
          }
          if (message.turnComplete) onEvent({ type: 'state', state: 'listening' });
        } else if (message.type === 'goingAwayNotice') {
          onEvent({ type: 'error', message: 'The voice connection is about to close. Please end and start a new session.' });
        }
      }
      if (!closed) onEvent({ type: 'error', message: 'The live voice connection ended unexpectedly. Check your network and try again.' });
    } catch (error) {
      if (!closed) onEvent({ type: 'error', message: error instanceof Error ? error.message : 'The voice connection was interrupted.' });
    }
  })();

  return {
    startTutorTurn() {
      // Avoid systemInstruction here: RNFirebase 27.1.1 serializes a Part `type`
      // field into the Live setup payload, which the Live API rejects.
      return session.sendTextRealtime(
        `${tutorInstruction}\n\nBegin now with one short, friendly question in the target language.`,
      );
    },
    sendAudio(base64Pcm) {
      sendQueue = sendQueue.then(() => session.sendAudioRealtime({ mimeType: 'audio/pcm;rate=16000', data: base64Pcm }));
      return sendQueue;
    },
    async close() {
      if (closed) return;
      closed = true;
      try { await session.close(); } finally { onEvent({ type: 'state', state: 'ended' }); }
    },
  };
}
