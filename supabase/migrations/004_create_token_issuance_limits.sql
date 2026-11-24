-- Migration 004: Token issuance limits for Gemini Live ephemeral tokens
-- Enforces persistent per-user rate limiting across serverless function invocations.

create table if not exists public.token_issuance_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  last_issued_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.token_issuance_limits enable row level security;

-- Policies: users can view and update their own rate limit record
create policy "Users can view own token limit"
  on public.token_issuance_limits
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own token limit"
  on public.token_issuance_limits
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own token limit"
  on public.token_issuance_limits
  for update
  using (auth.uid() = user_id);

-- Atomic function to check and increment token issuance limit
create or replace function public.check_and_increment_token_limit(
  p_user_id uuid,
  p_max_tokens integer default 20,
  p_window_seconds integer default 3600
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_record public.token_issuance_limits%rowtype;
  v_now timestamptz := now();
  v_allowed boolean := false;
  v_current_count integer := 0;
  v_reset_time timestamptz;
begin
  select * into v_record
  from public.token_issuance_limits
  where user_id = p_user_id
  for update;

  if not found then
    -- First token request
    insert into public.token_issuance_limits (user_id, window_start, count, last_issued_at)
    values (p_user_id, v_now, 1, v_now);

    return jsonb_build_object(
      'allowed', true,
      'current_count', 1,
      'max_tokens', p_max_tokens,
      'window_reset_at', v_now + (p_window_seconds || ' seconds')::interval
    );
  end if;

  v_reset_time := v_record.window_start + (p_window_seconds || ' seconds')::interval;

  if v_now > v_reset_time then
    -- Window expired, reset window and counter
    update public.token_issuance_limits
    set window_start = v_now,
        count = 1,
        last_issued_at = v_now
    where user_id = p_user_id;

    return jsonb_build_object(
      'allowed', true,
      'current_count', 1,
      'max_tokens', p_max_tokens,
      'window_reset_at', v_now + (p_window_seconds || ' seconds')::interval
    );
  else
    -- Inside existing window
    if v_record.count < p_max_tokens then
      update public.token_issuance_limits
      set count = count + 1,
          last_issued_at = v_now
      where user_id = p_user_id;

      return jsonb_build_object(
        'allowed', true,
        'current_count', v_record.count + 1,
        'max_tokens', p_max_tokens,
        'window_reset_at', v_reset_time
      );
    else
      -- Limit exceeded
      return jsonb_build_object(
        'allowed', false,
        'current_count', v_record.count,
        'max_tokens', p_max_tokens,
        'window_reset_at', v_reset_time,
        'retry_after_seconds', ceil(extract(epoch from (v_reset_time - v_now)))
      );
    end if;
  end if;
end;
$$;
