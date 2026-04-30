-- AmutaOS Database Schema
-- Run this in your Supabase SQL Editor

-- Users table with encrypted Monday API keys
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  monday_api_key_encrypted text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can only see/modify their own data
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_users_updated
  before update on public.users
  for each row execute function handle_updated_at();

-- Index for faster lookups
create index if not exists idx_users_created_at on public.users(created_at desc);
