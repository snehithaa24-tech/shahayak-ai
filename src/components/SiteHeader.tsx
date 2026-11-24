'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { type AppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';

interface SiteHeaderProps {
  strings: AppStrings;
  language: SupportedLanguage;
  userEmail: string | null;
  onSignOut: () => void;
  disableSignOut?: boolean;
}

export function SiteHeader({
  strings,
  language,
  userEmail,
  onSignOut,
  disableSignOut = false,
}: SiteHeaderProps) {
  const loginHref = language === 'hi' ? '/login?lang=hi' : '/login';

  return (
    <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
      <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            {/* Subtle acoustic waves emblem */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="6" y1="9" x2="6" y2="15" />
              <line x1="10" y1="5" x2="10" y2="19" />
              <line x1="14" y1="7" x2="14" y2="17" />
              <line x1="18" y1="10" x2="18" y2="14" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2 whitespace-nowrap">
              <span className="font-display text-base sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
                {strings.brandLatin}
              </span>
              <span className="text-xs sm:text-sm text-[var(--border-strong)]" aria-hidden="true">
                /
              </span>
              <span
                lang="hi"
                className="font-devanagari-safe text-sm sm:text-lg font-medium text-[var(--accent-primary)]"
              >
                {strings.brandDevanagari}
              </span>
            </div>
            <p className="truncate text-[11px] sm:text-xs text-[var(--ink-secondary)]">
              {strings.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Account Action */}
        <div className="flex shrink-0 items-center">
          {userEmail ? (
            <div className="flex items-center gap-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-3 pr-1.5 py-1 shadow-[0_1px_2px_rgba(36,40,34,0.03)]">
              <User className="h-3.5 w-3.5 shrink-0 text-[var(--ink-secondary)]" strokeWidth={1.75} aria-hidden="true" />
              <span
                className="hidden max-w-[160px] truncate text-xs font-medium text-[var(--ink-primary)] sm:inline md:max-w-[220px]"
                title={userEmail}
              >
                {userEmail}
              </span>
              <span className="text-xs font-medium text-[var(--ink-primary)] sm:hidden">
                {strings.header.authenticatedUser}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                disabled={disableSignOut}
                aria-label={strings.header.signOutAria}
                title={strings.header.signOut}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-[7px] px-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--danger-tint)] hover:text-[var(--danger-ink)] disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden sm:inline">{strings.header.signOut}</span>
              </button>
            </div>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 sm:px-4 text-xs sm:text-sm font-medium text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.04)] transition-colors hover:bg-[var(--bg-subtle)] whitespace-nowrap"
            >
              {strings.header.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
