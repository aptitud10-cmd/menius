-- Foto por opción (2026-11-22, Pedro): la sopa en el carrito y el checkout se ve según el
-- tamaño elegido (Cup / Bowl / Extra Large Bowl). La fotito del ítem usa la foto de la opción
-- elegida si tiene; si no, la del plato. NULL = sin foto (todas las existentes).

alter table public.modifier_options
  add column if not exists image_url text null;
