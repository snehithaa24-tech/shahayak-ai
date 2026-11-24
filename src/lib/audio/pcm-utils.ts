/**
 * Audio conversion utilities for 16-bit Linear PCM and resampling.
 * Adheres to Gemini Live API audio requirements:
 * - Input: 16-bit linear PCM, Little-Endian, 16000 Hz or 24000 Hz, mono.
 * - Output: 16-bit linear PCM, Little-Endian, 24000 Hz, mono.
 */

/**
 * Resamples a Float32Array of audio samples from sourceSampleRate to targetSampleRate
 * using linear interpolation.
 */
export function resampleAudio(
  inputData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate || inputData.length === 0) {
    return inputData;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.round(inputData.length / ratio);
  const result = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const originalPos = i * ratio;
    const index = Math.floor(originalPos);
    const decimal = originalPos - index;

    const sample1 = inputData[index] ?? 0;
    const sample2 = inputData[index + 1] ?? sample1;

    // Linear interpolation
    result[i] = sample1 + (sample2 - sample1) * decimal;
  }

  return result;
}

/**
 * Converts Float32Array (-1.0 to 1.0) into 16-bit Signed Linear PCM Little-Endian bytes.
 * Clamps out-of-range floats safely to prevent wrapping or distortion.
 */
export function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const output = new Uint8Array(input.length * 2);
  const view = new DataView(output.buffer);

  for (let i = 0; i < input.length; i++) {
    // Clamp sample to [-1, 1]
    const s = Math.max(-1, Math.min(1, input[i]));
    // Scale to 16-bit signed int [-32768, 32767]
    const val = Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
    view.setInt16(i * 2, val, true); // true = little-endian
  }

  return output;
}

/**
 * Converts 16-bit Signed Linear PCM Little-Endian bytes into Float32Array (-1.0 to 1.0).
 */
export function pcm16ToFloat32(pcmData: Uint8Array): Float32Array {
  const sampleCount = Math.floor(pcmData.byteLength / 2);
  const output = new Float32Array(sampleCount);
  const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = view.getInt16(i * 2, true); // little-endian
    output[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }

  return output;
}

/**
 * Encodes a Uint8Array into a standard Base64 string.
 * Works in both browser and Node.js environments.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into a Uint8Array.
 * Works in both browser and Node.js environments.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
