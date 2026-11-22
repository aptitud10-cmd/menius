-- Tanda 3 del Counter: cambiar el precio de un plato desde la tablet (con PIN del dueño).
-- Registro de cada cambio: qué plato, de cuánto a cuánto, desde dónde y cuándo.
-- Lo escribe solo el servidor (service role): sin políticas para anon/authenticated.
-- Si esta migración no está aplicada, el cambio de precio igual funciona; solo no queda registro
-- (la ruta /api/counter/price avisa a Sentry).

create table if not exists public.price_change_log (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  old_price     numeric not null,
  new_price     numeric not null,
  -- 'tablet' = tablet vinculada con el PIN del dueño · 'owner' = sesión del dueño (celular/computadora)
  source        text not null check (source in ('tablet', 'owner')),
  is_undo       boolean not null default false,
  session_id    uuid,
  user_id       uuid,
  created_at    timestamptz not null default now()
);

create index if not exists price_change_log_restaurant_idx
  on public.price_change_log (restaurant_id, created_at desc);
create index if not exists price_change_log_product_idx
  on public.price_change_log (product_id, created_at desc);

alter table public.price_change_log enable row level security;
revoke all on public.price_change_log from anon, authenticated;
