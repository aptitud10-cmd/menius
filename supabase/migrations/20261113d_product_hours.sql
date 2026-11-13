-- Horario por plato (Pedro 2026-11-13): el oatmeal se sirve de 5:30 a 11:00, igual
-- que los grits. No sirve el horario de categoría: "Cereal" mezcla oatmeal (mañana)
-- con cereal frío (todo el día).
-- Hora LOCAL del restaurante (restaurants.timezone). Ambos NULL = siempre.
-- Misma semántica que modifier_options.available_from/until (lib/option-hours).
alter table public.products
  add column if not exists available_from time,
  add column if not exists available_until time;

comment on column public.products.available_from is
  'Hora local del restaurante desde la que se puede pedir el plato. NULL con available_until NULL = siempre.';
