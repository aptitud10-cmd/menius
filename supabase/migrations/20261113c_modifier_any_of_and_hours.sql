-- Dos cosas que el motor de modificadores no sabía decir (Pedro 2026-11-13):
--
-- 1) "Mostrar este grupo si el cliente eligió CUALQUIERA de estas opciones".
--    "Cheese on Potatoes" tiene sentido con Home Fries, French Fries, Mashed…
--    pero no con Salad, Rice ni Grits. depends_on_option_id admite una sola
--    opción; atarlo a Home Fries escondía el queso justo cuando pedían
--    cheese fries.
--
--    depends_on_option_ids es ahora la lista completa ("cualquiera de estas").
--    depends_on_option_id se mantiene como espejo del primer elemento para que
--    un cliente viejo (pestaña abierta durante el deploy) siga funcionando con
--    la regla de antes. Lista vacía/NULL = se usa depends_on_option_id.
--    Igual que la columna original, no es FK: la valida el server action.
--
-- 2) Horario por opción: Grits se sirve de 5:30 a 11:00. Hora LOCAL del
--    restaurante (restaurants.timezone). Ambos NULL = siempre disponible.
--    Un horario que cruza la medianoche (from > until) vale de noche a mañana.
alter table public.modifier_groups
  add column if not exists depends_on_option_ids uuid[];

comment on column public.modifier_groups.depends_on_option_ids is
  'El grupo se muestra si está elegida CUALQUIERA de estas opciones. depends_on_option_id = espejo del primer elemento (compatibilidad).';

alter table public.modifier_options
  add column if not exists available_from time,
  add column if not exists available_until time;

comment on column public.modifier_options.available_from is
  'Hora local del restaurante desde la que se puede pedir esta opción. NULL con available_until NULL = siempre.';
