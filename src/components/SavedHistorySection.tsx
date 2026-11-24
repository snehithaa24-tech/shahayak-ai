'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react';
import {
  type SavedConversation,
  type SaveStatus,
  type TranscriptTurn,
} from '@/lib/session/transcript-types';
import { type AppStrings } from '@/lib/i18n';

interface SavedHistorySectionProps {
  strings: AppStrings;
  isSignedIn: boolean;
  currentTurns: TranscriptTurn[];
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

export function SavedHistorySection({
  strings,
  isSignedIn,
  currentTurns,
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
}: SavedHistorySectionProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (conv: SavedConversation) => {
    const nextOpen = !expandedIds[conv.id];
    setExpandedIds((prev) => ({ ...prev, [conv.id]: nextOpen }));
    if (nextOpen && conv.turns === undefined) {
      onLoadTurns(conv.id);
    }
  };

  // Avoid showing the currently active/just-ended saved session twice
  const previousSaved = currentTurns.length > 0 && currentConversationId
    ? savedConversations.filter((c) => c.id !== currentConversationId)
    : savedConversations;

  const hasCurrentTurns = currentTurns.length > 0;
  const hasSaved = previousSaved.length > 0;

  return (
    <section
      aria-labelledby="conversation-history-heading"
      className="border-t border-[var(--border-subtle)] pt-8 space-y-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="conversation-history-heading"
          className="font-display text-xl sm:text-2xl font-medium text-[var(--ink-primary)]"
        >
          {strings.transcripts.historyTitle}
        </h2>
      </div>

      {/* Current Session (Unsaved OR Just-Completed) */}
      {hasCurrentTurns && (
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                {strings.transcripts.currentSessionHeading}
              </span>
              <span className="text-xs text-[var(--ink-secondary)]">
                &middot; {strings.transcripts.turnCount(currentTurns.length)}
              </span>
              {isSessionPersisted && saveStatus === 'saved' ? (
                <span className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--accent-border)] bg-[var(--accent-tint)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
                  <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  <span>{strings.privacy.savedConfirmed}</span>
                </span>
              ) : (
                <span className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-secondary)]">
                  {strings.privacy.unsavedSessionBadge}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearCurrentSession}
              aria-label={strings.transcripts.clearSessionAria}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--danger-border)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger-ink)]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>{strings.transcripts.clearSession}</span>
            </button>
          </div>

          <ul className="divide-y divide-[var(--border-subtle)] px-4 sm:px-5">
            {currentTurns.map((turn) => (
              <li key={turn.id} className="py-3.5">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--ink-secondary)]">
                  <span className="font-semibold text-[var(--ink-primary)]">
                    {turn.role === 'user' ? strings.call.speakerYou : strings.call.speakerAssistant}
                  </span>
                  <time dateTime={new Date(turn.timestamp).toISOString()}>
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <p
                  lang={turn.language}
                  className="text-sm sm:text-[15px] leading-[1.7] text-[var(--ink-primary)]"
                >
                  {turn.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Saved Conversations from Account */}
      <div className="space-y-3">
        {(hasCurrentTurns || hasSaved) && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
            {strings.transcripts.savedConversationsHeading}
          </h3>
        )}

        {!isSignedIn ? (
          <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
            {strings.transcripts.historyEmptySignedOut}
          </p>
        ) : isLoadingHistory && previousSaved.length === 0 ? (
          <p className="text-sm text-[var(--ink-secondary)]">
            {strings.transcripts.historyLoading}
          </p>
        ) : historyLoadError ? (
          <p className="text-sm text-[var(--danger-ink)]">
            {strings.transcripts.historyLoadError}
          </p>
        ) : !hasSaved && !hasCurrentTurns ? (
          <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
            {strings.transcripts.historyEmptySignedIn}
          </p>
        ) : !hasSaved ? null : (
          <ul className="divide-y divide-[var(--border-subtle)] rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)]">
            {previousSaved.map((conv) => {
              const isExpanded = Boolean(expandedIds[conv.id]);
              const isLoadingTurns = loadingTurnsId === conv.id;
              const isDeleting = deletingId === conv.id;

              return (
                <li key={conv.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--ink-primary)]">
                        {conv.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-secondary)]">
                        <span>{conv.language === 'hi' ? 'हिन्दी' : 'English'}</span>
                        <span aria-hidden="true">&middot;</span>
                        <time dateTime={conv.createdAt}>
                          {new Date(conv.createdAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </time>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(conv)}
                        aria-expanded={isExpanded}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                      >
                        <span>
                          {isExpanded ? strings.transcripts.hideTurns : strings.transcripts.showTurns}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void onDeleteSaved(conv.id)}
                        disabled={isDeleting}
                        aria-label={`${strings.transcripts.deleteSaved} ${conv.title}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--danger-border)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger-ink)] disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                        <span>
                          {isDeleting ? strings.transcripts.deletingSaved : strings.transcripts.deleteSaved}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                      {isLoadingTurns ? (
                        <p className="text-xs text-[var(--ink-secondary)]">
                          {strings.transcripts.loadingTurns}
                        </p>
                      ) : !conv.turns || conv.turns.length === 0 ? (
                        <p className="text-xs text-[var(--ink-secondary)]">
                          {strings.transcripts.noSavedTurns}
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {conv.turns.map((turn) => (
                            <li key={turn.id} className="text-sm">
                              <span className="font-semibold text-[var(--ink-secondary)]">
                                {turn.role === 'user'
                                  ? strings.call.speakerYou
                                  : strings.call.speakerAssistant}
                                :{' '}
                              </span>
                              <span lang={turn.language} className="leading-[1.7] text-[var(--ink-primary)]">
                                {turn.content}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
