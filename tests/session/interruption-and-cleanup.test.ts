import { describe, it, expect, vi } from 'vitest';
import { AudioPlayer } from '@/lib/audio/audio-player';

describe('Audio Interruption and Cleanup', () => {
  it('stops active audio playback and clears queued chunks when interrupted', async () => {
    const onSpeakingChange = vi.fn();
    const player = new AudioPlayer({
      sampleRate: 24000,
      onSpeakingChange,
    });

    // Mock AudioContext
    const mockSource = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };

    const mockCtx = {
      state: 'running',
      currentTime: 10.0,
      createBuffer: vi.fn().mockReturnValue({
        duration: 1.5,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(2400)),
      }),
      createBufferSource: vi.fn().mockReturnValue(mockSource),
      destination: {},
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(player, 'audioContext', {
      value: mockCtx as unknown as AudioContext,
      writable: true,
    });

    // Queue non-zero PCM signal to verify amplitude level tracking + interruption reset
    const pcmBytes = new Uint8Array(4800);
    const view = new DataView(pcmBytes.buffer);
    for (let i = 0; i < 2400; i++) {
      view.setInt16(i * 2, i % 2 === 0 ? 12000 : -12000, true);
    }
    await player.queueAudioChunk(pcmBytes);

    expect(player.getIsPlaying()).toBe(true);
    expect(player.getCurrentLevel()).toBeGreaterThan(0);
    expect(mockSource.start).toHaveBeenCalled();

    // Trigger Interruption
    player.stopAndClear();

    expect(mockSource.stop).toHaveBeenCalled();
    expect(mockSource.disconnect).toHaveBeenCalled();
    expect(player.getIsPlaying()).toBe(false);
    expect(player.getCurrentLevel()).toBe(0);
  });

  it('safely disposes audio context and resets state on teardown', async () => {
    const player = new AudioPlayer();
    const mockCtx = {
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(player, 'audioContext', {
      value: mockCtx as unknown as AudioContext,
      writable: true,
    });

    await player.dispose();

    expect(mockCtx.close).toHaveBeenCalled();
  });
});
