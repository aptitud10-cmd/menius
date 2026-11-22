-- Opción enganchada a un plato (2026-11-22, Pedro): "Soup or salad?" → Soup → "Which soup?"
-- ofrece las sopas de la biblioteca; cada opción apunta a su producto y se ofrece solo si
-- ese plato está puesto hoy en el Counter (products.is_active / in_stock). Ver
-- src/lib/linked-options.ts. NULL = opción común (todas las existentes).
--
-- on delete set null: borrar el plato no borra la opción (los pedidos viejos la citan);
-- queda como opción común y el dueño la saca a mano.

alter table public.modifier_options
  add column if not exists linked_product_id uuid null
  references public.products(id) on delete set null;

create index if not exists modifier_options_linked_product_id_idx
  on public.modifier_options (linked_product_id)
  where linked_product_id is not null;
