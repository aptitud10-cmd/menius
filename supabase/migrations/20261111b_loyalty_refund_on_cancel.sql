-- W6: los puntos canjeados en un pedido que después se cancela se devuelven.
-- Antes se descontaban al crear el pedido (redeem_loyalty_points) y nunca
-- volvían: pedido rechazado por el restaurante, pago online fallido o vencido.
-- Un trigger cubre TODOS los caminos que cancelan (Counter, KDS, crons,
-- webhooks) dentro de la misma transacción del cambio de estado.

begin;

alter table public.loyalty_transactions drop constraint if exists loyalty_transactions_type_check;
alter table public.loyalty_transactions add constraint loyalty_transactions_type_check
  check (type = any (array['earn', 'redeem', 'redeem_refund', 'adjust', 'referral_earn', 'referral_bonus', 'birthday_bonus', 'welcome']));

-- Una sola devolución por pedido (como loyalty_tx_redeem_once / earn_once).
create unique index if not exists loyalty_tx_redeem_refund_once
  on public.loyalty_transactions (restaurant_id, order_id)
  where type = 'redeem_refund' and order_id is not null;

create or replace function public.refund_loyalty_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_points  integer;
  v_ins     uuid;
begin
  select t.account_id, -t.points
    into v_account, v_points
  from public.loyalty_transactions t
  where t.restaurant_id = new.restaurant_id
    and t.order_id = new.id
    and t.type = 'redeem'
  limit 1;

  if v_account is null or v_points is null or v_points <= 0 then
    return new;
  end if;

  -- El índice único hace la devolución idempotente: si ya existe, no suma otra vez.
  insert into public.loyalty_transactions (restaurant_id, account_id, order_id, type, points, description)
  values (new.restaurant_id, v_account, new.id, 'redeem_refund', v_points,
          'Puntos devueltos: pedido #' || coalesce(new.order_number, '') || ' cancelado')
  on conflict do nothing
  returning id into v_ins;

  if v_ins is null then
    return new;
  end if;

  update public.loyalty_accounts
     set points = points + v_points, updated_at = now()
   where id = v_account and restaurant_id = new.restaurant_id;

  return new;
end;
$$;

revoke all on function public.refund_loyalty_on_cancel() from public, anon, authenticated;

drop trigger if exists trg_refund_loyalty_on_cancel on public.orders;
create trigger trg_refund_loyalty_on_cancel
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.refund_loyalty_on_cancel();

commit;
