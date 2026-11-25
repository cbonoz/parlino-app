import { shouldForwardMicrophoneAudio } from '@/domain/microphone';

const listeningAndUnmuted = {
  hasConnection: true,
  isListening: true,
  isMuted: false,
  tutorAudioPlaying: false,
};

describe('shouldForwardMicrophoneAudio', () => {
  it('forwards audio while connected, listening, unmuted, and not playing tutor audio', () => {
    expect(shouldForwardMicrophoneAudio(listeningAndUnmuted)).toBe(true);
  });

  it.each([
    ['no live connection', { hasConnection: false }],
    ['not listening', { isListening: false }],
    ['muted', { isMuted: true }],
    ['tutor audio playing', { tutorAudioPlaying: true }],
  ])('does not forward audio when %s', (_reason, override) => {
    expect(shouldForwardMicrophoneAudio({ ...listeningAndUnmuted, ...override })).toBe(false);
  });
});
