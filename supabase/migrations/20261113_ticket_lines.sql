-- Ticket/Counter/carrito: una línea por cosa, escrita como se dice en la cocina, con su precio
-- (Pedro 2026-11-13). Cada grupo dice CÓMO se escribe su opción:
--   ticket_label  = plantilla con {option}: "with {option} cheese", "Side {option}". NULL = el nombre tal cual.
--   ticket_layout = 'line'   → línea propia
--                   'indent' → línea con sangría, debajo de lo anterior ("with Swiss cheese" bajo los huevos)
--                   'inline' → se pega a la opción de la que depende ("Side Bacon / Crispy")
-- order_items.modifier_lines = foto de las líneas al crear el pedido [{text, price, indent}],
-- igual que product_name: el ticket de un pedido viejo no cambia si después se edita el menú.
alter table public.modifier_groups
  add column if not exists ticket_label text,
  add column if not exists ticket_layout text not null default 'line';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'modifier_groups_ticket_layout_check') then
    alter table public.modifier_groups
      add constraint modifier_groups_ticket_layout_check check (ticket_layout in ('line', 'indent', 'inline'));
  end if;
end $$;

alter table public.order_items
  add column if not exists modifier_lines jsonb;
