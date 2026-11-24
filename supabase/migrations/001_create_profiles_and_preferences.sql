-- Migration 001: User profiles and language preferences
-- Table stores per-user preferences including default language and transcript saving choice.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language varchar(10) not null default 'en',
  save_transcripts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_language check (language in ('en', 'hi'))
);

-- Enable Row-Level Security
alter table public.user_preferences enable row level security;

-- Policies: users may only read and modify their own preferences
create policy "Users can read own preferences"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences
  for update
  using (auth.uid() = user_id);
