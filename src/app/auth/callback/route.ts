import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeRedirectUrl(nextParam: string | null, origin: string): string {
  if (!nextParam) {
    return `${origin}/`;
  }

  // Prevent open redirect vulnerabilities:
  // Disallow absolute external URLs or protocol-relative URLs (e.g. //attacker.com)
  if (nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    return `${origin}${nextParam}`;
  }

  try {
    const parsed = new URL(nextParam);
    if (parsed.origin === origin) {
      return nextParam;
    }
  } catch {
    // Malformed URL, fallback to origin root
  }

  return `${origin}/`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next');

  // Handle OAuth provider error (e.g. user canceled login or access denied)
  if (error) {
    const errorParam = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${origin}/login?error=${errorParam}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        const destination = getSafeRedirectUrl(next, origin);
        return NextResponse.redirect(destination);
      }
    } catch {
      return NextResponse.redirect(`${origin}/login?error=authentication_failed`);
    }
  }

  // Return user to login if code is missing or exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_code_missing`);
}
