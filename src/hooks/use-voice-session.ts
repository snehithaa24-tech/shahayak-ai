'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlayer } from '@/lib/audio/audio-player';
import { AudioRecorder } from '@/lib/audio/audio-recorder';
import { GeminiLiveClient } from '@/lib/gemini/live-client';
import {
  type SessionState,
  type TranscriptTurn,
  type VoiceSessionError,
  getErrorMessageAndHint,
} from '@/lib/session/transcript-types';
import { type SupportedLanguage } from '@/lib/prompt';
import { createClient } from '@/lib/supabase/client';

export interface UseVoiceSessionOptions {
  initialLanguage?: SupportedLanguage;
  saveTranscriptsDefault?: boolean;
  onTurnComplete?: (turn: TranscriptTurn) => void;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const [sessionState, setSessionState] = useState<SessionState>('Ready');
  const [language, setLanguage] = useState<SupportedLanguage>(options.initialLanguage || 'en');
  const [saveTranscripts, setSaveTranscripts] = useState<boolean>(options.saveTranscriptsDefault || false);
  const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
  const [interimUserText, setInterimUserText] = useState<string>('');
  const [interimAssistantText, setInterimAssistantText] = useState<string>('');
  const [errorInfo, setErrorInfo] = useState<VoiceSessionError | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // References to audio and network resources
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const currentAssistantTurnIdRef = useRef<string | null>(null);

  // Clean up all resources
  const cleanupResources = useCallback(async () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    if (audioPlayerRef.current) {
      await audioPlayerRef.current.dispose();
      audioPlayerRef.current = null;
    }

    currentAssistantTurnIdRef.current = null;
  }, []);

  // Handle errors
  const triggerError = useCallback(
    async (type: VoiceSessionError['type'], rawMsg?: string) => {
      const { message, actionHint } = getErrorMessageAndHint(type, rawMsg);
      setErrorInfo({ type, message, actionHint });
      setSessionState('Error');
      await cleanupResources();
    },
    [cleanupResources]
  );

  // Stop current turn playback on interruption
  const handleInterruption = useCallback(() => {
    console.log('[Sahayak] Interruption detected - stopping speech immediately.');
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAndClear();
    }
    setInterimAssistantText('');
    setSessionState('Listening');
  }, []);

  // Finalize assistant turn
  const finalizeAssistantTurn = useCallback(
    async (finalText: string) => {
      if (!finalText.trim()) return;

      const turnId = currentAssistantTurnIdRef.current || `turn-${Date.now()}`;
      const newTurn: TranscriptTurn = {
        id: turnId,
        role: 'assistant',
        content: finalText.trim(),
        language,
        timestamp: Date.now(),
        isFinal: true,
      };

      setTranscripts((prev) => {
        const exists = prev.some((t) => t.id === turnId);
        if (exists) {
          return prev.map((t) => (t.id === turnId ? newTurn : t));
        }
        return [...prev, newTurn];
      });

      setInterimAssistantText('');
      currentAssistantTurnIdRef.current = null;

      if (saveTranscripts && conversationId) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('transcript_turns').insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: 'assistant',
              content: newTurn.content,
              language: newTurn.language,
              turn_index: Date.now(),
            });
          }
        } catch (saveErr) {
          console.warn('[Sahayak] Failed to save assistant turn:', saveErr);
        }
      }

      options.onTurnComplete?.(newTurn);
    },
    [conversationId, language, options, saveTranscripts]
  );

  // Add final user turn
  const appendUserTurn = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const turnId = `user-${Date.now()}`;
      const newTurn: TranscriptTurn = {
        id: turnId,
        role: 'user',
        content: text.trim(),
        language,
        timestamp: Date.now(),
        isFinal: true,
      };

      setTranscripts((prev) => [...prev, newTurn]);
      setInterimUserText('');

      if (saveTranscripts && conversationId) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('transcript_turns').insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: 'user',
              content: newTurn.content,
              language: newTurn.language,
              turn_index: Date.now(),
            });
          }
        } catch (saveErr) {
          console.warn('[Sahayak] Failed to save user turn:', saveErr);
        }
      }

      options.onTurnComplete?.(newTurn);
    },
    [conversationId, language, options, saveTranscripts]
  );

  // Start voice or text session (MUST be triggered by user gesture)
  const startSession = useCallback(
    async (opts: { enableMic?: boolean } = {}) => {
      const enableMic = opts.enableMic ?? true;
      setErrorInfo(null);
      setSessionState('Connecting');

      try {
        // 1. Initialize AudioPlayer (unlocks Web Audio within the user gesture)
        let player = audioPlayerRef.current;
        if (!player) {
          player = new AudioPlayer({
            sampleRate: 24000,
            onSpeakingChange: (isSpeaking) => {
              if (isSpeaking) {
                setSessionState('Speaking');
              } else {
                setSessionState((prev) => (prev === 'Speaking' ? 'Listening' : prev));
              }
            },
          });
          audioPlayerRef.current = player;
        }
        await player.ensureContext();

        // 2. Fetch short-lived ephemeral token from backend route
        const tokenRes = await fetch('/api/live/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        });

        if (!tokenRes.ok) {
          const errorData = await tokenRes.json().catch(() => ({}));
          if (tokenRes.status === 401) {
            await triggerError('unauthorized');
            return;
          }
          if (tokenRes.status === 429) {
            if (errorData.error === 'quota_exhausted') {
              await triggerError('quota_exhausted', errorData.message);
            } else {
              await triggerError('rate_limit_exceeded', errorData.message);
            }
            return;
          }
          await triggerError('unknown', errorData.message || `Token request failed (${tokenRes.status})`);
          return;
        }

        const { token, model } = await tokenRes.json();
        console.log(`[Sahayak] Obtained token for live model: ${model}`);

        // 3. Connect to Gemini Live over WebSocket
        let assistantAccumulatedText = '';

        const liveClient = new GeminiLiveClient({
          token,
          model,
          onOpen: () => {
            console.log('[Sahayak] Connected directly to Gemini Live WebSocket.');
          },
          onAudioChunk: (pcmBytes) => {
            setSessionState('Speaking');
            player!.queueAudioChunk(pcmBytes);
          },
          onTranscriptChunk: (text, isUser) => {
            if (isUser) {
              appendUserTurn(text);
            } else {
              setSessionState('Responding');
              assistantAccumulatedText += text;
              setInterimAssistantText(assistantAccumulatedText);
            }
          },
          onInterrupted: () => {
            assistantAccumulatedText = '';
            handleInterruption();
          },
          onTurnComplete: () => {
            if (assistantAccumulatedText) {
              finalizeAssistantTurn(assistantAccumulatedText);
              assistantAccumulatedText = '';
            }
            setSessionState('Listening');
          },
          onError: (_err, code) => {
            if (code === 'token_expired') {
              triggerError('expired_credential');
            } else if (code === 'quota_exhausted') {
              triggerError('quota_exhausted');
            } else if (code === 'network_loss') {
              triggerError('network_loss');
            } else {
              triggerError('unknown');
            }
          },
        });

        liveClientRef.current = liveClient;
        await liveClient.connect();

        // 4. Request microphone and begin recording if enabled
        if (enableMic) {
          const recorder = new AudioRecorder({
            targetSampleRate: 16000,
            onAudioData: (pcm16Chunk) => {
              liveClient.sendAudioChunk(pcm16Chunk);
            },
            onError: (_err, code) => {
              if (code === 'permission_denied') {
                triggerError('permission_denied');
              } else if (code === 'device_not_found') {
                triggerError('device_not_found');
              } else {
                triggerError('unknown');
              }
            },
          });

          audioRecorderRef.current = recorder;
          await recorder.start();
        }

        // 5. Setup conversation record in Supabase if save is enabled
        if (saveTranscripts) {
          try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: conv } = await supabase
                .from('conversations')
                .insert({
                  user_id: user.id,
                  title: `${language === 'hi' ? 'बातचीत' : 'Conversation'} ${new Date().toLocaleDateString()}`,
                  language,
                })
                .select('id')
                .single();

              if (conv) {
                setConversationId(conv.id);
              }
            }
          } catch (dbErr) {
            console.warn('[Sahayak] Conversation init error:', dbErr);
          }
        }

        setSessionState('Listening');
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.name === 'NotAllowedError') {
          await triggerError('permission_denied');
        } else {
          await triggerError('unknown', error.message);
        }
      }
    },
    [
      language,
      saveTranscripts,
      triggerError,
      handleInterruption,
      appendUserTurn,
      finalizeAssistantTurn,
    ]
  );

  // End voice session
  const endSession = useCallback(async () => {
    await cleanupResources();
    setSessionState('Ended');
    setInterimUserText('');
    setInterimAssistantText('');
  }, [cleanupResources]);

  // Send typed message into Live session (connects automatically if not already started)
  const sendTypedMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // If not connected yet, initiate connection
      if (!liveClientRef.current || !liveClientRef.current.getIsConnected()) {
        await startSession({ enableMic: false });
      }

      if (liveClientRef.current) {
        liveClientRef.current.sendTextMessage(trimmed);
        setSessionState('Responding');
      }
    },
    [startSession]
  );

  // Clear conversation transcript
  const clearTranscripts = useCallback(async () => {
    setTranscripts([]);
    setInterimUserText('');
    setInterimAssistantText('');

    if (conversationId) {
      try {
        const supabase = createClient();
        await supabase.from('conversations').delete().eq('id', conversationId);
      } catch (err) {
        console.warn('[Sahayak] Failed to delete conversation:', err);
      }
      setConversationId(null);
    }
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    sessionState,
    language,
    setLanguage,
    saveTranscripts,
    setSaveTranscripts,
    transcripts,
    interimUserText,
    interimAssistantText,
    errorInfo,
    startSession,
    endSession,
    handleInterruption,
    sendTypedMessage,
    clearTranscripts,
  };
}
