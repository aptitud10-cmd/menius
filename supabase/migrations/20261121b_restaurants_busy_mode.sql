-- Modo ocupado del Counter compartido entre pantallas y con vuelta automática (auditoría 2026-11-21, Tanda 2).
-- Antes vivía solo en la memoria de una tablet: se perdía al recargar y la cocina (KDS) no lo veía.
-- busy_extra_minutes se suma al tiempo de preparación al aceptar; vale solo mientras busy_until > now().
-- Va en restaurants, al lado de orders_paused_until, y se lee con el mismo sondeo (/api/counter/pause).
alter table public.restaurants
  add column if not exists busy_extra_minutes smallint not null default 0
    check (busy_extra_minutes between 0 and 60),
  add column if not exists busy_until timestamptz;

comment on column public.restaurants.busy_extra_minutes is
  'Modo ocupado: minutos extra al tiempo de preparación. Solo vale mientras busy_until está en el futuro.';
comment on column public.restaurants.busy_until is
  'Cuándo se apaga solo el modo ocupado. NULL o pasado = normal.';
