'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceSession } from '@/hooks/use-voice-session';
import { useSavedConversations } from '@/hooks/use-saved-conversations';
import { createClient } from '@/lib/supabase/client';
import { getAppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';
import { SiteHeader } from '@/components/SiteHeader';
import { ReadyScreen } from '@/components/ReadyScreen';
import { ActiveCallScreen } from '@/components/ActiveCallScreen';

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const {
    conversations: savedConversations,
    isLoading: isLoadingHistory,
    loadError: historyLoadError,
    loadingTurnsId,
    deletingId,
    refresh: refreshSavedHistory,
    loadTurnsForConversation,
    deleteConversation,
  } = useSavedConversations(userId);

  const handleConversationSaved = useCallback(() => {
    void refreshSavedHistory();
  }, [refreshSavedHistory]);

  const {
    sessionState,
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
  } = useVoiceSession({
    onConversationSaved: handleConversationSaved,
  });

  const strings = getAppStrings(language);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || !user) return;

        setUserId(user.id);
        setUserEmail(user.email || strings.header.authenticatedUser);

        const { data: pref } = await supabase
          .from('user_preferences')
          .select('language, save_transcripts')
          .eq('user_id', user.id)
          .single();

        if (!active || !pref) return;

        if (pref.language === 'en' || pref.language === 'hi') {
          setLanguage(pref.language);
        }
        if (typeof pref.save_transcripts === 'boolean') {
          setSaveTranscripts(pref.save_transcripts);
        }
      } catch (err) {
        console.warn('[Sahayak] User check:', err);
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, [setLanguage, setSaveTranscripts, strings.header.authenticatedUser]);

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          language: newLang,
          save_transcripts: saveTranscripts,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[Sahayak] Language preference update error:', err);
    }
  };

  const handleSaveTranscriptToggle = async (enabled: boolean) => {
    setSaveTranscripts(enabled);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          language,
          save_transcripts: enabled,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[Sahayak] Save transcript preference update error:', err);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await endSession();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(language === 'hi' ? '/login?lang=hi' : '/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  const isCallActive =
    sessionState === 'Connecting' ||
    sessionState === 'RequestingPermission' ||
    sessionState === 'Connected' ||
    sessionState === 'Listening' ||
    sessionState === 'Responding' ||
    sessionState === 'Speaking' ||
    sessionState === 'Muted';

  return (
    <div className="flex min-h-dvh flex-col justify-between">
      {/* Restrained ARIA live announcements for session state transitions only */}
      <div role="status" aria-live="polite" className="sr-only">
        {sessionState === 'Error'
          ? errorInfo?.message || strings.call.ariaStatus.Error
          : strings.call.ariaStatus[sessionState]}
      </div>

      <SiteHeader
        strings={strings}
        language={language}
        userEmail={userEmail}
        onSignOut={() => void handleSignOut()}
        disableSignOut={isSigningOut}
      />

      {isCallActive ? (
        <ActiveCallScreen
          strings={strings}
          language={language}
          sessionState={sessionState}
          isMuted={isMuted}
          hasMicrophone={hasMicrophone}
          transcripts={transcripts}
          interimUserText={interimUserText}
          interimAssistantText={interimAssistantText}
          isSessionPersisted={isSessionPersisted}
          saveStatus={saveStatus}
          getAudioLevels={getAudioLevels}
          onToggleMute={toggleMute}
          onEnableMicrophone={() => void enableMicrophoneInSession()}
          onInterrupt={handleInterruption}
          onDoneSpeaking={triggerTurnComplete}
          onSendTyped={(text) => void sendTypedMessage(text)}
          onEndCall={() => void endSession()}
          onClearSession={() => void clearTranscripts()}
        />
      ) : (
        <ReadyScreen
          strings={strings}
          language={language}
          onLanguageChange={(nextLang) => void handleLanguageChange(nextLang)}
          sessionState={sessionState}
          errorInfo={errorInfo}
          onDismissError={dismissError}
          onStartVoice={() => void startSession({ enableMic: true })}
          onSendTypedStart={(text) => void sendTypedMessage(text)}
          saveTranscripts={saveTranscripts}
          onToggleSaveTranscripts={(enabled) => void handleSaveTranscriptToggle(enabled)}
          isSignedIn={Boolean(userId)}
          transcripts={transcripts}
          currentConversationId={conversationId}
          isSessionPersisted={isSessionPersisted}
          saveStatus={saveStatus}
          onClearCurrentSession={() => void clearTranscripts()}
          savedConversations={savedConversations}
          isLoadingHistory={isLoadingHistory}
          historyLoadError={historyLoadError}
          loadingTurnsId={loadingTurnsId}
          deletingId={deletingId}
          onLoadTurns={(id) => void loadTurnsForConversation(id)}
          onDeleteSaved={deleteConversation}
        />
      )}

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-2 px-4 py-4 sm:px-6 text-xs text-[var(--ink-secondary)]">
          <span>
            {strings.brandLatin} &middot;{' '}
            <span lang="hi" className="font-devanagari-safe">
              {strings.brandDevanagari}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--ink-primary)]"
            >
              {strings.privacy.googlePrivacy}
            </a>
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--ink-primary)]"
            >
              {strings.privacy.geminiTerms}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
