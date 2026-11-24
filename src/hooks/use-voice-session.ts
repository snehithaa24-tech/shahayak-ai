'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlayer } from '@/lib/audio/audio-player';
import { AudioRecorder } from '@/lib/audio/audio-recorder';
import { GeminiLiveClient } from '@/lib/gemini/live-client';
import {
  type ErrorType,
  type SaveStatus,
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
  onConversationSaved?: () => void;
}

export interface AudioLevels {
  mic: number;
  assistant: number;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const [sessionState, setSessionState] = useState<SessionState>('Ready');
  const [language, setLanguage] = useState<SupportedLanguage>(options.initialLanguage || 'en');
  const [saveTranscripts, setSaveTranscripts] = useState<boolean>(options.saveTranscriptsDefault || false);
  const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
  const [interimUserText, setInterimUserText] = useState<string>('');
  const [interimAssistantText, setInterimAssistantText] = useState<string>('');
  const [rawError, setRawError] = useState<{ type: ErrorType; rawMsg?: string } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isSessionPersisted, setIsSessionPersisted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasMicrophone, setHasMicrophone] = useState<boolean>(false);

  // Refs for audio, transport, and high-frequency level sampling (avoids full-tree re-renders)
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const currentAssistantTurnIdRef = useRef<string | null>(null);
  const assistantAccumulatedTextRef = useRef<string>('');
  const userAccumulatedTextRef = useRef<string>('');
  const micLevelRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);
  const hasMicrophoneRef = useRef<boolean>(false);
  const turnCounterRef = useRef<number>(0);
  const conversationIdRef = useRef<string | null>(null);
  const saveSessionActiveRef = useRef<boolean>(false);
  const languageRef = useRef<SupportedLanguage>(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const getIdleConnectedState = useCallback((): SessionState => {
    if (!hasMicrophoneRef.current) return 'Connected';
    if (isMutedRef.current) return 'Muted';
    return 'Listening';
  }, []);

  const getAudioLevels = useCallback((): AudioLevels => {
    return {
      mic: hasMicrophoneRef.current && !isMutedRef.current ? micLevelRef.current : 0,
      assistant: audioPlayerRef.current ? audioPlayerRef.current.getCurrentLevel() : 0,
    };
  }, []);

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
    assistantAccumulatedTextRef.current = '';
    userAccumulatedTextRef.current = '';
    micLevelRef.current = 0;
    isMutedRef.current = false;
    hasMicrophoneRef.current = false;
    setIsMuted(false);
    setHasMicrophone(false);
  }, []);

  const triggerError = useCallback(
    async (type: ErrorType, rawMsg?: string) => {
      setRawError({ type, rawMsg });
      setSessionState('Error');
      await cleanupResources();
    },
    [cleanupResources]
  );

  const dismissError = useCallback(() => {
    setRawError(null);
    setSessionState((prev) => (prev === 'Error' ? 'Ready' : prev));
  }, []);

  const errorInfo: VoiceSessionError | null = rawError
    ? {
        type: rawError.type,
        ...getErrorMessageAndHint(rawError.type, rawError.rawMsg, language),
      }
    : null;

  const persistTurnIfEnabled = useCallback(async (turn: TranscriptTurn) => {
    const activeConvId = conversationIdRef.current;
    if (!saveSessionActiveRef.current || !activeConvId) return;

    setSaveStatus('saving');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus('error');
        return;
      }

      turnCounterRef.current += 1;
      const { error } = await supabase.from('transcript_turns').insert({
        conversation_id: activeConvId,
        user_id: user.id,
        role: turn.role,
        content: turn.content,
        language: turn.language,
        turn_index: turnCounterRef.current,
      });

      if (error) {
        console.warn('[Sahayak] Failed to save turn:', error.message);
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        options.onConversationSaved?.();
      }
    } catch (saveErr) {
      console.warn('[Sahayak] Failed to save turn:', saveErr);
      setSaveStatus('error');
    }
  }, [options]);

  const handleInterruption = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAndClear();
    }
    setInterimAssistantText('');
    assistantAccumulatedTextRef.current = '';
    setSessionState(getIdleConnectedState());
  }, [getIdleConnectedState]);

  const finalizeAssistantTurn = useCallback(
    async (finalText: string) => {
      if (!finalText.trim()) return;

      const turnId = currentAssistantTurnIdRef.current || `turn-${Date.now()}`;
      const newTurn: TranscriptTurn = {
        id: turnId,
        role: 'assistant',
        content: finalText.trim(),
        language: languageRef.current,
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
      assistantAccumulatedTextRef.current = '';
      currentAssistantTurnIdRef.current = null;

      await persistTurnIfEnabled(newTurn);
      options.onTurnComplete?.(newTurn);
    },
    [options, persistTurnIfEnabled]
  );

  const appendUserTurn = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const turnId = `user-${Date.now()}-${turnCounterRef.current + 1}`;
      const newTurn: TranscriptTurn = {
        id: turnId,
        role: 'user',
        content: text.trim(),
        language: languageRef.current,
        timestamp: Date.now(),
        isFinal: true,
      };

      setTranscripts((prev) => [...prev, newTurn]);
      setInterimUserText('');

      await persistTurnIfEnabled(newTurn);
      options.onTurnComplete?.(newTurn);
    },
    [options, persistTurnIfEnabled]
  );

  const finalizeUserInput = useCallback(() => {
    const text = userAccumulatedTextRef.current;
    userAccumulatedTextRef.current = '';
    if (text.trim()) void appendUserTurn(text);
  }, [appendUserTurn]);

  const attachMicrophone = useCallback(
    async (liveClient: GeminiLiveClient, sharedCtx?: AudioContext) => {
      setSessionState('RequestingPermission');
      const recorder = new AudioRecorder({
        targetSampleRate: 16000,
        onAudioData: (pcm16Chunk) => {
          liveClient.sendAudioChunk(pcm16Chunk);
        },
        onVolumeChange: (vol) => {
          micLevelRef.current = vol;
        },
        // Gemini's VAD owns turn endings and interruptions. Local volume
        // detection must not inject empty turns or interrupt on noise.
      });

      audioRecorderRef.current = recorder;
      await recorder.start(sharedCtx);
      hasMicrophoneRef.current = true;
      isMutedRef.current = false;
      setHasMicrophone(true);
      setIsMuted(false);
    },
    []
  );

  // Start voice or typed session (MUST be triggered directly by a user gesture)
  const startSession = useCallback(
    async (opts: { enableMic?: boolean } = {}): Promise<boolean> => {
      const enableMic = opts.enableMic ?? true;
      await cleanupResources();

      // Clear previous live session turns when beginning a fresh session
      setTranscripts([]);
      setInterimUserText('');
      setInterimAssistantText('');
      setRawError(null);
      setSaveStatus('idle');
      setIsSessionPersisted(false);
      conversationIdRef.current = null;
      setConversationId(null);
      turnCounterRef.current = 0;
      saveSessionActiveRef.current = saveTranscripts;
      setSessionState('Connecting');

      try {
        // 1. Initialize and unlock AudioPlayer within the user gesture
        const player = new AudioPlayer({
          sampleRate: 24000,
          onSpeakingChange: (isSpeaking) => {
            if (isSpeaking) {
              setSessionState('Speaking');
            } else {
              setSessionState((prev) => (prev === 'Speaking' ? getIdleConnectedState() : prev));
            }
          },
        });
        audioPlayerRef.current = player;
        const sharedCtx = await player.ensureContext();

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
            return false;
          }
          if (tokenRes.status === 429) {
            if (errorData.error === 'quota_exhausted') {
              await triggerError('quota_exhausted', errorData.message);
            } else {
              await triggerError('rate_limit_exceeded', errorData.message);
            }
            return false;
          }
          await triggerError('unknown', errorData.message || `Token request failed (${tokenRes.status})`);
          return false;
        }

        const { token, model } = await tokenRes.json();

        // 3. Connect to Gemini Live over WebSocket
        assistantAccumulatedTextRef.current = '';

        const liveClient = new GeminiLiveClient({
          token,
          model,
          onAudioChunk: (pcmBytes) => {
            finalizeUserInput();
            setSessionState('Speaking');
            void player.queueAudioChunk(pcmBytes);
          },
          onInputTranscription: (text, finished) => {
            userAccumulatedTextRef.current += text;
            setInterimUserText(userAccumulatedTextRef.current);
            if (finished) finalizeUserInput();
          },
          onTranscriptChunk: (text, isUser) => {
            if (isUser) {
              void appendUserTurn(text);
            } else {
              finalizeUserInput();
              setSessionState('Responding');
              assistantAccumulatedTextRef.current += text;
              setInterimAssistantText(assistantAccumulatedTextRef.current);
            }
          },
          onInterrupted: () => {
            handleInterruption();
          },
          onTurnComplete: () => {
            finalizeUserInput();
            if (assistantAccumulatedTextRef.current) {
              void finalizeAssistantTurn(assistantAccumulatedTextRef.current);
            }
            audioRecorderRef.current?.resetSpeechDetection();
            if (!player.getIsPlaying()) {
              setSessionState(getIdleConnectedState());
            }
          },
          onError: (_err, code) => {
            if (code === 'token_expired') {
              void triggerError('expired_credential');
            } else if (code === 'quota_exhausted') {
              void triggerError('quota_exhausted');
            } else if (code === 'network_loss') {
              void triggerError('network_loss');
            } else {
              void triggerError('unknown');
            }
          },
        });

        liveClientRef.current = liveClient;
        await liveClient.connect();

        // 4. Request microphone permission and start capture only if requested
        if (enableMic) {
          await attachMicrophone(liveClient, sharedCtx);
        }

        // 5. Initialize confirmed saved conversation record in Supabase if opted in
        if (saveTranscripts) {
          try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: conv, error: convErr } = await supabase
                .from('conversations')
                .insert({
                  user_id: user.id,
                  title: `${language === 'hi' ? 'बातचीत' : 'Conversation'} · ${new Date().toLocaleDateString()}`,
                  language,
                })
                .select('id')
                .single();

              if (!convErr && conv) {
                conversationIdRef.current = conv.id;
                setConversationId(conv.id);
                setIsSessionPersisted(true);
              } else {
                saveSessionActiveRef.current = false;
                setSaveStatus('error');
              }
            }
          } catch (dbErr) {
            console.warn('[Sahayak] Conversation init error:', dbErr);
            saveSessionActiveRef.current = false;
            setSaveStatus('error');
          }
        }

        setSessionState(enableMic ? 'Listening' : 'Connected');
        return true;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          await triggerError('permission_denied');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          await triggerError('device_not_found');
        } else {
          await triggerError('unknown', error.message);
        }
        return false;
      }
    },
    [
      appendUserTurn,
      attachMicrophone,
      cleanupResources,
      finalizeAssistantTurn,
      finalizeUserInput,
      getIdleConnectedState,
      handleInterruption,
      language,
      saveTranscripts,
      triggerError,
    ]
  );

  // Enable microphone mid-session when started in typed-only mode
  const enableMicrophoneInSession = useCallback(async () => {
    const client = liveClientRef.current;
    if (!client || !client.getIsConnected() || hasMicrophoneRef.current) return;

    try {
      const ctx = audioPlayerRef.current
        ? await audioPlayerRef.current.ensureContext()
        : undefined;
      await attachMicrophone(client, ctx);
      setSessionState(audioPlayerRef.current?.getIsPlaying() ? 'Speaking' : 'Listening');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        await triggerError('permission_denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        await triggerError('device_not_found');
      } else {
        await triggerError('unknown', error.message);
      }
    }
  }, [attachMicrophone, triggerError]);

  const endSession = useCallback(async () => {
    await cleanupResources();
    setSessionState('Ended');
    setInterimUserText('');
    setInterimAssistantText('');
  }, [cleanupResources]);

  const toggleMute = useCallback(() => {
    if (!audioRecorderRef.current || !hasMicrophoneRef.current) return;

    const nextMuted = !isMutedRef.current;
    audioRecorderRef.current.setMuted(nextMuted);
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      liveClientRef.current?.sendAudioStreamEnd();
      micLevelRef.current = 0;
      setSessionState((prev) => (prev === 'Listening' ? 'Muted' : prev));
    } else {
      setSessionState((prev) => (prev === 'Muted' ? 'Listening' : prev));
    }
  }, []);

  // Pause capture and flush buffered speech; unmute to speak again.
  const triggerTurnComplete = useCallback(() => {
    if (audioRecorderRef.current && hasMicrophoneRef.current && liveClientRef.current?.getIsConnected()) {
      audioRecorderRef.current.setMuted(true);
      isMutedRef.current = true;
      setIsMuted(true);
      micLevelRef.current = 0;
      liveClientRef.current.sendAudioStreamEnd();
      setSessionState((prev) => (prev === 'Listening' || prev === 'Muted' ? 'Responding' : prev));
    }
  }, []);

  const sendTypedMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (!liveClientRef.current || !liveClientRef.current.getIsConnected()) {
        const started = await startSession({ enableMic: false });
        if (!started) return;
      }

      if (liveClientRef.current?.getIsConnected()) {
        liveClientRef.current.sendTextMessage(trimmed);
        setSessionState('Responding');
      }
    },
    [startSession]
  );

  // Clears current in-memory transcript and (if saved in Postgres) deletes that saved conversation row
  const clearTranscripts = useCallback(async () => {
    setTranscripts([]);
    setInterimUserText('');
    setInterimAssistantText('');

    const existingConvId = conversationIdRef.current;
    if (existingConvId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('conversations').delete().eq('id', existingConvId);
        if (!error) {
          conversationIdRef.current = null;
          setConversationId(null);
          setIsSessionPersisted(false);
          setSaveStatus('idle');
          options.onConversationSaved?.();
        }
      } catch (err) {
        console.warn('[Sahayak] Failed to delete conversation:', err);
      }
    }
  }, [options]);

  useEffect(() => {
    return () => {
      void cleanupResources();
    };
  }, [cleanupResources]);

  // Derived display state: never expose 'Listening' while muted or lacking an active mic
  const displayState: SessionState =
    sessionState === 'Listening' && !hasMicrophone
      ? 'Connected'
      : sessionState === 'Listening' && isMuted
      ? 'Muted'
      : sessionState;

  return {
    sessionState: displayState,
    rawSessionState: sessionState,
    language,
    setLanguage,
    saveTranscripts,
    setSaveTranscripts,
    transcripts,
    interimUserText,
    interimAssistantText,
    errorInfo,
    dismissError,
    isMuted,
    hasMicrophone,
    conversationId,
    isSessionPersisted,
    saveStatus,
    getAudioLevels,
    toggleMute,
    enableMicrophoneInSession,
    triggerTurnComplete,
    startSession,
    endSession,
    handleInterruption,
    sendTypedMessage,
    clearTranscripts,
  };
}
