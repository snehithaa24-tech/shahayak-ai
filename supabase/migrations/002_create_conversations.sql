-- Migration 002: Conversation metadata
-- Stores conversation sessions created by users.
-- Includes a composite unique key (id, user_id) so child tables can enforce cross-tenant data isolation.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Conversation',
  language varchar(10) not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_conv_language check (language in ('en', 'hi')),
  constraint unique_conversation_user unique (id, user_id)
);

create index if not exists idx_conversations_user_id on public.conversations (user_id);
create index if not exists idx_conversations_created_at on public.conversations (created_at desc);

-- Enable Row-Level Security
alter table public.conversations enable row level security;

-- Policies: users can only see, create, modify, and delete their own conversations
create policy "Users can view own conversations"
  on public.conversations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations
  for delete
  using (auth.uid() = user_id);
