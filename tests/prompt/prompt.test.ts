import { describe, it, expect } from 'vitest';
import { getSystemInstruction, SUPPORTED_LANGUAGES } from '@/lib/prompt';

describe('Language Selection and Prompt Builder', () => {
  it('defines English and Hindi as supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(2);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('hi');

    const hindi = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi');
    expect(hindi?.nativeLabel).toBe('हिन्दी');
  });

  it('builds system instruction for Hindi with code-switching and Devanagari guidelines', () => {
    const hindiPrompt = getSystemInstruction('hi');

    expect(hindiPrompt).toContain('You are Sahayak, a patient voice assistant');
    expect(hindiPrompt).toContain('Reply in the selected language unless the user explicitly requests a switch');
    expect(hindiPrompt).toContain('Understand common Hindi-English code-switching');
    expect(hindiPrompt).toContain('Reply in Hindi (हिन्दी)');
    // Ensures English technical words do not switch entire response to English
    expect(hindiPrompt).toContain('An English technical word in a Hindi question must NOT switch the entire reply to English');
    expect(hindiPrompt).toContain('Never claim you performed an external action unless a connected tool confirmed it');
  });

  it('builds system instruction for English with proper natural voice instructions', () => {
    const englishPrompt = getSystemInstruction('en');

    expect(englishPrompt).toContain('You are Sahayak, a patient voice assistant');
    expect(englishPrompt).toContain('Reply in clear, conversational English');
    expect(englishPrompt).toContain('Understand common Hindi-English code-switching');
    expect(englishPrompt).toContain('Give the direct answer first');
    expect(englishPrompt).toContain('Ask one clarifying question when needed');
  });
});
