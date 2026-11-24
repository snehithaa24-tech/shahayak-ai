import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLiveEphemeralToken, GeminiLiveError } from '@/lib/gemini/token-service';
import { checkRateLimit } from '@/lib/rate-limiter';
import { type SupportedLanguage } from '@/lib/prompt';

export async function POST(request: Request) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  try {
    // 1. Authenticate user via Supabase session cookies
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: 'Authentication required. Please sign in with Google to use Sahayak voice assistant.',
        },
        { status: 401, headers }
      );
    }

    // 2. Enforce persistent per-user token issuance limits (e.g. 25 tokens per hour)
    const rateLimit = await checkRateLimit(supabase, user.id, 25, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Hourly session limit reached. Please wait before starting another voice call.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429, headers }
      );
    }

    // 3. Parse and validate language preference from payload
    let language: SupportedLanguage = 'en';
    try {
      const body = await request.json();
      if (body && body.language === 'hi') {
        language = 'hi';
      }
    } catch {
      // Body may be empty, default to English
    }

    // 4. Exchange server-only Gemini key for a short-lived, single-use client credential
    const tokenData = await createLiveEphemeralToken(language);

    return NextResponse.json(
      {
        success: true,
        token: tokenData.token,
        model: tokenData.model,
        language: tokenData.language,
        expireTime: tokenData.expireTime,
        newSessionExpireTime: tokenData.newSessionExpireTime,
      },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    if (error instanceof GeminiLiveError) {
      if (error.code === 'quota_exhausted') {
        return NextResponse.json(
          {
            error: 'quota_exhausted',
            message: error.message,
          },
          { status: 429, headers }
        );
      }

      if (error.code === 'auth_error') {
        return NextResponse.json(
          {
            error: 'auth_error',
            message: error.message,
          },
          { status: 403, headers }
        );
      }

      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: 500, headers }
      );
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred while starting voice session.';
    return NextResponse.json(
      {
        error: 'internal_error',
        message,
      },
      { status: 500, headers }
    );
  }
}
