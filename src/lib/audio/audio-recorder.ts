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
  private recordingStartTime = 0;
  private isUserSpeaking = false;
  private lastSpeechTimestamp = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private consecutiveVoicedFrames = 0;
  private voicedFramesInTurn = 0;
  private noiseFloor = 0.015;
  private readonly silenceDurationMs: number;

  private readonly targetSampleRate: number;
  private readonly onAudioData?: (pcm16Chunk: Uint8Array) => void;
  private readonly onVolumeChange?: (volume: number) => void;
  private readonly onSpeechStart?: () => void;
  private readonly onSpeechEnd?: () => void;
  private readonly onError?: (error: Error, code: 'permission_denied' | 'device_not_found' | 'in_use' | 'unknown') => void;

  constructor(options: AudioRecorderOptions = {}) {
    this.targetSampleRate = options.targetSampleRate ?? 16000;
    this.silenceDurationMs = options.silenceDurationMs ?? 1100;
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

      // Buffer size of 2048 samples (~42ms at 48kHz) for low latency
      const bufferSize = 2048;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.recordingStartTime = Date.now();
      this.consecutiveVoicedFrames = 0;
      this.voicedFramesInTurn = 0;
      this.noiseFloor = 0.015;

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording || this.isMuted) return;

        const inputChannel = event.inputBuffer.getChannelData(0);

        // Compute RMS (energy level)
        let sum = 0;
        for (let i = 0; i < inputChannel.length; i++) {
          sum += inputChannel[i] * inputChannel[i];
        }
        const rms = Math.sqrt(sum / inputChannel.length);
        const normalizedVolume = Math.min(1, Math.max(0, (rms - this.noiseFloor) * 6));
        this.onVolumeChange?.(normalizedVolume);

        const now = Date.now();
        // Warmup: discard the first 750ms while hardware audio pipeline settles
        if (now - this.recordingStartTime < 750) {
          this.noiseFloor = 0.8 * this.noiseFloor + 0.2 * rms;
          return;
        }

        // Adaptive speech threshold: must be substantially above the moving noise floor
        const dynamicThreshold = Math.max(0.035, this.noiseFloor * 2.8);

        if (!this.isUserSpeaking) {
          // Track background noise floor when user is not speaking
          this.noiseFloor = 0.98 * this.noiseFloor + 0.02 * rms;

          if (rms >= dynamicThreshold) {
            this.consecutiveVoicedFrames++;
            // Require at least 4 consecutive voiced frames (~170ms) to trigger speech start
            if (this.consecutiveVoicedFrames >= 4) {
              this.isUserSpeaking = true;
              this.voicedFramesInTurn = this.consecutiveVoicedFrames;
              this.lastSpeechTimestamp = now;
              this.onSpeechStart?.();

              if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
              }
            }
          } else {
            this.consecutiveVoicedFrames = 0;
          }
        } else {
          // User is currently speaking
          if (rms >= dynamicThreshold) {
            this.lastSpeechTimestamp = now;
            this.voicedFramesInTurn++;

            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
              this.silenceTimer = null;
            }
          } else {
            // Silence period detected
            if (!this.silenceTimer) {
              this.silenceTimer = setTimeout(() => {
                if (this.isUserSpeaking && Date.now() - this.lastSpeechTimestamp >= this.silenceDurationMs) {
                  this.isUserSpeaking = false;
                  const hadSubstantialSpeech = this.voicedFramesInTurn >= 8; // >= ~350ms of real voice
                  this.voicedFramesInTurn = 0;
                  this.consecutiveVoicedFrames = 0;

                  if (hadSubstantialSpeech) {
                    this.onSpeechEnd?.();
                  } else {
                    console.log('[AudioRecorder] Discarding brief transient noise, not sending turnComplete');
                  }
                }
                this.silenceTimer = null;
              }, this.silenceDurationMs);
            }
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
    this.consecutiveVoicedFrames = 0;
    this.voicedFramesInTurn = 0;
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
