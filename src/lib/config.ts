/**
 * Environment configuration validation for SAHAYAK AI.
 * Safely validates required variables without leaking values into logs or error messages.
 */

export interface ServerConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  geminiApiKey: string;
  geminiLiveModel: string;
  appUrl: string;
}

export interface ClientConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  geminiLiveModel: string;
  appUrl: string;
}

export class ConfigError extends Error {
  constructor(public readonly missingKeys: string[], message?: string) {
    super(
      message ||
        `Missing or invalid required environment variables: ${missingKeys.join(', ')}. ` +
        `Please check your .env.local file or platform settings against .env.example.`
    );
    this.name = 'ConfigError';
  }
}

/**
 * Validates and retrieves server-side configuration.
 * Must only be called in server environments (Route Handlers, Server Actions, Server Components).
 */
export function getServerConfig(): ServerConfig {
  const missing: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  } else {
    try {
      new URL(supabaseUrl);
    } catch {
      throw new ConfigError(['NEXT_PUBLIC_SUPABASE_URL'], 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g., https://xyz.supabase.co).');
    }
  }

  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabasePublishableKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiApiKey) {
    missing.push('GEMINI_API_KEY');
  }

  if (missing.length > 0) {
    throw new ConfigError(missing);
  }

  const geminiLiveModel = process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.8-live';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  return {
    supabaseUrl: supabaseUrl!,
    supabasePublishableKey: supabasePublishableKey!,
    geminiApiKey: geminiApiKey!,
    geminiLiveModel,
    appUrl,
  };
}

/**
 * Validates and retrieves client-safe configuration.
 */
export function getClientConfig(): ClientConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
  const geminiLiveModel = process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL?.trim() || process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.8-live';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  return {
    supabaseUrl,
    supabasePublishableKey,
    geminiLiveModel,
    appUrl,
  };
}
