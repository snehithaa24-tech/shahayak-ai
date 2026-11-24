'use client';

import { useState } from 'react';
import { Mic, Send, Shield, Check } from 'lucide-react';
import { type AppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';
import {
  type SavedConversation,
  type SaveStatus,
  type SessionState,
  type TranscriptTurn,
  type VoiceSessionError,
} from '@/lib/session/transcript-types';
import { ErrorBanner } from './ErrorBanner';
import { SavedHistorySection } from './SavedHistorySection';

interface ReadyScreenProps {
  strings: AppStrings;
  language: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  sessionState: SessionState;
  errorInfo: VoiceSessionError | null;
  onDismissError: () => void;
  onStartVoice: () => void;
  onSendTypedStart: (text: string) => void;
  saveTranscripts: boolean;
  onToggleSaveTranscripts: (enabled: boolean) => void;
  isSignedIn: boolean;
  transcripts: TranscriptTurn[];
  currentConversationId: string | null;
  isSessionPersisted: boolean;
  saveStatus: SaveStatus;
  onClearCurrentSession: () => void;
  savedConversations: SavedConversation[];
  isLoadingHistory: boolean;
  historyLoadError: boolean;
  loadingTurnsId: string | null;
  deletingId: string | null;
  onLoadTurns: (conversationId: string) => void;
  onDeleteSaved: (conversationId: string) => Promise<boolean>;
}

export function ReadyScreen({
  strings,
  language,
  onLanguageChange,
  sessionState,
  errorInfo,
  onDismissError,
  onStartVoice,
  onSendTypedStart,
  saveTranscripts,
  onToggleSaveTranscripts,
  isSignedIn,
  transcripts,
  currentConversationId,
  isSessionPersisted,
  saveStatus,
  onClearCurrentSession,
  savedConversations,
  isLoadingHistory,
  historyLoadError,
  loadingTurnsId,
  deletingId,
  onLoadTurns,
  onDeleteSaved,
}: ReadyScreenProps) {
  const [showTypedComposer, setShowTypedComposer] = useState(false);
  const [typedDraft, setTypedDraft] = useState('');

  const handleSubmitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = typedDraft.trim();
    if (!trimmed) return;
    setTypedDraft('');
    onSendTypedStart(trimmed);
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      {/* Error Recovery Banner */}
      {errorInfo && (
        <ErrorBanner
          error={errorInfo}
          strings={strings}
          language={language}
          onRetry={errorInfo.retryable ? onStartVoice : undefined}
          onDismiss={onDismissError}
        />
      )}

      {/* Concise Ended Session Notice */}
      {sessionState === 'Ended' && !errorInfo && (
        <section
          aria-label={strings.ended.heading}
          className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 sm:px-5 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent-primary)]">
              <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="text-xs sm:text-sm space-y-0.5">
              <p className="font-semibold text-[var(--ink-primary)]">
                {strings.ended.heading} &middot;{' '}
                <span className="font-normal text-[var(--ink-secondary)]">
                  {strings.ended.micReleasedNote}
                </span>
              </p>
              <p className="text-[var(--ink-secondary)]">
                {strings.ended.summary(transcripts.length)}
              </p>
            </div>
          </div>

          {transcripts.length > 0 && (
            <a
              href="#conversation-history-heading"
              className="inline-flex min-h-[36px] shrink-0 items-center text-xs font-medium text-[var(--accent-primary)] underline underline-offset-4 hover:text-[var(--accent-hover)]"
            >
              {strings.ended.viewLastTranscript}
            </a>
          )}
        </section>
      )}

      {/* Primary Welcome & Conversation Controls */}
      <section className="space-y-6">
        <div className="space-y-2.5">
          <h1
            lang={language}
            className={`font-display text-3xl sm:text-[2.25rem] font-normal text-[var(--ink-primary)] ${
              language === 'hi' ? 'leading-[1.42] py-0.5' : 'leading-[1.22]'
            }`}
          >
            {strings.ready.headline}
          </h1>
          <p
            lang={language}
            className="text-base sm:text-[17px] leading-[1.65] text-[var(--ink-secondary)]"
          >
            {strings.ready.supporting}
          </p>
        </div>

        {/* Bilingual Selector + Primary CTA Card */}
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[var(--shadow-card)] space-y-6">
          {/* Language Picker */}
          <div className="space-y-2.5">
            <span
              id="language-picker-label"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]"
            >
              {strings.ready.languageLabel}
            </span>

            <div
              role="radiogroup"
              aria-labelledby="language-picker-label"
              className="grid grid-cols-2 gap-3"
            >
              <button
                type="button"
                role="radio"
                aria-checked={language === 'en'}
                onClick={() => onLanguageChange('en')}
                className={`flex min-h-[56px] flex-col items-start justify-center rounded-[10px] border px-4 py-2.5 text-left transition-colors ${
                  language === 'en'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-tint)] text-[var(--ink-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[var(--ink-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]/50'
                }`}
              >
                <span className="text-sm sm:text-base font-semibold">
                  {strings.ready.englishName}
                </span>
                <span className="text-xs text-[var(--ink-secondary)]">
                  {strings.ready.englishHint}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={language === 'hi'}
                onClick={() => onLanguageChange('hi')}
                lang="hi"
                className={`flex min-h-[56px] flex-col items-start justify-center rounded-[10px] border px-4 py-2.5 text-left transition-colors ${
                  language === 'hi'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-tint)] text-[var(--ink-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[var(--ink-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]/50'
                }`}
              >
                <span className="font-devanagari-safe text-sm sm:text-base font-semibold">
                  {strings.ready.hindiName}
                </span>
                <span className="font-devanagari-safe text-xs text-[var(--ink-secondary)]">
                  {strings.ready.hindiHint}
                </span>
              </button>
            </div>
          </div>

          {/* Dominant Start Action */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={onStartVoice}
              aria-label={strings.ready.startButtonAria}
              className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[10px] bg-[var(--accent-primary)] px-6 py-3.5 text-base font-semibold text-[var(--accent-ink)] shadow-[0_2px_6px_rgba(35,77,60,0.18)] transition-colors hover:bg-[var(--accent-hover)] active:translate-y-[0.5px]"
            >
              <Mic className="h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              <span>
                {sessionState === 'Ended'
                  ? strings.ended.startAnother
                  : strings.ready.startButton}
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowTypedComposer((prev) => !prev)}
                className="inline-flex min-h-[40px] items-center text-xs sm:text-sm font-medium text-[var(--accent-primary)] underline underline-offset-4 hover:text-[var(--accent-hover)]"
              >
                {strings.ready.typeInsteadButton}
              </button>

              {!isSignedIn && (
                <span className="text-xs text-[var(--ink-secondary)]">
                  {strings.ready.signInRequiredHint}
                </span>
              )}
            </div>

            {showTypedComposer && (
              <form
                onSubmit={handleSubmitTyped}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-[var(--border-subtle)] pt-3"
              >
                <label htmlFor="ready-typed-input" className="sr-only">
                  {strings.call.typePlaceholder}
                </label>
                <input
                  id="ready-typed-input"
                  type="text"
                  value={typedDraft}
                  onChange={(e) => setTypedDraft(e.target.value)}
                  placeholder={strings.call.typePlaceholder}
                  className="min-h-[44px] flex-1 rounded-[8px] border border-[var(--border-control)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                />
                <button
                  type="submit"
                  disabled={!typedDraft.trim()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[8px] bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>{strings.call.send}</span>
                </button>
              </form>
            )}
          </div>

          {/* Honest Microphone Disclosure */}
          <p className="border-t border-[var(--border-subtle)] pt-4 text-xs sm:text-[13px] leading-[1.65] text-[var(--ink-secondary)]">
            {strings.ready.micDisclosure}{' '}
            <span>
              {strings.privacy.subjectTo}{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--ink-primary)] underline underline-offset-2 hover:text-[var(--accent-primary)]"
              >
                {strings.privacy.googlePrivacy}
              </a>{' '}
              {strings.privacy.and}{' '}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--ink-primary)] underline underline-offset-2 hover:text-[var(--accent-primary)]"
              >
                {strings.privacy.geminiTerms}
              </a>
              .
            </span>
          </p>
        </div>

        {/* Opt-In Transcript Preference */}
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 shadow-[0_1px_2px_rgba(36,40,34,0.03)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label
                htmlFor="save-transcripts-toggle"
                className="inline-flex min-h-[32px] cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ink-primary)]"
              >
                <Shield className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" strokeWidth={1.75} aria-hidden="true" />
                <span>{strings.privacy.saveToggleLabel}</span>
              </label>
              <p className="text-xs leading-[1.6] text-[var(--ink-secondary)]">
                {strings.privacy.saveToggleDescription}
              </p>
            </div>

            <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
              <input
                id="save-transcripts-toggle"
                type="checkbox"
                checked={saveTranscripts}
                onChange={(e) => onToggleSaveTranscripts(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-[var(--border-control)] accent-[var(--accent-primary)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Clean Editorial Conversation History */}
      <SavedHistorySection
        strings={strings}
        isSignedIn={isSignedIn}
        currentTurns={transcripts}
        currentConversationId={currentConversationId}
        isSessionPersisted={isSessionPersisted}
        saveStatus={saveStatus}
        onClearCurrentSession={onClearCurrentSession}
        savedConversations={savedConversations}
        isLoadingHistory={isLoadingHistory}
        historyLoadError={historyLoadError}
        loadingTurnsId={loadingTurnsId}
        deletingId={deletingId}
        onLoadTurns={onLoadTurns}
        onDeleteSaved={onDeleteSaved}
      />
    </main>
  );
}
