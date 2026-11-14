-- Botón "Panel del dueño" desde el Counter (brief sección 7).
--
-- La tablet vinculada con código solo puede usar el Counter. Con el PIN del dueño
-- se desbloquea el panel por 10 min (se renueva con actividad). El desbloqueo vive
-- en device_sessions.panel_unlocked_until: el servidor decide, no el navegador.
--
-- Nada de esto lo puede escribir el cliente: las tablas nuevas no tienen políticas
-- (solo service role) y la función nueva solo LEE la sesión del JWT verificado.
-- current_session_is_device() NO cambia: sigue diciendo "es tablet" aunque el panel
-- esté abierto, así las acciones que la usan (crear tienda, reseed, vincular y
-- desconectar tablets, dominio) siguen cerradas para la tablet.

alter table public.device_sessions
  add column if not exists panel_unlocked_until timestamptz;

-- PIN del panel, uno por restaurante. Hash scrypt con sal (lib/panel-pin.ts), nunca el PIN.
create table if not exists public.restaurant_panel_pins (
  restaurant_id   uuid primary key references public.restaurants(id) on delete cascade,
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

alter table public.restaurant_panel_pins enable row level security;
revoke all on public.restaurant_panel_pins from anon, authenticated;

-- Registro de cada intento de entrar al panel desde una tablet.
create table if not exists public.panel_access_log (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id    uuid,
  success       boolean not null,
  created_at    timestamptz not null default now()
);

create index if not exists panel_access_log_restaurant_idx
  on public.panel_access_log (restaurant_id, created_at desc);

alter table public.panel_access_log enable row level security;
revoke all on public.panel_access_log from anon, authenticated;

-- La sesión actual, si es una tablet: su tienda y si tiene el panel abierto ahora.
-- Lee el session_id del JWT ya verificado: el cliente no elige qué sesión consulta.
create or replace function public.current_device_session()
returns table (session_id uuid, restaurant_id uuid, panel_unlocked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.session_id,
         d.restaurant_id,
         coalesce(d.panel_unlocked_until > now(), false)
  from public.device_sessions d
  where d.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  limit 1;
$$;

revoke all on function public.current_device_session() from public, anon;
grant execute on function public.current_device_session() to authenticated;

-- Intento fallido, atómico: suma 1 y al 5.º bloquea 5 min (y vuelve a 0).
-- Devuelve cuántos intentos quedan y hasta cuándo está bloqueado. Solo service role.
create or replace function public.register_panel_pin_failure(p_restaurant_id uuid)
returns table (attempts_left integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  lock_at timestamptz;
begin
  update public.restaurant_panel_pins p
     set failed_attempts = case when p.failed_attempts + 1 >= 5 then 0 else p.failed_attempts + 1 end,
         locked_until    = case when p.failed_attempts + 1 >= 5 then now() + interval '5 minutes' else p.locked_until end
   where p.restaurant_id = p_restaurant_id
  returning p.failed_attempts, p.locked_until into n, lock_at;

  if n = 0 and lock_at > now() then
    return query select 0, lock_at;
  else
    return query select greatest(5 - coalesce(n, 0), 0), null::timestamptz;
  end if;
end;
$$;

revoke all on function public.register_panel_pin_failure(uuid) from public, anon, authenticated;
grant execute on function public.register_panel_pin_failure(uuid) to service_role;
