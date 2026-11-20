-- Sopas y especiales del día (Pedro 2026-11-20, pestaña "Hoy" del Counter).
-- "Estar en el menú hoy" = products.is_active (lo que ya respeta el menú público y /api/orders).
-- La tablet enciende/apaga; al corte diario (restaurants.day_cutoff, hora local de restaurants.timezone)
-- el cron /api/cron/daily-reset apaga lo del día (salvo daily_always) y devuelve lo agotado.
alter table public.products
  add column if not exists daily_kind text check (daily_kind in ('soup', 'special')),
  add column if not exists daily_always boolean not null default false,
  add column if not exists daily_label text,
  add column if not exists daily_last_on date;

comment on column public.products.daily_kind is
  'soup | special | NULL (plato normal). Los que tienen valor aparecen en la pestaña Hoy del Counter.';
comment on column public.products.daily_always is
  'Fijo todos los días (Chicken Soup, Greek Lemon): el corte diario no lo apaga.';
comment on column public.products.daily_label is
  'Título de la tarjeta del especial ("Chef''s Special", "Today''s Special").';
comment on column public.products.daily_last_on is
  'Último día de trabajo en que estuvo puesto (para "Igual que ayer" y ordenar la biblioteca).';

alter table public.restaurants
  add column if not exists day_cutoff time not null default '05:00',
  add column if not exists daily_reset_on date;

comment on column public.restaurants.day_cutoff is
  'Hora local en que empieza el día de trabajo (Buccaneer es 24 h: 05:00).';
comment on column public.restaurants.daily_reset_on is
  'Día de trabajo del último reinicio de sopas/especiales (idempotencia del cron).';

create index if not exists products_daily_idx on public.products (restaurant_id) where daily_kind is not null;
