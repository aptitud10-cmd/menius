-- Device pairing for the MENIUS Counter tablet ("Square device codes" pattern).
--
-- The tablet never types a password: it shows a short code, the owner approves it
-- from their own phone/computer (already signed in), and the tablet is signed in
-- as that owner. This also covers restaurants that signed up with Google — Google
-- blocks its OAuth screen inside WebViews, so they had no way into the app.
--
-- Lifecycle of a row:
--   pending   → created by the tablet (POST /api/devices/pair/start); expires in 5 min
--   approved  → the owner typed/scanned the code (POST /api/devices/pair/approve);
--               expires_at is pushed to now()+2min so the tablet can claim it
--   consumed  → the tablet proved it holds the secret and got its session
--               (POST /api/devices/pair/poll). Single use.
--
-- The tablet holds a random 32-byte secret; only its SHA-256 is stored. Knowing the
-- 6-char code is enough to APPROVE (that's the point) but never enough to CLAIM the
-- session — claiming needs the secret that only the tablet that created the row has.
--
-- No RLS policies on purpose: every access goes through the service-role client in
-- the API routes above. RLS enabled + zero policies = invisible to anon/authenticated.

create table if not exists public.device_pairings (
  id            uuid primary key default gen_random_uuid(),
  code          text not null check (code ~ '^[A-Z2-9]{6}$'),
  secret_hash   text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'consumed')),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  approved_by   uuid references auth.users(id) on delete cascade,
  approved_at   timestamptz,
  consumed_at   timestamptz,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

-- A code may only be live once. Consumed rows keep their code for the audit trail,
-- so uniqueness is scoped to rows that can still be approved or claimed.
create unique index if not exists device_pairings_live_code_idx
  on public.device_pairings (code)
  where status in ('pending', 'approved');

create index if not exists device_pairings_expires_idx
  on public.device_pairings (expires_at);

alter table public.device_pairings enable row level security;

comment on table public.device_pairings is
  'Short-lived pairing codes for the Counter tablet app. Service-role only (RLS on, no policies).';

-- Defense in depth: RLS with zero policies already hides every row, but Supabase
-- grants anon/authenticated table privileges by default. Take them away too.
revoke all on public.device_pairings from anon, authenticated;
