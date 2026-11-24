import { GoogleGenAI, Modality } from '@google/genai';
import { getServerConfig } from '@/lib/config';
import { getSystemInstruction, type SupportedLanguage } from '@/lib/prompt';

export interface EphemeralTokenResult {
  token: string;
  model: string;
  language: SupportedLanguage;
  expireTime: string;
  newSessionExpireTime: string;
}

export class GeminiLiveError extends Error {
  constructor(
    public readonly code: 'quota_exhausted' | 'model_unsupported' | 'auth_error' | 'internal_error',
    message: string
  ) {
    super(message);
    this.name = 'GeminiLiveError';
  }
}

/**
 * Creates a short-lived, single-use ephemeral token constrained to the Gemini Live session.
 * Exclusively executes on the server using the master GEMINI_API_KEY.
 */
export async function createLiveEphemeralToken(language: SupportedLanguage): Promise<EphemeralTokenResult> {
  const config = getServerConfig();

  // Ephemeral tokens for Live API require the v1alpha endpoint
  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });

  const now = Date.now();
  // Live connection window: user has 60 seconds to initiate WebSocket
  const newSessionExpireTime = new Date(now + 60 * 1000).toISOString();
  // Overall token expiration: session valid for up to 30 minutes
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();

  const systemInstruction = getSystemInstruction(language);

  try {
    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1, // Single-use credential
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: config.geminiLiveModel,
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                prefixPaddingMs: 300,
                silenceDurationMs: 800,
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        },
      },
    });

    if (!tokenResponse || !tokenResponse.name) {
      throw new GeminiLiveError('internal_error', 'Invalid response received from Gemini token service.');
    }

    return {
      token: tokenResponse.name,
      model: config.geminiLiveModel,
      language,
      expireTime,
      newSessionExpireTime,
    };
  } catch (error: unknown) {
    const errString = error instanceof Error ? error.message : String(error);

    // Surface quota exhaustion clearly and prevent repeated automatic retries
    if (
      errString.includes('RESOURCE_EXHAUSTED') ||
      errString.includes('quota') ||
      errString.includes('429') ||
      errString.includes('Too Many Requests')
    ) {
      throw new GeminiLiveError(
        'quota_exhausted',
        'Gemini Live quota has been exhausted. Automatic retries have stopped to preserve the free tier.'
      );
    }

    if (
      errString.includes('API_KEY_INVALID') ||
      errString.includes('PERMISSION_DENIED') ||
      errString.includes('403') ||
      errString.includes('401')
    ) {
      throw new GeminiLiveError(
        'auth_error',
        'Gemini API authentication failed. Please check that GEMINI_API_KEY in server environment is valid.'
      );
    }

    if (errString.includes('not found') || errString.includes('is not supported')) {
      throw new GeminiLiveError(
        'model_unsupported',
        `The requested model '${config.geminiLiveModel}' is not supported for Live bidirectional sessions.`
      );
    }

    throw new GeminiLiveError('internal_error', `Failed to generate Live session credential: ${errString}`);
  }
}
