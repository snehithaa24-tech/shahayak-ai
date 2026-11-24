-- Migration 003: Saved transcript turns (optional per user choice)
-- Stores conversation turns when the user has opted in to saving transcripts.
-- Enforces that a turn can ONLY belong to a conversation owned by the exact same user
-- via composite foreign key (conversation_id, user_id).

create table if not exists public.transcript_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null,
  role varchar(20) not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  language varchar(10) not null default 'en',
  turn_index integer not null default 0,
  created_at timestamptz not null default now(),

  -- Foreign key enforces cross-user isolation: turn cannot attach to another user's conversation
  constraint fk_conversation_user foreign key (conversation_id, user_id)
    references public.conversations (id, user_id) on delete cascade
);

create index if not exists idx_transcript_turns_conv on public.transcript_turns (conversation_id, turn_index asc);
create index if not exists idx_transcript_turns_user on public.transcript_turns (user_id);

-- Enable Row-Level Security
alter table public.transcript_turns enable row level security;

-- Policies: users can only see, add, and delete their own turns
create policy "Users can view own transcript turns"
  on public.transcript_turns
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own transcript turns"
  on public.transcript_turns
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own transcript turns"
  on public.transcript_turns
  for delete
  using (auth.uid() = user_id);
