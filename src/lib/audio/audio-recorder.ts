import { resampleAudio, floatTo16BitPCM } from './pcm-utils';

export interface AudioRecorderOptions {
  targetSampleRate?: number; // 16000 Hz for Gemini Live audio input
  onAudioData?: (pcm16Chunk: Uint8Array) => void;
  onError?: (error: Error, code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown') => void;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;

  private readonly targetSampleRate: number;
  private readonly onAudioData?: (pcm16Chunk: Uint8Array) => void;
  private readonly onError?: (error: Error, code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown') => void;

  constructor(options: AudioRecorderOptions = {}) {
    this.targetSampleRate = options.targetSampleRate ?? 16000;
    this.onAudioData = options.onAudioData;
    this.onError = options.onError;
  }

  /**
   * Requests microphone access and begins capturing audio.
   * MUST be invoked directly from a user gesture handler.
   */
  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const captureSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size of 4096 provides balance between latency (~85ms at 48kHz) and stability
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputChannel = event.inputBuffer.getChannelData(0);
        // Resample from hardware capture rate (e.g. 44100 or 48000 Hz) to target 16000 Hz
        const resampled = resampleAudio(inputChannel, captureSampleRate, this.targetSampleRate);
        const pcm16 = floatTo16BitPCM(resampled);

        this.onAudioData?.(pcm16);
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      let code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown' = 'unknown';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        code = 'permission_denied';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        code = 'device_not_found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        code = 'in_use';
      }

      this.onError?.(error, code);
      this.stop();
      throw error;
    }
  }

  /**
   * Immediately stops recording and releases hardware microphone tracks.
   */
  public stop(): void {
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch {
          // Ignore track stop errors
        }
      });
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Ignore close errors
      }
      this.audioContext = null;
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}
