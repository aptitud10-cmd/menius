-- Enable pgvector extension (run once per Supabase project)
create extension if not exists vector with schema extensions;

-- Code embeddings table for the admin dev tool
create table if not exists public.code_embeddings (
  id            uuid primary key default gen_random_uuid(),
  file_path     text not null,
  chunk_index   int  not null default 0,
  content       text not null,
  embedding     extensions.vector(1024),  -- voyage-code-3 dim=1024
  sha           text,                     -- GitHub blob SHA (for cache/invalidation)
  indexed_at    timestamptz default now(),
  unique (file_path, chunk_index)
);

-- Index for fast ANN similarity search
create index if not exists code_embeddings_embedding_idx
  on public.code_embeddings
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- Index for fast file_path lookups
create index if not exists code_embeddings_file_path_idx
  on public.code_embeddings (file_path);

-- Function to search code by embedding similarity
create or replace function public.search_code_embeddings(
  query_embedding extensions.vector(1024),
  match_count      int default 20,
  filter_path      text default null
)
returns table (
  id          uuid,
  file_path   text,
  chunk_index int,
  content     text,
  similarity  float
)
language sql stable
as $$
  select
    ce.id,
    ce.file_path,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.code_embeddings ce
  where
    (filter_path is null or ce.file_path ilike '%' || filter_path || '%')
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;

-- Dev tool conversation history
create table if not exists public.dev_conversations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  title        text,
  model        text default 'claude-opus-4-5',
  messages     jsonb default '[]'::jsonb,
  user_id      text not null  -- admin user id
);

create index if not exists dev_conversations_user_idx
  on public.dev_conversations (user_id, created_at desc);

-- RLS: only the admin can access (no RLS since only super-admin touches this table)
alter table public.code_embeddings enable row level security;
alter table public.dev_conversations enable row level security;

-- Service role bypasses RLS, so the admin API routes (using service role) always work.
-- No need for user-level policies.
