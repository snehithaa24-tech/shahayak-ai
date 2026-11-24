'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Shield } from 'lucide-react';
import { getAppStrings } from '@/lib/i18n';
import { type SupportedLanguage } from '@/lib/prompt';

function LoginContent() {
  const searchParams = useSearchParams();
  const initialLang: SupportedLanguage = searchParams.get('lang') === 'hi' ? 'hi' : 'en';
  const [language, setLanguage] = useState<SupportedLanguage>(initialLang);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const strings = getAppStrings(language);

  const initialError = useMemo(() => {
    const errorParam = searchParams.get('error');
    if (!errorParam) return null;
    if (errorParam === 'auth_code_missing') {
      return strings.login.errorMissingCode;
    }
    if (errorParam.includes('access_denied') || errorParam.includes('cancel')) {
      return strings.login.errorDenied;
    }
    try {
      return decodeURIComponent(errorParam);
    } catch {
      return strings.login.errorGeneric;
    }
  }, [searchParams, strings.login.errorDenied, strings.login.errorGeneric, strings.login.errorMissingCode]);

  const displayedError = errorMessage || initialError;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : strings.login.errorGeneric;
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md space-y-6 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)]">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <div
            role="radiogroup"
            aria-label={strings.ready.languageLabel}
            className="inline-flex items-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={language === 'en'}
              onClick={() => setLanguage('en')}
              className={`min-h-[34px] rounded-[6px] px-3 font-medium transition-colors ${
                language === 'en'
                  ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.06)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={language === 'hi'}
              onClick={() => setLanguage('hi')}
              lang="hi"
              className={`font-devanagari-safe min-h-[34px] rounded-[6px] px-3 font-medium transition-colors ${
                language === 'hi'
                  ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.06)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Brand Identity */}
        <div className="text-center space-y-3">
          <div
            className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="6" y1="9" x2="6" y2="15" />
              <line x1="10" y1="5" x2="10" y2="19" />
              <line x1="14" y1="7" x2="14" y2="17" />
              <line x1="18" y1="10" x2="18" y2="14" />
            </svg>
          </div>

          <div className="space-y-1">
            <h1 className="flex items-baseline justify-center gap-2.5 text-2xl sm:text-3xl font-medium text-[var(--ink-primary)]">
              <span className="font-display tracking-tight">{strings.brandLatin}</span>
              <span className="text-lg text-[var(--border-strong)]" aria-hidden="true">
                /
              </span>
              <span lang="hi" className="font-devanagari-safe text-xl sm:text-2xl text-[var(--accent-primary)]">
                {strings.brandDevanagari}
              </span>
            </h1>
            <p lang={language} className="mx-auto max-w-[20rem] text-sm sm:text-[15px] leading-[1.65] text-pretty text-[var(--ink-secondary)]">
              {strings.login.tagline}
            </p>
          </div>
        </div>

        {/* Auth Error Alert */}
        {displayedError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[10px] border border-[var(--danger-border)] bg-[var(--danger-tint)] p-3.5 text-xs sm:text-sm text-[var(--danger-ink)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-primary)]" strokeWidth={1.75} aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold text-[var(--danger-primary)]">{strings.login.errorHeading}</p>
              <p className="leading-relaxed text-[var(--ink-primary)]">{displayedError}</p>
            </div>
          </div>
        )}

        {/* Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isLoading}
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-3 text-sm sm:text-base font-medium text-[var(--ink-primary)] shadow-[0_1px_2px_rgba(36,40,34,0.04)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-[var(--accent-primary)] border-r-transparent" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isLoading ? strings.login.connecting : strings.login.continueWithGoogle}</span>
          </button>
        </div>

        {/* Calm Privacy Note */}
        <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-xs leading-[1.65] text-[var(--ink-secondary)] space-y-2">
          <div className="flex items-center gap-2 font-medium text-[var(--ink-primary)]">
            <Shield className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" strokeWidth={1.75} aria-hidden="true" />
            <span>{strings.login.privacyHeading}</span>
          </div>
          <p>{strings.login.privacyBody}</p>
          <p>
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
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--ink-secondary)]">
          Loading sign-in…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
