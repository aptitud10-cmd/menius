-- Formato de cada categoría en el menú del comensal, en el teléfono.
--   'grid' = tarjetas con foto grande (2 columnas): donde la foto es lo que hace elegir.
--   'list' = filas con miniatura a la derecha: platos parecidos que se eligen leyendo.
--   NULL   = automático: grilla en menús chicos, lista en catálogos grandes
--            (> 80 productos o > 12 categorías, el mismo umbral de "large catalog").
-- En tablet y desktop siempre es grilla: ahí la densidad no es problema.
alter table public.categories
  add column if not exists display_mode text
  check (display_mode in ('grid', 'list'));

comment on column public.categories.display_mode is
  'Formato en el teléfono: grid | list | NULL (automático según tamaño del menú).';
