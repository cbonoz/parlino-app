export type MicrophoneForwardingState = {
  hasConnection: boolean;
  isListening: boolean;
  isMuted: boolean;
  tutorAudioPlaying: boolean;
};

export function shouldForwardMicrophoneAudio({
  hasConnection,
  isListening,
  isMuted,
  tutorAudioPlaying,
}: MicrophoneForwardingState): boolean {
  return hasConnection && isListening && !isMuted && !tutorAudioPlaying;
}
