import { arrayBufferToBase64, base64ToUint8Array } from '../audio/pcm-utils';

export interface LiveClientConfig {
  token: string;
  model: string;
  onOpen?: () => void;
  onAudioChunk?: (pcm24kData: Uint8Array) => void;
  onTranscriptChunk?: (text: string, isUser: boolean) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (error: Error, code: string) => void;
  onClose?: (event: CloseEvent) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private isSetupDone = false;
  private isConnected = false;
  private isClosedManually = false;

  constructor(private readonly config: LiveClientConfig) {}

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isClosedManually = false;
      const cleanToken = this.config.token;
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(cleanToken)}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        // Send initial setup frame
        const modelName = this.config.model.startsWith('models/')
          ? this.config.model
          : `models/${this.config.model}`;

        const setupMsg = {
          setup: {
            model: modelName,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede', // Natural voice with multilingual support
                  },
                },
              },
            },
          },
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(setupMsg));
        }
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let dataText = '';
          if (typeof event.data === 'string') {
            dataText = event.data;
          } else if (event.data instanceof Blob) {
            dataText = await event.data.text();
          }

          if (!dataText) return;

          const response = JSON.parse(dataText);

          // Handle setup complete confirmation
          if (response.setupComplete) {
            this.isSetupDone = true;
            this.config.onOpen?.();
            resolve();
            return;
          }

          const serverContent = response.serverContent;
          if (serverContent) {
            // Handle Interruption
            if (serverContent.interrupted) {
              this.config.onInterrupted?.();
            }

            // Handle output transcript (spoken words text from Gemini Live)
            if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
              this.config.onTranscriptChunk?.(serverContent.outputTranscription.text, false);
            }

            // Handle incoming model audio / text parts
            if (serverContent.modelTurn && Array.isArray(serverContent.modelTurn.parts)) {
              for (const part of serverContent.modelTurn.parts) {
                // Audio data
                if (part.inlineData && part.inlineData.data) {
                  const pcmBytes = base64ToUint8Array(part.inlineData.data);
                  this.config.onAudioChunk?.(pcmBytes);
                }

                // Text transcript (if model sends textual representation)
                if (part.text) {
                  this.config.onTranscriptChunk?.(part.text, false);
                }
              }
            }

            // Handle turn completion
            if (serverContent.turnComplete) {
              this.config.onTurnComplete?.();
            }
          }
        } catch (parseError) {
          // Non-JSON or parse error
          console.error('[GeminiLive] Error parsing message:', parseError);
        }
      };

      this.ws.onerror = () => {
        const error = new Error('Gemini Live WebSocket encountered a network or protocol error.');
        this.config.onError?.(error, 'ws_error');
        if (!this.isConnected) {
          reject(error);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.isConnected = false;
        this.isSetupDone = false;

        if (!this.isClosedManually) {
          if (event.code === 4401 || event.code === 4001 || event.reason.includes('token') || event.reason.includes('expired')) {
            this.config.onError?.(new Error('Live session token has expired or is invalid.'), 'token_expired');
          } else if (event.code === 4429 || event.reason.includes('RESOURCE_EXHAUSTED')) {
            this.config.onError?.(new Error('Gemini Live quota limit exceeded.'), 'quota_exhausted');
          } else if (event.code !== 1000) {
            this.config.onError?.(new Error(`WebSocket connection closed unexpectedly (${event.code}).`), 'network_loss');
          }
        }

        this.config.onClose?.(event);
      };
    });
  }

  /**
   * Sends a 16-bit linear PCM audio chunk (16000 Hz) to Gemini Live.
   */
  public sendAudioChunk(pcm16Bytes: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const base64Data = arrayBufferToBase64(pcm16Bytes);
    const msg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Sends typed text input into the active Live session for users who cannot speak.
   */
  public sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !text.trim()) return;

    // Report user message to transcript callback
    this.config.onTranscriptChunk?.(text, true);

    const msg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text.trim() }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Gracefully disconnects the WebSocket session.
   */
  public disconnect(): void {
    this.isClosedManually = true;
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'User ended call');
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.isSetupDone = false;
  }

  public getIsConnected(): boolean {
    return this.isConnected && this.isSetupDone;
  }
}
