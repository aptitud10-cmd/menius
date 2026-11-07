-- Sesiones de tablet: la sesión que nace de una vinculación por código queda marcada
-- acá por su session_id (claim del JWT). El servidor la reconoce y le permite solo
-- el Counter — nada de cobros, reembolsos, menú, configuración ni admin.
-- El dueño ve sus tablets y puede desconectarlas (borra la sesión de auth: el
-- refresh token muere en cascada y getUser() deja de aceptarla).

create table if not exists public.device_sessions (
  session_id    uuid primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null,
  pairing_id    uuid references public.device_pairings(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists device_sessions_restaurant_idx on public.device_sessions (restaurant_id);

alter table public.device_sessions enable row level security;
revoke all on public.device_sessions from anon, authenticated;

-- ¿La sesión que hace esta request es una tablet? Lee el session_id del JWT ya
-- verificado por PostgREST: el cliente no puede elegir qué sesión consultar.
create or replace function public.current_session_is_device()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.device_sessions d
    where d.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  );
$$;

revoke all on function public.current_session_is_device() from public, anon;
grant execute on function public.current_session_is_device() to authenticated;

-- Tablets vivas de un restaurante (solo service role).
create or replace function public.list_device_sessions(p_restaurant_id uuid)
returns table (session_id uuid, created_at timestamptz, last_active_at timestamptz, user_agent text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.session_id,
         d.created_at,
         greatest(s.updated_at, s.refreshed_at at time zone 'UTC', s.created_at),
         s.user_agent
  from public.device_sessions d
  join auth.sessions s on s.id = d.session_id
  where d.restaurant_id = p_restaurant_id
  order by d.created_at desc;
$$;

revoke all on function public.list_device_sessions(uuid) from public, anon, authenticated;
grant execute on function public.list_device_sessions(uuid) to service_role;

-- Desconectar una tablet: solo si esa sesión es una tablet de ESE restaurante.
create or replace function public.revoke_device_session(p_restaurant_id uuid, p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.sessions s
  using public.device_sessions d
  where s.id = p_session_id
    and d.session_id = s.id
    and d.restaurant_id = p_restaurant_id;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.revoke_device_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_device_session(uuid, uuid) to service_role;
