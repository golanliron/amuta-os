-- Fishgold Multi-tenant Schema
-- Designed for thousands of organizations with complete RLS isolation

-- Enable pgvector for RAG embeddings
create extension if not exists vector with schema extensions;

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations (tenants)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text unique,
  domain text,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'enterprise')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Users (linked to auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create index idx_users_org on public.users(org_id);

-- ============================================
-- DOCUMENTS & RAG
-- ============================================

-- Uploaded documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  filename text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'xlsx', 'url', 'txt')),
  storage_path text not null,
  category text not null default 'other' check (category in ('identity', 'budget', 'project', 'grant', 'submission', 'other')),
  parsed_text text,
  metadata jsonb not null default '{}',
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  uploaded_at timestamptz not null default now()
);

create index idx_documents_org on public.documents(org_id);
create index idx_documents_category on public.documents(org_id, category);

-- Document chunks for RAG retrieval
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_chunks_org on public.document_chunks(org_id);
create index idx_chunks_document on public.document_chunks(document_id);

-- HNSW index for fast similarity search at scale
create index idx_chunks_embedding on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Organization profile (AI-extracted structured data)
create table public.org_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid unique not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}',
  embedding vector(1536),
  last_updated timestamptz not null default now()
);

-- ============================================
-- OPPORTUNITIES & MATCHING
-- ============================================

-- Grant opportunities (shared across all orgs)
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  description text,
  amount_min integer,
  amount_max integer,
  deadline date,
  requirements jsonb not null default '{}',
  categories text[] not null default '{}',
  regions text[] not null default '{}',
  url text,
  embedding vector(1536),
  active boolean not null default true,
  scraped_at timestamptz not null default now()
);

create index idx_opportunities_active on public.opportunities(active, deadline);
create index idx_opportunities_embedding on public.opportunities
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Matches (opportunity <-> organization)
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reasoning text,
  status text not null default 'new' check (status in ('new', 'viewed', 'writing', 'submitted', 'won', 'lost')),
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(org_id, opportunity_id)
);

create index idx_matches_org on public.matches(org_id);
create index idx_matches_score on public.matches(org_id, score desc);

-- ============================================
-- SUBMISSIONS
-- ============================================

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  content jsonb not null default '[]',
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'review', 'submitted', 'approved', 'rejected')),
  pdf_path text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index idx_submissions_org on public.submissions(org_id);

-- ============================================
-- CONVERSATIONS
-- ============================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_org on public.conversations(org_id);
create index idx_conversations_user on public.conversations(user_id, updated_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.org_profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.matches enable row level security;
alter table public.submissions enable row level security;
alter table public.conversations enable row level security;

-- Helper: get current user's org_id
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.users where id = auth.uid()
$$;

-- Organizations: users can only see their own org
create policy "org_read" on public.organizations
  for select using (id = public.get_user_org_id());

create policy "org_update" on public.organizations
  for update using (id = public.get_user_org_id());

-- Users: members can see their org's users
create policy "users_read" on public.users
  for select using (org_id = public.get_user_org_id());

-- Documents: org isolation
create policy "docs_all" on public.documents
  for all using (org_id = public.get_user_org_id());

-- Chunks: org isolation
create policy "chunks_all" on public.document_chunks
  for all using (org_id = public.get_user_org_id());

-- Org profiles: org isolation
create policy "profile_all" on public.org_profiles
  for all using (org_id = public.get_user_org_id());

-- Opportunities: everyone can read active ones
create policy "opportunities_read" on public.opportunities
  for select using (active = true);

-- Matches: org isolation
create policy "matches_all" on public.matches
  for all using (org_id = public.get_user_org_id());

-- Submissions: org isolation
create policy "submissions_all" on public.submissions
  for all using (org_id = public.get_user_org_id());

-- Conversations: org isolation
create policy "conversations_all" on public.conversations
  for all using (org_id = public.get_user_org_id());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Semantic search: find relevant chunks for a query
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int default 10,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.org_id = match_org_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- Match opportunities to org profile
create or replace function public.match_opportunities(
  org_embedding vector(1536),
  match_count int default 20,
  match_threshold float default 0.6
)
returns table (
  id uuid,
  source text,
  title text,
  deadline date,
  amount_max integer,
  similarity float
)
language sql
stable
as $$
  select
    o.id,
    o.source,
    o.title,
    o.deadline,
    o.amount_max,
    1 - (o.embedding <=> org_embedding) as similarity
  from public.opportunities o
  where o.active = true
    and (o.deadline is null or o.deadline > current_date)
    and 1 - (o.embedding <=> org_embedding) > match_threshold
  order by o.embedding <=> org_embedding
  limit match_count;
$$;
