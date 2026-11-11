-- W2: los rollbacks de /api/orders BORRAN el pedido recién creado cuando algo
-- falla después de insertarlo (items, Stripe, canje de puntos). El stock solo
-- se devolvía al pasar a 'cancelled' (trg_restore_stock_on_cancel) y los puntos
-- canjeados al cancelar (20261111b) — un DELETE no dispara ninguno de los dos,
-- así que el stock descontado por trg_decrement_stock y los puntos canjeados se
-- perdían.
--
-- Este trigger corre ANTES del borrado (order_items todavía existen) y solo para
-- pedidos 'pending': son los que nunca llegaron a la cocina. Un pedido entregado
-- que se borre a mano (limpieza de datos) no toca stock ni puntos.

create or replace function public.restore_on_pending_order_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_points  integer;
begin
  if old.status is distinct from 'pending' then
    return old;
  end if;

  -- Stock: misma regla que restore_stock_on_cancel.
  update public.products p
     set stock_qty = p.stock_qty + oi.qty
    from public.order_items oi
   where oi.order_id = old.id
     and oi.product_id = p.id
     and p.track_inventory = true
     and p.stock_qty is not null;

  -- Puntos canjeados en este pedido (una sola devolución por pedido).
  select t.account_id, -t.points
    into v_account, v_points
    from public.loyalty_transactions t
   where t.restaurant_id = old.restaurant_id
     and t.order_id = old.id
     and t.type = 'redeem'
   limit 1;

  if v_account is not null and v_points is not null and v_points > 0
     and not exists (
       select 1 from public.loyalty_transactions r
        where r.restaurant_id = old.restaurant_id
          and r.order_id = old.id
          and r.type = 'redeem_refund'
     ) then
    insert into public.loyalty_transactions (restaurant_id, account_id, order_id, type, points, description)
    values (old.restaurant_id, v_account, old.id, 'redeem_refund', v_points,
            'Puntos devueltos: pedido #' || coalesce(old.order_number, '') || ' no se completó');
    update public.loyalty_accounts
       set points = points + v_points, updated_at = now()
     where id = v_account and restaurant_id = old.restaurant_id;
  end if;

  return old;
end;
$$;

revoke all on function public.restore_on_pending_order_delete() from public, anon, authenticated;

drop trigger if exists trg_restore_on_pending_order_delete on public.orders;
create trigger trg_restore_on_pending_order_delete
  before delete on public.orders
  for each row
  execute function public.restore_on_pending_order_delete();
