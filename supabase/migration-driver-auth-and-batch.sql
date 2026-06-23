-- Driver auth (login OTP) + multi-entrega (batch).
-- APLICADA A PROD 2026-06-23 vía MCP (migración inmutable — no editar).
-- 100% aditiva: columnas nullable, FK e índices. No altera datos existentes.

-- 1. Auth del driver: vínculo a auth.users (sesión persistente) + phone normalizado E.164.
alter table public.drivers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists phone_e164 text;

-- Índice único parcial POR restaurante: un mismo número puede repartir para
-- dos locales distintos (freelancer), pero no dos veces en el mismo local.
create unique index if not exists drivers_restaurant_phone_e164_uniq
  on public.drivers (restaurant_id, phone_e164)
  where phone_e164 is not null;

-- Lookup rápido por auth_user_id en el login (resolver driver desde el JWT).
create index if not exists drivers_auth_user_id_idx
  on public.drivers (auth_user_id)
  where auth_user_id is not null;

-- 2. Vínculo orden→driver para el batch (multi-entrega de un mismo repartidor).
-- Se mantiene driver_name/driver_phone (texto) por compat con el tracker actual.
alter table public.orders
  add column if not exists driver_id uuid references public.drivers(id) on delete set null;

-- Query del batch: entregas activas de un driver.
create index if not exists orders_driver_id_status_idx
  on public.orders (driver_id, status)
  where driver_id is not null;
