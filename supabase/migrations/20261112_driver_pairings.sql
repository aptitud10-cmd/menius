-- Vinculación de la app nativa del repartidor con un código (mismo patrón que
-- device_pairings del Counter, en tabla APARTE a propósito: un código de
-- repartidor nunca puede terminar dando una sesión de tablet/dueño, ni al revés).
--
-- Ciclo de una fila:
--   pending   → la app la crea (POST /api/driver/pair/start); vence en 5 min
--   approved  → el dueño escribe el código al lado del repartidor en Equipo
--               (POST /api/tenant/drivers/link); expires_at = now()+2min para que
--               la app lo reclame
--   consumed  → la app probó tener el secreto y recibió su sesión
--               (POST /api/driver/pair/poll). Un solo uso.
--
-- La app guarda un secreto aleatorio de 32 bytes; acá solo vive su SHA-256. Saber
-- el código alcanza para APROBAR, nunca para RECLAMAR la sesión.
--
-- Sin políticas RLS a propósito: todo pasa por el service role en esas rutas.

create table if not exists public.driver_pairings (
  id            uuid primary key default gen_random_uuid(),
  code          text not null check (code ~ '^[A-Z2-9]{6}$'),
  secret_hash   text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'consumed')),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  driver_id     uuid references public.drivers(id) on delete cascade,
  approved_by   uuid references auth.users(id) on delete cascade,
  approved_at   timestamptz,
  consumed_at   timestamptz,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists driver_pairings_live_code_idx
  on public.driver_pairings (code)
  where status in ('pending', 'approved');

create index if not exists driver_pairings_expires_idx
  on public.driver_pairings (expires_at);

alter table public.driver_pairings enable row level security;

comment on table public.driver_pairings is
  'Códigos cortos para vincular la app del repartidor. Solo service role (RLS sin políticas).';

revoke all on public.driver_pairings from anon, authenticated;
