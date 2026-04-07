export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

// Full migration SQL — returned so the frontend can show it
const MIGRATION_SQL = `-- 1. Enable pgvector extension
create extension if not exists vector with schema extensions;

-- 2. Code embeddings table
create table if not exists public.code_embeddings (
  id            uuid primary key default gen_random_uuid(),
  file_path     text not null,
  chunk_index   int  not null default 0,
  content       text not null,
  embedding     extensions.vector(1024),
  sha           text,
  indexed_at    timestamptz default now(),
  unique (file_path, chunk_index)
);

-- 3. IVFFlat index for ANN search
create index if not exists code_embeddings_embedding_idx
  on public.code_embeddings
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create index if not exists code_embeddings_file_path_idx
  on public.code_embeddings (file_path);

-- 4. Semantic search function
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

-- 5. Read-only SQL execution function (for query_database tool)
create or replace function public.exec_readonly_sql(sql_query text)
returns jsonb language plpgsql security definer as $$
declare result jsonb;
begin
  set local statement_timeout = '5s';
  execute sql_query into result;
  return result;
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

-- 6. Conversation history table
create table if not exists public.dev_conversations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  title        text,
  model        text default 'claude-sonnet-4-5',
  messages     jsonb default '[]'::jsonb,
  user_id      text not null
);

create index if not exists dev_conversations_user_idx
  on public.dev_conversations (user_id, created_at desc);

-- 7. Enable RLS (service role bypasses it automatically)
alter table public.code_embeddings enable row level security;
alter table public.dev_conversations enable row level security;`;

async function checkStatus(db: ReturnType<typeof createAdminClient>) {
  const checks: Record<string, boolean> = {
    code_embeddings: false,
    dev_conversations: false,
    search_function: false,
    exec_function: false,
    anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    github_token: !!process.env.GITHUB_TOKEN,
    voyage_key: !!process.env.VOYAGE_API_KEY,
    tavily_key: !!process.env.TAVILY_API_KEY,
    vercel_token: !!process.env.VERCEL_TOKEN,
    gemini_key: !!process.env.GEMINI_API_KEY,
    sentry_token: !!process.env.SENTRY_AUTH_TOKEN,
    github_webhook_secret: !!(process.env.GITHUB_WEBHOOK_SECRET ?? process.env.CRON_SECRET),
  };

  // Check tables
  try {
    const { error: e1 } = await db.from('code_embeddings').select('id').limit(1);
    checks.code_embeddings = !e1;
  } catch { /* table missing */ }

  try {
    const { error: e2 } = await db.from('dev_conversations').select('id').limit(1);
    checks.dev_conversations = !e2;
  } catch { /* table missing */ }

  // Check functions (try calling them with dummy args)
  try {
    const { error: e3 } = await db.rpc('search_code_embeddings', {
      query_embedding: JSON.stringify(new Array(1024).fill(0)),
      match_count: 1,
    });
    checks.search_function = !e3;
  } catch { /* function missing */ }

  try {
    const { error: e4 } = await db.rpc('exec_readonly_sql', { sql_query: 'select 1' });
    checks.exec_function = !e4;
  } catch { /* function missing */ }

  // Index status
  let indexedChunks = 0;
  let indexedFiles = 0;
  let lastIndexed: string | null = null;
  if (checks.code_embeddings) {
    const { count } = await db.from('code_embeddings').select('*', { count: 'exact', head: true });
    indexedChunks = count ?? 0;
    const { data: fp } = await db.from('code_embeddings').select('file_path').limit(10000);
    indexedFiles = new Set((fp ?? []).map(r => r.file_path)).size;
    const { data: li } = await db.from('code_embeddings').select('indexed_at').order('indexed_at', { ascending: false }).limit(1).single();
    lastIndexed = li?.indexed_at ?? null;
  }

  return { checks, indexedChunks, indexedFiles, lastIndexed };
}

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const db = createAdminClient();
    const status = await checkStatus(db);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';
    const supabaseSqlUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : 'https://supabase.com/dashboard';

    return NextResponse.json({
      ...status,
      migrationSql: MIGRATION_SQL,
      supabaseSqlUrl,
      allReady: Object.values(status.checks).every(Boolean),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

// POST: trigger indexing after setup
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { action } = await request.json().catch(() => ({}));

    if (action === 'check') {
      const db = createAdminClient();
      const status = await checkStatus(db);
      return NextResponse.json(status);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
