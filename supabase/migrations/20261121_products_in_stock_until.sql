-- "Se acabó" con vuelta automática (Counter, pestaña Menú — auditoría 2026-11-21, Fase B).
-- in_stock = false + in_stock_until = instante → el cron /api/cron/daily-reset lo vuelve a poner
-- cuando pasa ese instante (el próximo corte del día del restaurante: Buccaneer 05:00 NY).
-- in_stock = false + in_stock_until NULL → agotado "hasta que lo vuelva a poner" (no vuelve solo).
alter table public.products
  add column if not exists in_stock_until timestamptz;

comment on column public.products.in_stock_until is
  'Si el plato está agotado (in_stock=false): cuándo vuelve solo. NULL = no vuelve solo. Se borra al volver a estar disponible.';

-- Cualquier camino que vuelva a poner el plato (panel, KDS, Hoy, el cron) borra la fecha,
-- para que una fecha vieja no lo devuelva sola si después lo agotan "hasta que lo vuelva a poner".
create or replace function public.products_clear_in_stock_until()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.in_stock is distinct from false then
    new.in_stock_until := null;
  end if;
  return new;
end;
$$;

drop trigger if exists products_clear_in_stock_until on public.products;
create trigger products_clear_in_stock_until
  before insert or update of in_stock, in_stock_until on public.products
  for each row execute function public.products_clear_in_stock_until();

-- El cron busca lo que ya tiene que volver (pocas filas: solo lo agotado con fecha).
create index if not exists products_in_stock_until_idx
  on public.products (in_stock_until)
  where in_stock = false and in_stock_until is not null;
