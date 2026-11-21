-- Aviso al dueño si la tablet del Counter se desconecta (auditoría Counter 2026-11-21, Tanda 2).
-- counter_seen_at: la última vez que una pantalla del Counter consultó /api/counter/pause
--   (lo hace cada 30 s; se guarda como mucho una vez por minuto).
-- counter_offline_alerted_at: último email de "tablet desconectada"; uno por corte.
-- El cron /api/cron/counter-offline avisa si lleva más de 10 min sin señal con la tienda abierta.
alter table public.restaurants
  add column if not exists counter_seen_at timestamptz,
  add column if not exists counter_offline_alerted_at timestamptz;

comment on column public.restaurants.counter_seen_at is
  'Última señal de una pantalla del Counter (cada ~1 min mientras está abierta).';
comment on column public.restaurants.counter_offline_alerted_at is
  'Último aviso por email de Counter desconectado. Si es >= counter_seen_at, ese corte ya se avisó.';
