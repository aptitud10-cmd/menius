-- La base distingue la tablet del dueño en lo que es plata (auditoría
-- 2026-11-25, W2, opción B).
--
-- La tablet vinculada inicia sesión con la cuenta del dueño, y las políticas
-- RLS (user_owns_restaurant / auth.uid) no distinguen una de otra: con el token
-- de la tablet se podía hablar directo con la base y poner un plato a $0.01 sin
-- PIN, marcar un pedido como pagado o cambiar el total. La aplicación ya lo
-- impedía; esta es la segunda cerradura, en la base.
--
-- Reglas (solo para sesiones de tablet; el dueño en su celular/computadora y el
-- servidor con service role no cambian):
--   · Plata del pedido (total, impuesto, propina, descuento, cargo de envío,
--     estado y método de pago, intent): ninguna tablet la cambia. Tampoco borra
--     pedidos ni escribe order_items. El servidor lo hace con service role.
--   · Configuración de cobro del restaurante (métodos de pago, impuesto,
--     moneda, país, Stripe, Mercado Pago, Wompi, plan): ninguna tablet, ni con
--     el PIN (igual que PATCH /api/tenant/restaurant).
--   · Precios del menú (platos, variantes, extras, opciones): solo con el panel
--     abierto por PIN (así funciona hoy "cambiar precio" en el Counter). Sin
--     PIN, la tablet no cambia precios ni crea/borra platos.

-- Tablet con el panel cerrado (sin PIN vigente).
create or replace function public.current_session_is_locked_tablet()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.device_sessions d
    where d.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and not coalesce(d.panel_unlocked_until > now(), false)
  );
$$;

revoke all on function public.current_session_is_locked_tablet() from public, anon;
grant execute on function public.current_session_is_locked_tablet() to authenticated;

-- ── orders ──────────────────────────────────────────────────────────────
create or replace function public.guard_tablet_orders_money()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if public.current_session_is_device() then
      raise exception 'TABLET_MONEY_LOCKED: una tablet no borra pedidos' using errcode = '42501';
    end if;
    return old;
  end if;
  if (new.total, new.tax_amount, new.tip_amount, new.discount_amount, new.loyalty_discount,
      new.delivery_fee, new.payment_status, new.payment_method, new.payment_intent_id)
     is distinct from
     (old.total, old.tax_amount, old.tip_amount, old.discount_amount, old.loyalty_discount,
      old.delivery_fee, old.payment_status, old.payment_method, old.payment_intent_id)
     and public.current_session_is_device() then
    raise exception 'TABLET_MONEY_LOCKED: una tablet no cambia montos ni pagos del pedido' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_tablet_orders_money on public.orders;
create trigger guard_tablet_orders_money
  before update or delete on public.orders
  for each row execute function public.guard_tablet_orders_money();

-- ── order_items ─────────────────────────────────────────────────────────
create or replace function public.guard_tablet_order_items()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.current_session_is_device() then
    raise exception 'TABLET_MONEY_LOCKED: una tablet no escribe platos de un pedido' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_tablet_order_items on public.order_items;
create trigger guard_tablet_order_items
  before insert or update or delete on public.order_items
  for each row execute function public.guard_tablet_order_items();

-- ── restaurants ─────────────────────────────────────────────────────────
create or replace function public.guard_tablet_restaurant_payments()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if public.current_session_is_device() then
      raise exception 'TABLET_MONEY_LOCKED: una tablet no borra la tienda' using errcode = '42501';
    end if;
    return old;
  end if;
  if (new.payment_methods_enabled, new.tax_rate, new.tax_included, new.tax_label, new.currency,
      new.country_code, new.stripe_account_id, new.stripe_onboarding_complete, new.mp_access_token,
      new.mp_enabled, new.wompi_public_key, new.wompi_integrity_secret_enc, new.wompi_events_secret_enc,
      new.wompi_connected, new.commission_plan, new.custom_domain)
     is distinct from
     (old.payment_methods_enabled, old.tax_rate, old.tax_included, old.tax_label, old.currency,
      old.country_code, old.stripe_account_id, old.stripe_onboarding_complete, old.mp_access_token,
      old.mp_enabled, old.wompi_public_key, old.wompi_integrity_secret_enc, old.wompi_events_secret_enc,
      old.wompi_connected, old.commission_plan, old.custom_domain)
     and public.current_session_is_device() then
    raise exception 'TABLET_MONEY_LOCKED: una tablet no cambia cobros ni impuesto' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_tablet_restaurant_payments on public.restaurants;
create trigger guard_tablet_restaurant_payments
  before update or delete on public.restaurants
  for each row execute function public.guard_tablet_restaurant_payments();

-- ── precios del menú: solo con el panel abierto por PIN ──────────────────
create or replace function public.guard_tablet_menu_prices()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  changed boolean;
begin
  if tg_op in ('INSERT', 'DELETE') then
    changed := true;
  elsif tg_table_name = 'products' then
    changed := (new.price, new.cost_price, new.compare_at_price) is distinct from (old.price, old.cost_price, old.compare_at_price);
  elsif tg_table_name = 'product_extras' then
    changed := new.price is distinct from old.price;
  elsif tg_table_name = 'modifier_options' then
    changed := (new.price_delta, new.cost_price) is distinct from (old.price_delta, old.cost_price);
  else -- product_variants
    changed := new.price_delta is distinct from old.price_delta;
  end if;
  if changed and public.current_session_is_locked_tablet() then
    raise exception 'TABLET_MONEY_LOCKED: cambiar precios o platos desde la tablet pide el PIN del dueño' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_tablet_menu_prices on public.products;
create trigger guard_tablet_menu_prices
  before insert or update or delete on public.products
  for each row execute function public.guard_tablet_menu_prices();

drop trigger if exists guard_tablet_menu_prices on public.product_variants;
create trigger guard_tablet_menu_prices
  before insert or update or delete on public.product_variants
  for each row execute function public.guard_tablet_menu_prices();

drop trigger if exists guard_tablet_menu_prices on public.product_extras;
create trigger guard_tablet_menu_prices
  before insert or update or delete on public.product_extras
  for each row execute function public.guard_tablet_menu_prices();

drop trigger if exists guard_tablet_menu_prices on public.modifier_options;
create trigger guard_tablet_menu_prices
  before insert or update or delete on public.modifier_options
  for each row execute function public.guard_tablet_menu_prices();
