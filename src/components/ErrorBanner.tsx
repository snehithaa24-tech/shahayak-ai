'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, RotateCcw, X } from 'lucide-react';
import { type VoiceSessionError } from '@/lib/session/transcript-types';
import { type AppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';

interface ErrorBannerProps {
  error: VoiceSessionError;
  strings: AppStrings;
  language: SupportedLanguage;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function ErrorBanner({
  error,
  strings,
  language,
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  const loginHref = language === 'hi' ? '/login?lang=hi' : '/login';

  return (
    <div
      role="alert"
      className="rounded-[12px] border border-[var(--danger-border)] bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger-ink)] shadow-[0_1px_2px_rgba(36,40,34,0.03)]"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger-primary)]" strokeWidth={1.75} aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold text-[var(--danger-primary)]">{error.message}</p>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--ink-primary)]">
            {error.actionHint}
          </p>

          {(error.type === 'unauthorized' || (error.retryable && onRetry)) && (
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {error.type === 'unauthorized' && (
                <Link
                  href={loginHref}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  <span>{strings.errors.goToSignIn}</span>
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              )}

              {error.retryable && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--danger-border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--danger-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>{strings.errors.tryAgain}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={strings.errors.dismiss}
          className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-[8px] text-[var(--danger-ink)] transition-colors hover:bg-[var(--danger-border)]/40"
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
