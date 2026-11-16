import { fromByteArray, toByteArray } from 'base64-js';
import { AudioContext } from 'react-native-audio-api';
import type { AudioStreamBuffer } from 'expo-audio';

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

export function toMonoPcm16kBase64(buffer: AudioStreamBuffer): string {
  const input = buffer.data;
  // The stream is configured with encoding: 'int16' at the call site.
  const sourceSamples = new Int16Array(input);
  const frameCount = Math.floor(sourceSamples.length / Math.max(buffer.channels, 1));
  const mono = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sample = 0;
    for (let channel = 0; channel < buffer.channels; channel += 1) {
      const value = sourceSamples[frame * buffer.channels + channel] ?? 0;
      sample += value / 32768;
    }
    mono[frame] = sample / buffer.channels;
  }

  const outputLength = Math.max(1, Math.round(frameCount * INPUT_SAMPLE_RATE / buffer.sampleRate));
  const bytes = new Uint8Array(outputLength * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * buffer.sampleRate / INPUT_SAMPLE_RATE;
    const left = Math.min(Math.floor(position), frameCount - 1);
    const right = Math.min(left + 1, frameCount - 1);
    const weight = position - left;
    const value = Math.max(-1, Math.min(1, mono[left] * (1 - weight) + mono[right] * weight));
    view.setInt16(index * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return fromByteArray(bytes);
}

/** Queues 24 kHz PCM chunks on the native audio output timeline without writing audio files. */
export class LiveAudioPlayer {
  private readonly context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  private nextStartTime = 0;

  async play(base64Pcm: string, sampleRate = OUTPUT_SAMPLE_RATE): Promise<void> {
    const bytes = toByteArray(base64Pcm);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (!sampleCount) return;
    await this.context.resume();
    const buffer = this.context.createBuffer(1, sampleCount, sampleRate);
    const samples = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = view.getInt16(index * 2, true) / 32768;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startAt = Math.max(this.context.currentTime + 0.025, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + sampleCount / sampleRate;
  }

  async stop(): Promise<void> {
    this.nextStartTime = 0;
    await this.context.close();
  }
}
