'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Check,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Square,
} from 'lucide-react';
import { type AppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';
import {
  type SaveStatus,
  type SessionState,
  type TranscriptTurn,
} from '@/lib/session/transcript-types';
import { type AudioLevels } from '@/hooks/use-voice-session';
import { StatusPill } from './StatusPill';
import { VoiceIndicator } from './VoiceIndicator';
import { TranscriptPanel } from './TranscriptPanel';

interface ActiveCallScreenProps {
  strings: AppStrings;
  language: SupportedLanguage;
  sessionState: SessionState;
  isMuted: boolean;
  hasMicrophone: boolean;
  transcripts: TranscriptTurn[];
  interimUserText: string;
  interimAssistantText: string;
  isSessionPersisted: boolean;
  saveStatus: SaveStatus;
  getAudioLevels: () => AudioLevels;
  onToggleMute: () => void;
  onEnableMicrophone: () => void;
  onInterrupt: () => void;
  onDoneSpeaking: () => void;
  onSendTyped: (text: string) => void;
  onEndCall: () => void;
  onClearSession: () => void;
}

export function ActiveCallScreen({
  strings,
  language,
  sessionState,
  isMuted,
  hasMicrophone,
  transcripts,
  interimUserText,
  interimAssistantText,
  isSessionPersisted,
  saveStatus,
  getAudioLevels,
  onToggleMute,
  onEnableMicrophone,
  onInterrupt,
  onDoneSpeaking,
  onSendTyped,
  onEndCall,
  onClearSession,
}: ActiveCallScreenProps) {
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [typedOpenOverride, setTypedOpenOverride] = useState<boolean | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const transcriptToggleRef = useRef<HTMLButtonElement>(null);

  const handleCloseTranscript = useCallback(() => {
    setShowTranscriptDrawer(false);
  }, []);

  const isTypedInputVisible = typedOpenOverride !== null ? typedOpenOverride : !hasMicrophone && sessionState === 'Connected';

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = typedMessage.trim();
    if (!trimmed) return;
    onSendTyped(trimmed);
    setTypedMessage('');
  };

  // Determine active live subtitle speaker + text cleanly
  const latestTurn = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;
  let subtitleSpeaker: string | null = null;
  let subtitleText: string | null = null;

  if (interimAssistantText) {
    subtitleSpeaker = strings.call.speakerAssistant;
    subtitleText = interimAssistantText;
  } else if (interimUserText) {
    subtitleSpeaker = strings.call.speakerYou;
    subtitleText = interimUserText;
  } else if (latestTurn) {
    subtitleSpeaker =
      latestTurn.role === 'user' ? strings.call.speakerYou : strings.call.speakerAssistant;
    subtitleText = latestTurn.content;
  }

  const idleSubtitlePrompt =
    sessionState === 'Muted'
      ? strings.call.subtitlePromptMuted
      : sessionState === 'Connected'
      ? strings.call.subtitlePromptTyped
      : strings.call.subtitlePromptSpeaking;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div
        className={`flex-1 grid gap-6 ${
          showTranscriptDrawer
            ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]'
            : 'grid-cols-1'
        }`}
      >
        {/* Call Stage */}
        <section
          aria-label={strings.call.status[sessionState]}
          className={`flex min-h-[calc(100dvh-12.5rem)] sm:min-h-[520px] w-full flex-col justify-between rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-7 shadow-[var(--shadow-card)] ${
            showTranscriptDrawer ? '' : 'mx-auto max-w-3xl'
          }`}
        >
          {/* Top Session Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div className="flex flex-col gap-1">
              <div
                role="radiogroup"
                aria-label={strings.ready.languageLabel}
                className="inline-flex items-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-xs"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={language === 'en'}
                  disabled
                  title={strings.call.languageLockedNote}
                  className={`min-h-[34px] rounded-[6px] px-3 font-medium ${
                    language === 'en'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.06)]'
                      : 'text-[var(--ink-muted)] opacity-60'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={language === 'hi'}
                  disabled
                  lang="hi"
                  title={strings.call.languageLockedNote}
                  className={`font-devanagari-safe min-h-[34px] rounded-[6px] px-3 font-medium ${
                    language === 'hi'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.06)]'
                      : 'text-[var(--ink-muted)] opacity-60'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
              <p className="text-[11px] text-[var(--ink-secondary)]">
                {strings.call.languageLockedNote}
              </p>
            </div>

            <button
              ref={transcriptToggleRef}
              type="button"
              onClick={() => setShowTranscriptDrawer((prev) => !prev)}
              aria-expanded={showTranscriptDrawer}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors ${
                showTranscriptDrawer
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-tint)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {showTranscriptDrawer
                  ? strings.call.hideTranscripts
                  : strings.call.viewTranscripts}
              </span>
              {transcripts.length > 0 && (
                <span className="rounded-[5px] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                  {transcripts.length}
                </span>
              )}
            </button>
          </div>

          {/* Center Acoustic Indicator + Status + Subtitles */}
          <div className="my-auto flex flex-col items-center justify-center gap-5 py-6 text-center">
            <StatusPill state={sessionState} strings={strings} isMuted={isMuted} />

            <VoiceIndicator state={sessionState} getAudioLevels={getAudioLevels} />

            {/* Live Subtitles Reading Container (stable geometry, high contrast) */}
            <div
              aria-label={strings.transcripts.panelTitle}
              className="w-full max-w-xl min-h-[120px] max-h-[190px] overflow-y-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-3.5 sm:px-5 sm:py-4 text-left"
            >
              {subtitleText ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    {subtitleSpeaker}
                  </p>
                  <p
                    lang={language}
                    className="text-base sm:text-[17px] leading-[1.7] text-[var(--ink-primary)]"
                  >
                    {subtitleText}
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[84px] items-center justify-center text-center">
                  <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
                    {idleSubtitlePrompt}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Inline Typed Input Fallback & Anchored Controls */}
          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {isTypedInputVisible && (
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-canvas)] p-1.5"
              >
                <label htmlFor="active-call-typed-input" className="sr-only">
                  {strings.call.typePlaceholder}
                </label>
                <input
                  id="active-call-typed-input"
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder={strings.call.typePlaceholder}
                  className="min-h-[44px] flex-1 bg-transparent px-3 text-sm sm:text-base text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!typedMessage.trim() || sessionState === 'Connecting'}
                  aria-label={strings.call.send}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[8px] bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden sm:inline">{strings.call.send}</span>
                </button>
              </form>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Secondary Call Actions */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {hasMicrophone ? (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-pressed={isMuted}
                    className={`inline-flex min-h-[44px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs sm:text-[13px] font-medium transition-colors ${
                      isMuted
                        ? 'border-[var(--warning-border)] bg-[var(--warning-tint)] text-[var(--warning-ink)]'
                        : 'border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {isMuted ? (
                      <MicOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <Mic className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    )}
                    <span>{isMuted ? strings.call.unmute : strings.call.mute}</span>
                  </button>
                ) : (
                  sessionState !== 'Connecting' &&
                  sessionState !== 'RequestingPermission' && (
                    <button
                      type="button"
                      onClick={onEnableMicrophone}
                      className="inline-flex min-h-[44px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-tint)] px-3 py-2 text-xs sm:text-[13px] font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-border)]/40"
                    >
                      <Mic className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>{strings.call.enableMic}</span>
                    </button>
                  )
                )}

                {sessionState === 'Speaking' && (
                  <button
                    type="button"
                    onClick={onInterrupt}
                    className="inline-flex min-h-[44px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-xs sm:text-[13px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <Square className="h-3.5 w-3.5 shrink-0 fill-current" strokeWidth={1.75} aria-hidden="true" />
                    <span>{strings.call.interrupt}</span>
                  </button>
                )}

                {sessionState === 'Listening' && hasMicrophone && !isMuted && (
                  <button
                    type="button"
                    onClick={onDoneSpeaking}
                    title={strings.call.doneSpeakingHint}
                    className="inline-flex min-h-[44px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-tint)] px-3 py-2 text-xs sm:text-[13px] font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-border)]/40"
                  >
                    <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                    <span>{strings.call.doneSpeaking}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTypedOpenOverride((prev) => !(prev ?? isTypedInputVisible))}
                  aria-expanded={isTypedInputVisible}
                  className={`inline-flex min-h-[44px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs sm:text-[13px] font-medium transition-colors ${
                    isTypedInputVisible
                      ? 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {isTypedInputVisible ? strings.call.hideTypeInput : strings.call.typeMessage}
                  </span>
                </button>
              </div>

              {/* Isolated Primary Destructive Control: End Call */}
              <div className="flex shrink-0 justify-center sm:justify-end border-t border-[var(--border-subtle)] pt-3 sm:border-t-0 sm:pt-0 sm:ml-2 sm:border-l sm:pl-4">
                <button
                  type="button"
                  onClick={onEndCall}
                  aria-label={strings.call.endCallAria}
                  className="inline-flex min-h-[46px] w-full sm:w-auto shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-[10px] bg-[var(--danger-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_4px_rgba(140,45,45,0.2)] transition-colors hover:bg-[var(--danger-hover)]"
                >
                  <PhoneOff className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                  <span>{strings.call.endCall}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Transcript Side Panel (Desktop) / Sheet Dialog (Mobile & Tablet) */}
        <TranscriptPanel
          isOpen={showTranscriptDrawer}
          onClose={handleCloseTranscript}
          returnFocusToRef={transcriptToggleRef}
          transcripts={transcripts}
          interimUserText={interimUserText}
          interimAssistantText={interimAssistantText}
          isSessionPersisted={isSessionPersisted}
          saveStatus={saveStatus}
          onClearSession={onClearSession}
          strings={strings}
        />
      </div>
    </main>
  );
}
