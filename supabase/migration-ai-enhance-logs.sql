-- AI enhance/generate usage log table
-- Used for rate-limiting demo users by IP

create table if not exists public.ai_enhance_logs (
  id             uuid primary key default gen_random_uuid(),
  ip             text not null,
  restaurant_id  uuid references public.restaurants(id) on delete set null,
  type           text not null default 'enhance', -- 'enhance' | 'generate' | 'describe'
  created_at     timestamptz not null default now()
);

-- Index for fast rate-limit queries
create index if not exists ai_enhance_logs_ip_created_at_idx
  on public.ai_enhance_logs (ip, created_at desc);

create index if not exists ai_enhance_logs_ip_type_created_at_idx
  on public.ai_enhance_logs (ip, type, created_at desc);

-- RLS: only service role can insert/read (used via admin client)
alter table public.ai_enhance_logs enable row level security;

-- No public policies — only accessible via service role key (admin client)
