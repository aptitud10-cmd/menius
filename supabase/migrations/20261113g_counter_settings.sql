-- Counter: tema de sonido, tema de pantalla y volumen por restaurante (FASE 1 del
-- brief docs/BRIEF-SONIDOS-COUNTER.md).
--
-- Tabla aparte y NO columnas en restaurants, a propósito:
--   * restaurants tiene una policy de lectura pública (public_read_restaurant_by_slug)
--     y no está en la publicación de Realtime: publicarla para sincronizar las
--     tablets mandaría la fila entera a cualquier suscriptor.
--   * restaurants usa grants de UPDATE por columna: columnas nuevas ahí quedan
--     sin permiso de escritura salvo grant explícito.
--   * El Counter lee restaurants con select explícito: una columna nueva ahí, con
--     el deploy antes que la migración, rompe el Counter (42703).
-- Sin fila = valores por defecto (firma / menius / 80 / 30 s): no hace falta backfill.

create table if not exists public.counter_settings (
  restaurant_id        uuid primary key references public.restaurants(id) on delete cascade,
  sound_theme          text not null default 'firma' check (sound_theme in (
    'firma','aurora','cristal','lounge','reloj','arpa','handpan','mozart','beethoven','bach',
    'oda-alegria','chonta','diner','entertainer','marcha-turca','guillermo-tell','rey-montana','danubio','cucaracha')),
  sound_volume         smallint not null default 80 check (sound_volume between 0 and 100),
  screen_theme         text not null default 'menius' check (screen_theme in (
    'menius','midnight','forest','ocean','sunset','royal','espresso','neon','daylight','diner','blush','mint')),
  custom_accent        text check (custom_accent ~ '^#[0-9A-Fa-f]{6}$'),
  staff_can_customize  boolean not null default true,
  urgent_after_seconds smallint not null default 30 check (urgent_after_seconds between 10 and 600),
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);

alter table public.counter_settings enable row level security;

create policy counter_settings_owner_select on public.counter_settings
  for select to authenticated
  using (restaurant_id in (select id from public.restaurants where owner_user_id = (select auth.uid())));

create policy counter_settings_owner_insert on public.counter_settings
  for insert to authenticated
  with check (restaurant_id in (select id from public.restaurants where owner_user_id = (select auth.uid())));

create policy counter_settings_owner_update on public.counter_settings
  for update to authenticated
  using (restaurant_id in (select id from public.restaurants where owner_user_id = (select auth.uid())))
  with check (restaurant_id in (select id from public.restaurants where owner_user_id = (select auth.uid())));

revoke all on public.counter_settings from anon;
revoke delete, truncate, references, trigger on public.counter_settings from authenticated;

-- Realtime respeta RLS: solo las sesiones del dueño (y sus tablets) reciben el cambio.
alter publication supabase_realtime add table public.counter_settings;
