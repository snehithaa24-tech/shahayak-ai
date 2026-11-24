import { pcm16ToFloat32 } from './pcm-utils';

export interface AudioPlayerOptions {
  sampleRate?: number; // Model default is 24000 Hz
  maxQueueSize?: number;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private readonly sampleRate: number;
  private readonly maxQueueSize: number;
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private queueCount = 0;

  constructor(options: AudioPlayerOptions = {}) {
    this.sampleRate = options.sampleRate ?? 24000;
    // Bounded buffer large enough for long voice answers (up to 2000 chunks ~ 40 seconds)
    this.maxQueueSize = options.maxQueueSize ?? 2000;
    this.onSpeakingChange = options.onSpeakingChange;
  }

  /**
   * Initializes or unlocks the AudioContext within a user gesture.
   * Uses device native sample rate for universal hardware speaker compatibility.
   */
  public async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('[AudioPlayer] AudioContext resume error:', err);
      }
    }

    return this.audioContext;
  }

  /**
   * Queues a 16-bit linear PCM chunk for playback at 24000 Hz.
   */
  public async queueAudioChunk(pcmData: Uint8Array): Promise<void> {
    const ctx = await this.ensureContext();

    if (this.queueCount >= this.maxQueueSize) {
      console.warn('[AudioPlayer] Audio queue reached bounded limit, dropping chunk');
      return;
    }

    const floatData = pcm16ToFloat32(pcmData);
    if (floatData.length === 0) return;

    // Create 24000 Hz audio buffer. The browser natively resamples to hardware output rate (e.g. 48kHz).
    const audioBuffer = ctx.createBuffer(1, floatData.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.activeSources.add(source);
    this.queueCount++;

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onSpeakingChange?.(true);
    }

    source.onended = () => {
      this.activeSources.delete(source);
      this.queueCount = Math.max(0, this.queueCount - 1);

      if (this.activeSources.size === 0) {
        this.isPlaying = false;
        this.onSpeakingChange?.(false);
      }
    };

    source.start(startTime);
  }

  /**
   * Interruption handler: immediately stops active audio sources,
   * empties queue, and resets playback schedule.
   */
  public stopAndClear(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped node errors
      }
    }
    this.activeSources.clear();
    this.queueCount = 0;
    this.nextPlayTime = 0;

    if (this.isPlaying) {
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
    }
  }

  /**
   * Completely tears down the audio player and releases context resources.
   */
  public async dispose(): Promise<void> {
    this.stopAndClear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore close errors
      }
    }
    this.audioContext = null;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
