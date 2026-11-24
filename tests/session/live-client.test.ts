import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiLiveClient } from '@/lib/gemini/live-client';

class MockSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static latest: MockSocket;
  readyState = 1;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => Promise<void>;
  onclose?: (event: { code: number; reason: string }) => void;
  send = vi.fn();
  close = vi.fn();
  constructor() { MockSocket.latest = this; }
  async receive(data: unknown) {
    await this.onmessage?.({ data: JSON.stringify(data) });
  }
}

afterEach(() => vi.unstubAllGlobals());

describe('Gemini Live conversation protocol', () => {
  it('waits for setup and flushes audio without injecting an empty user turn', async () => {
    vi.stubGlobal('WebSocket', MockSocket);
    const client = new GeminiLiveClient({ token: 'test', model: 'test' });
    const connected = client.connect();
    const ws = MockSocket.latest;
    ws.onopen?.();
    ws.send.mockClear();
    client.sendTextMessage('too early');
    client.sendAudioChunk(new Uint8Array([0, 0]));
    expect(ws.send).not.toHaveBeenCalled();
    await ws.receive({ setupComplete: {} });
    await connected;
    client.sendAudioChunk(new Uint8Array([0, 0]));
    client.sendAudioStreamEnd();
    const messages = ws.send.mock.calls.map(([data]) => JSON.parse(data));
    expect(messages[0].realtimeInput.audio.mimeType).toBe('audio/pcm;rate=16000');
    expect(messages[1]).toEqual({ realtimeInput: { audioStreamEnd: true } });
    expect(messages.some(message => message.clientContent)).toBe(false);
    client.sendTextMessage('My name is Maya');
    client.sendTextMessage('What name did I give you?');
    expect(JSON.parse(ws.send.mock.calls.at(-1)![0]).clientContent.turns[0].parts[0].text)
      .toBe('What name did I give you?');
  });

  it('delivers speech transcripts once and excludes model thoughts', async () => {
    vi.stubGlobal('WebSocket', MockSocket);
    const onTranscriptChunk = vi.fn();
    const onInputTranscription = vi.fn();
    const onTurnComplete = vi.fn();
    const client = new GeminiLiveClient({ token: 'test', model: 'test', onTranscriptChunk, onInputTranscription, onTurnComplete });
    const connected = client.connect();
    await MockSocket.latest.receive({ setupComplete: {} });
    await connected;
    await MockSocket.latest.receive({ serverContent: {
      inputTranscription: { text: 'My name is Maya', finished: true },
      outputTranscription: { text: 'Hello Maya.' },
      modelTurn: { parts: [{ text: 'private reasoning', thought: true }, { text: 'Hello Maya.' }] },
      turnComplete: true,
    } });
    expect(onInputTranscription).toHaveBeenCalledWith('My name is Maya', true);
    expect(onTranscriptChunk).toHaveBeenCalledExactlyOnceWith('Hello Maya.', false);
    expect(onTurnComplete).toHaveBeenCalledOnce();
  });

  it('rejects setup when the server closes before setup confirmation', async () => {
    vi.stubGlobal('WebSocket', MockSocket);
    const client = new GeminiLiveClient({ token: 'test', model: 'test' });
    const connected = client.connect();
    MockSocket.latest.onopen?.();
    MockSocket.latest.onclose?.({ code: 1008, reason: 'Invalid setup' });
    await expect(connected).rejects.toThrow('before session setup');
  });
});
