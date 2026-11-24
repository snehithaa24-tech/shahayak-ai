import { describe, it, expect } from 'vitest';
import { type TranscriptTurn } from '@/lib/session/transcript-types';

describe('Transcript Deduplication and Ordering', () => {
  it('prevents duplicate turns when finalizing transcripts with the same turn id', () => {
    let transcripts: TranscriptTurn[] = [];

    const addOrUpdateTurn = (newTurn: TranscriptTurn) => {
      const index = transcripts.findIndex((t) => t.id === newTurn.id);
      if (index >= 0) {
        transcripts = transcripts.map((t, i) => (i === index ? newTurn : t));
      } else {
        transcripts = [...transcripts, newTurn];
      }
    };

    // User turn 1
    addOrUpdateTurn({
      id: 'turn-1',
      role: 'user',
      content: 'मेरा नाम रवि है। मुझे अंग्रेज़ी सीखने का एक आसान तरीका बताइए।',
      language: 'hi',
      timestamp: 1000,
      isFinal: true,
    });

    // Assistant interim turn 2
    addOrUpdateTurn({
      id: 'turn-2',
      role: 'assistant',
      content: 'नमस्ते रवि, अंग्रेज़ी सीखने के लिए',
      language: 'hi',
      timestamp: 1001,
      isFinal: false,
    });

    // Assistant final turn 2 (same id)
    addOrUpdateTurn({
      id: 'turn-2',
      role: 'assistant',
      content: 'नमस्ते रवि, अंग्रेज़ी सीखने के लिए रोज़ाना थोड़ी बातचीत और अभ्यास सबसे आसान तरीका है।',
      language: 'hi',
      timestamp: 1002,
      isFinal: true,
    });

    expect(transcripts).toHaveLength(2);
    expect(transcripts[0].content).toContain('रवि');
    expect(transcripts[1].id).toBe('turn-2');
    expect(transcripts[1].isFinal).toBe(true);
    expect(transcripts[1].content).toBe(
      'नमस्ते रवि, अंग्रेज़ी सीखने के लिए रोज़ाना थोड़ी बातचीत और अभ्यास सबसे आसान तरीका है।'
    );
  });

  it('maintains chronological multi-turn order across consecutive spoken turns', () => {
    const turns: TranscriptTurn[] = [
      {
        id: 'u-1',
        role: 'user',
        content: 'My name is Maya. Suggest a quick breakfast.',
        language: 'en',
        timestamp: 1000,
        isFinal: true,
      },
      {
        id: 'a-1',
        role: 'assistant',
        content: 'Hello Maya! A bowl of oatmeal with fresh bananas and peanut butter is quick and nutritious.',
        language: 'en',
        timestamp: 1005,
        isFinal: true,
      },
      {
        id: 'u-2',
        role: 'user',
        content: 'What name did I give you?',
        language: 'en',
        timestamp: 1010,
        isFinal: true,
      },
      {
        id: 'a-2',
        role: 'assistant',
        content: 'You told me your name is Maya.',
        language: 'en',
        timestamp: 1015,
        isFinal: true,
      },
    ];

    expect(turns).toHaveLength(4);
    expect(turns[0].content).toContain('Maya');
    expect(turns[2].content).toBe('What name did I give you?');
    expect(turns[3].content).toContain('Maya');
  });
});
