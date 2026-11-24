'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, Check, AlertCircle, Trash2, X } from 'lucide-react';
import { type SaveStatus, type TranscriptTurn } from '@/lib/session/transcript-types';
import { type AppStrings } from '@/lib/i18n';
import { useMediaQuery } from '@/hooks/use-media-query';

interface TranscriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusToRef?: React.RefObject<HTMLElement | null>;
  transcripts: TranscriptTurn[];
  interimUserText: string;
  interimAssistantText: string;
  isSessionPersisted: boolean;
  saveStatus: SaveStatus;
  onClearSession: () => void;
  strings: AppStrings;
}

export function TranscriptPanel({
  isOpen,
  onClose,
  returnFocusToRef,
  transcripts,
  interimUserText,
  interimAssistantText,
  isSessionPersisted,
  saveStatus,
  onClearSession,
  strings,
}: TranscriptPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const wasOpenRef = useRef<boolean>(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Restore focus to opener when panel closes cleanly after React commits unmount
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      returnFocusToRef?.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, returnFocusToRef]);

  // Focus initialization, body scroll lock on mobile sheet, Escape handling, and modal focus trap
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    if (!isDesktop) {
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isDesktop || panelRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          handleClose();
        }
        return;
      }

      if (!isDesktop && event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, isDesktop, handleClose]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 48;
    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom && el.scrollHeight > el.clientHeight + 32);
  }, []);

  // Only scroll to bottom when the user has not scrolled up to read earlier turns
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isOpen) return;

    if (isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } else if (el.scrollHeight > el.clientHeight + 32) {
      setShowJumpToLatest(true);
    }
  }, [isOpen, transcripts, interimUserText, interimAssistantText]);

  const jumpToLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowJumpToLatest(false);
  };

  if (!isOpen) return null;

  const hasContent = transcripts.length > 0 || Boolean(interimUserText) || Boolean(interimAssistantText);

  const renderSaveBadge = () => {
    if (isSessionPersisted && saveStatus === 'saved') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent-primary)]">
          <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          <span>{strings.privacy.savedConfirmed}</span>
        </span>
      );
    }
    if (saveStatus === 'saving') {
      return <span className="text-[11px] text-[var(--ink-secondary)]">{strings.privacy.savingPending}</span>;
    }
    if (saveStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--danger-ink)]">
          <AlertCircle className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          <span>{strings.privacy.saveFailed}</span>
        </span>
      );
    }
    return <span className="text-[11px] text-[var(--ink-secondary)]">{strings.privacy.unsavedSessionBadge}</span>;
  };

  const wrapperClasses = isDesktop
    ? 'flex h-full max-h-[calc(100dvh-11.5rem)] w-full flex-col rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] overflow-hidden'
    : 'fixed inset-0 z-50 flex h-dvh w-full flex-col bg-[var(--bg-surface)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';

  return (
    <div
      ref={panelRef}
      role={isDesktop ? 'region' : 'dialog'}
      aria-modal={isDesktop ? undefined : true}
      aria-labelledby="transcript-panel-title"
      className={wrapperClasses}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="transcript-panel-title"
              className="text-sm sm:text-base font-semibold text-[var(--ink-primary)]"
            >
              {strings.transcripts.panelTitle}
            </h2>
            {transcripts.length > 0 && (
              <span className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-secondary)]">
                {strings.transcripts.turnCount(transcripts.length)}
              </span>
            )}
          </div>
          <div className="mt-0.5">{renderSaveBadge()}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {transcripts.length > 0 && (
            <button
              type="button"
              onClick={onClearSession}
              aria-label={strings.transcripts.clearSessionAria}
              title={strings.transcripts.clearSession}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--danger-border)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger-ink)]"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label={strings.transcripts.closePanel}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable Transcript Stream */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-4 sm:px-5 space-y-4"
        >
          {!hasContent ? (
            <div className="flex h-full min-h-[180px] items-center justify-center text-center">
              <p className="max-w-xs text-sm leading-relaxed text-[var(--ink-secondary)]">
                {strings.transcripts.emptyLive}
              </p>
            </div>
          ) : (
            <>
              {transcripts.map((turn) => {
                const isUser = turn.role === 'user';
                return (
                  <article
                    key={turn.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-[var(--ink-secondary)]">
                      <span className="font-medium">
                        {isUser ? strings.call.speakerYou : strings.call.speakerAssistant}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <time dateTime={new Date(turn.timestamp).toISOString()}>
                        {new Date(turn.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <div
                      lang={turn.language}
                      className={`max-w-[88%] rounded-[12px] border px-3.5 py-2.5 text-sm sm:text-[15px] leading-[1.7] ${
                        isUser
                          ? 'border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]'
                      }`}
                    >
                      {turn.content}
                    </div>
                  </article>
                );
              })}

              {interimUserText && (
                <div className="flex flex-col items-end">
                  <span className="mb-1 px-1 text-[11px] font-medium text-[var(--ink-secondary)]">
                    {strings.call.speakerYou}
                  </span>
                  <div className="max-w-[88%] rounded-[12px] border border-dashed border-[var(--accent-border)] bg-[var(--accent-tint)]/60 px-3.5 py-2.5 text-sm sm:text-[15px] leading-[1.7] text-[var(--ink-primary)]">
                    {interimUserText}
                  </div>
                </div>
              )}

              {interimAssistantText && (
                <div className="flex flex-col items-start">
                  <span className="mb-1 px-1 text-[11px] font-medium text-[var(--ink-secondary)]">
                    {strings.call.speakerAssistant}
                  </span>
                  <div className="max-w-[88%] rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm sm:text-[15px] leading-[1.7] text-[var(--ink-primary)]">
                    {interimAssistantText}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Route back to latest when user scrolled up to read earlier messages */}
        {showJumpToLatest && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <button
              type="button"
              onClick={jumpToLatest}
              className="pointer-events-auto inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--ink-primary)] shadow-[var(--shadow-floating)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <ArrowDown className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.9} aria-hidden="true" />
              <span>{strings.transcripts.jumpToLatest}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
