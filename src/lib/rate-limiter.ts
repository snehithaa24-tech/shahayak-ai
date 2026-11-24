import { type SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxTokens: number;
  windowResetAt?: string;
  retryAfterSeconds?: number;
}

/**
 * Checks and increments the per-user token issuance limit.
 * Tries the atomic stored procedure first; falls back to table upsert if RPC is unavailable.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  maxTokens = 20,
  windowSeconds = 3600
): Promise<RateLimitResult> {
  try {
    // Attempt atomic Postgres RPC first
    const { data, error } = await supabase.rpc('check_and_increment_token_limit', {
      p_user_id: userId,
      p_max_tokens: maxTokens,
      p_window_seconds: windowSeconds,
    });

    if (!error && data) {
      return {
        allowed: Boolean(data.allowed),
        currentCount: Number(data.current_count) || 1,
        maxTokens: Number(data.max_tokens) || maxTokens,
        windowResetAt: data.window_reset_at,
        retryAfterSeconds: data.retry_after_seconds,
      };
    }
  } catch {
    // Ignore RPC missing error and continue to table-level check
  }

  // Fallback: direct table-level verification
  try {
    const { data: record, error: fetchErr } = await supabase
      .from('token_issuance_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    const now = new Date();

    if (fetchErr || !record) {
      // First issuance
      await supabase.from('token_issuance_limits').insert({
        user_id: userId,
        window_start: now.toISOString(),
        count: 1,
        last_issued_at: now.toISOString(),
      });

      return {
        allowed: true,
        currentCount: 1,
        maxTokens,
        windowResetAt: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
      };
    }

    const windowStart = new Date(record.window_start);
    const windowElapsed = (now.getTime() - windowStart.getTime()) / 1000;

    if (windowElapsed > windowSeconds) {
      // New window
      await supabase
        .from('token_issuance_limits')
        .update({
          window_start: now.toISOString(),
          count: 1,
          last_issued_at: now.toISOString(),
        })
        .eq('user_id', userId);

      return {
        allowed: true,
        currentCount: 1,
        maxTokens,
        windowResetAt: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
      };
    }

    if (record.count >= maxTokens) {
      const remainingSeconds = Math.ceil(windowSeconds - windowElapsed);
      return {
        allowed: false,
        currentCount: record.count,
        maxTokens,
        windowResetAt: new Date(windowStart.getTime() + windowSeconds * 1000).toISOString(),
        retryAfterSeconds: Math.max(1, remainingSeconds),
      };
    }

    // Increment inside window
    await supabase
      .from('token_issuance_limits')
      .update({
        count: record.count + 1,
        last_issued_at: now.toISOString(),
      })
      .eq('user_id', userId);

    return {
      allowed: true,
      currentCount: record.count + 1,
      maxTokens,
      windowResetAt: new Date(windowStart.getTime() + windowSeconds * 1000).toISOString(),
    };
  } catch {
    // In local development without Supabase connected yet, allow gracefully
    return {
      allowed: true,
      currentCount: 1,
      maxTokens,
    };
  }
}
