import { resampleAudio, floatTo16BitPCM } from './pcm-utils';

export interface AudioRecorderOptions {
  targetSampleRate?: number; // 16000 Hz for Gemini Live audio input
  onAudioData?: (pcm16Chunk: Uint8Array) => void;
  onVolumeChange?: (volume: number) => void; // Normalized volume 0..1 for UI visualizer
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  speechThreshold?: number; // RMS threshold to detect user speech (default 0.015)
  silenceDurationMs?: number; // Silence duration to trigger speech end (default 900ms)
  onError?: (error: Error, code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown') => void;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muteNode: GainNode | null = null;
  private isRecording = false;
  private isMuted = false;

  // Voice Activity Detection (VAD) state
  private isUserSpeaking = false;
  private lastSpeechTimestamp = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private readonly speechThreshold: number;
  private readonly silenceDurationMs: number;

  private readonly targetSampleRate: number;
  private readonly onAudioData?: (pcm16Chunk: Uint8Array) => void;
  private readonly onVolumeChange?: (volume: number) => void;
  private readonly onSpeechStart?: () => void;
  private readonly onSpeechEnd?: () => void;
  private readonly onError?: (error: Error, code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown') => void;

  constructor(options: AudioRecorderOptions = {}) {
    this.targetSampleRate = options.targetSampleRate ?? 16000;
    this.speechThreshold = options.speechThreshold ?? 0.015;
    this.silenceDurationMs = options.silenceDurationMs ?? 950;
    this.onAudioData = options.onAudioData;
    this.onVolumeChange = options.onVolumeChange;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
    this.onError = options.onError;
  }

  /**
   * Requests microphone access and begins capturing audio.
   * Can accept an existing active AudioContext to preserve user activation.
   */
  public async start(existingContext?: AudioContext): Promise<void> {
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

      if (existingContext && existingContext.state !== 'closed') {
        this.audioContext = existingContext;
      } else {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const captureSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size of 2048 samples (~42ms at 48kHz) for lower latency and responsive VAD
      const bufferSize = 2048;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording || this.isMuted) return;

        const inputChannel = event.inputBuffer.getChannelData(0);

        // Compute RMS (energy level) for VAD and UI visualizer
        let sum = 0;
        for (let i = 0; i < inputChannel.length; i++) {
          sum += inputChannel[i] * inputChannel[i];
        }
        const rms = Math.sqrt(sum / inputChannel.length);
        const normalizedVolume = Math.min(1, rms * 5); // Scale for visualizer
        this.onVolumeChange?.(normalizedVolume);

        // VAD logic
        const now = Date.now();
        if (rms >= this.speechThreshold) {
          this.lastSpeechTimestamp = now;
          if (!this.isUserSpeaking) {
            this.isUserSpeaking = true;
            this.onSpeechStart?.();
          }

          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isUserSpeaking) {
          if (!this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
              if (this.isUserSpeaking && Date.now() - this.lastSpeechTimestamp >= this.silenceDurationMs) {
                this.isUserSpeaking = false;
                this.onSpeechEnd?.();
              }
              this.silenceTimer = null;
            }, this.silenceDurationMs);
          }
        }

        // Resample from hardware capture rate to target 16000 Hz
        const resampled = resampleAudio(inputChannel, captureSampleRate, this.targetSampleRate);
        const pcm16 = floatTo16BitPCM(resampled);

        this.onAudioData?.(pcm16);
      };

      // Connect processor through a muted gain node (gain = 0) to prevent acoustic feedback / echo loop
      this.muteNode = this.audioContext.createGain();
      this.muteNode.gain.value = 0;

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.muteNode);
      this.muteNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log(`[AudioRecorder] Microphone capture started (Hardware: ${captureSampleRate}Hz -> Target: ${this.targetSampleRate}Hz)`);
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
   * Toggles microphone mute state during an active call.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Resets VAD state when model begins speaking or after a turn completes.
   */
  public resetSpeechDetection(): void {
    this.isUserSpeaking = false;
    this.lastSpeechTimestamp = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Immediately stops recording and releases hardware microphone tracks.
   */
  public stop(): void {
    this.isRecording = false;
    this.resetSpeechDetection();

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.processorNode = null;
    }

    if (this.muteNode) {
      try {
        this.muteNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.muteNode = null;
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

    this.audioContext = null;
    console.log('[AudioRecorder] Microphone released.');
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}
