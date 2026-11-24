-- Versión de la app Android del Counter (2026-11-24).
-- La escribe /api/counter/pause?counter=1 a partir del User-Agent del WebView
-- ("MeniusCounterApp/<versionName>"); /admin/restaurant la muestra y marca las
-- tablets que quedaron atrás. Sin esta columna, esa escritura falla sola (se loguea)
-- y la señal counter_seen_at sigue funcionando.
alter table public.restaurants
  add column if not exists counter_app_version text;

comment on column public.restaurants.counter_app_version is
  'versionName de la app del Counter en la última señal desde la app (null = nunca se abrió desde la app).';
