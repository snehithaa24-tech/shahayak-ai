import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limiter';
import { type SupabaseClient } from '@supabase/supabase-js';

describe('Token Route & Rate Limiting Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces rate limits and rejects issuance when limit is exceeded', async () => {
    // Mock Supabase client
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          allowed: false,
          current_count: 25,
          max_tokens: 25,
          window_reset_at: new Date(Date.now() + 1800 * 1000).toISOString(),
          retry_after_seconds: 1800,
        },
        error: null,
      }),
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await checkRateLimit(mockSupabase, 'user-123', 25, 3600);

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(25);
    expect(result.retryAfterSeconds).toBe(1800);
  });

  it('allows token issuance when within quota limit', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          allowed: true,
          current_count: 5,
          max_tokens: 25,
          window_reset_at: new Date(Date.now() + 3000 * 1000).toISOString(),
        },
        error: null,
      }),
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await checkRateLimit(mockSupabase, 'user-456', 25, 3600);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(result.maxTokens).toBe(25);
  });

  it('correctly handles table fallback when RPC is unavailable', async () => {
    const now = new Date();
    const mockSupabase = {
      rpc: vi.fn().mockRejectedValue(new Error('RPC function not found')),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: 'user-789',
                window_start: now.toISOString(),
                count: 3,
                last_issued_at: now.toISOString(),
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await checkRateLimit(mockSupabase, 'user-789', 20, 3600);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(4);
  });
});
