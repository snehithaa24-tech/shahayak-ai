import { pcm16ToFloat32 } from './pcm-utils';

export interface AudioPlayerOptions {
  sampleRate?: number; // Model default is 24000 Hz
  maxQueueSize?: number;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

interface ScheduledLevel {
  startTime: number;
  endTime: number;
  level: number;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private readonly sampleRate: number;
  private readonly maxQueueSize: number;
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private scheduledLevels: ScheduledLevel[] = [];
  private isPlaying = false;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private queueCount = 0;

  constructor(options: AudioPlayerOptions = {}) {
    this.sampleRate = options.sampleRate ?? 24000;
    this.maxQueueSize = options.maxQueueSize ?? 2000;
    this.onSpeakingChange = options.onSpeakingChange;
  }

  /**
   * Initializes and unlocks the AudioContext within a user gesture.
   * Plays a silent 1-sample buffer to permanently unlock browser autoplay permissions.
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

    // Permanently unlock Web Audio playback
    try {
      const unlockBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const unlockSource = this.audioContext.createBufferSource();
      unlockSource.buffer = unlockBuffer;
      unlockSource.connect(this.audioContext.destination);
      unlockSource.start(0);
    } catch {
      // Ignore unlock buffer errors
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

    // Create 24000 Hz audio buffer. The browser natively resamples to hardware rate (e.g. 48kHz).
    const audioBuffer = ctx.createBuffer(1, floatData.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    const endTime = startTime + audioBuffer.duration;
    this.nextPlayTime = endTime;

    // Compute normalized RMS amplitude for real playback visualization
    let sum = 0;
    for (let i = 0; i < floatData.length; i++) {
      sum += floatData[i] * floatData[i];
    }
    const rms = Math.sqrt(sum / floatData.length);
    const level = Math.min(1, rms * 4.5);
    this.scheduledLevels.push({ startTime, endTime, level });
    if (this.scheduledLevels.length > this.maxQueueSize) {
      this.scheduledLevels.shift();
    }

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
    this.scheduledLevels = [];
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

  public getCurrentLevel(): number {
    if (!this.isPlaying || !this.audioContext || this.scheduledLevels.length === 0) {
      return 0;
    }

    const now = this.audioContext.currentTime;
    while (this.scheduledLevels.length > 0 && this.scheduledLevels[0].endTime < now) {
      this.scheduledLevels.shift();
    }

    const current = this.scheduledLevels.find((entry) => now >= entry.startTime && now <= entry.endTime);
    return current ? current.level : 0;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}
