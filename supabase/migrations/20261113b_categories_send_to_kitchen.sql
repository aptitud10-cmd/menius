-- 2026-11-13: la pantalla de cocina (KDS) y el ticket de cocina muestran solo lo que se
-- cocina. Cada categoría dice si va a cocina; bebidas y postres ya hechos no van (se
-- arman en el mostrador). Por defecto todo va, así ningún restaurante pierde platos.
alter table public.categories
  add column if not exists send_to_kitchen boolean not null default true;

comment on column public.categories.send_to_kitchen is
  'false = sus productos no aparecen en el KDS ni en el ticket de cocina (bebidas, postres, panadería).';
