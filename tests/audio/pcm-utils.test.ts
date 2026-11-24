import { describe, it, expect } from 'vitest';
import {
  resampleAudio,
  floatTo16BitPCM,
  pcm16ToFloat32,
  arrayBufferToBase64,
  base64ToUint8Array,
} from '@/lib/audio/pcm-utils';

describe('PCM and Audio Utilities', () => {
  it('resamples audio correctly from 48000 Hz to 16000 Hz', () => {
    // 48000 samples = 1 second of audio at 48kHz
    const input = new Float32Array(48000);
    // Fill with a 440Hz sine wave
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
    }

    const resampled = resampleAudio(input, 48000, 16000);
    // Should result in approximately 16000 samples
    expect(resampled.length).toBe(16000);
    // Peak values should remain within [-1, 1]
    let max = -Infinity;
    let min = Infinity;
    for (let i = 0; i < resampled.length; i++) {
      if (resampled[i] > max) max = resampled[i];
      if (resampled[i] < min) min = resampled[i];
    }
    expect(max).toBeLessThanOrEqual(1.0);
    expect(min).toBeGreaterThanOrEqual(-1.0);
  });

  it('resamples audio correctly from 44100 Hz to 16000 Hz', () => {
    const input = new Float32Array(44100);
    for (let i = 0; i < input.length; i++) {
      input[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / 44100);
    }

    const resampled = resampleAudio(input, 44100, 16000);
    expect(resampled.length).toBe(16000);
  });

  it('returns exact same buffer if source and target sample rates match', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const resampled = resampleAudio(input, 16000, 16000);
    expect(resampled).toBe(input);
  });

  it('converts float audio to 16-bit linear PCM little-endian with clamping', () => {
    // Test values: silent (0), positive half (0.5), maximum (1.0), overflow (1.5), negative half (-0.5), underflow (-1.5)
    const floatSamples = new Float32Array([0.0, 0.5, 1.0, 1.5, -0.5, -1.0, -1.5]);
    const pcmBytes = floatTo16BitPCM(floatSamples);

    // 7 samples * 2 bytes = 14 bytes
    expect(pcmBytes.byteLength).toBe(14);

    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
    expect(view.getInt16(0, true)).toBe(0);
    expect(view.getInt16(2, true)).toBe(Math.round(0.5 * 32767));
    expect(view.getInt16(4, true)).toBe(32767);
    // Overflown 1.5 clamped to 32767
    expect(view.getInt16(6, true)).toBe(32767);
    expect(view.getInt16(8, true)).toBe(-16384);
    expect(view.getInt16(10, true)).toBe(-32768);
    // Underflown -1.5 clamped to -32768
    expect(view.getInt16(12, true)).toBe(-32768);
  });

  it('performs accurate round-trip between Float32 and PCM16', () => {
    const original = new Float32Array([0.0, 0.25, -0.25, 0.75, -0.75]);
    const pcm = floatTo16BitPCM(original);
    const recovered = pcm16ToFloat32(pcm);

    expect(recovered.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      // 16-bit precision error is less than 0.001
      expect(recovered[i]).toBeCloseTo(original[i], 3);
    }
  });

  it('encodes and decodes base64 PCM chunks without corruption', () => {
    const originalBytes = new Uint8Array([0x01, 0x02, 0x03, 0xff, 0xfe, 0x80, 0x7f]);
    const base64 = arrayBufferToBase64(originalBytes);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    const decodedBytes = base64ToUint8Array(base64);
    expect(decodedBytes.length).toBe(originalBytes.length);
    for (let i = 0; i < originalBytes.length; i++) {
      expect(decodedBytes[i]).toBe(originalBytes[i]);
    }
  });
});
