-- 2026-11-08 — Cierre de la DB a la anon key (AUDIT_2026_11_08.md, prioridades 0 y 1).
--
-- Raíz: prod conservaba permisos por defecto de Supabase. Con la anon key (pública
-- en el bundle) PostgREST permitía saltarse todas las validaciones de las rutas.
-- Regla desde ahora: funciones, policies y buckets nacen cerrados (solo
-- service_role) y se abren explícitamente.
--
-- Verificado antes de aplicar: cada función/policy cerrada aquí solo la usa el
-- servidor con createAdminClient (service_role, bypassa RLS y grants).
-- Quedan ABIERTAS a propósito (las usa el cliente o las policies):
--   get_product_cooccurrences (MenuShell), user_owns_restaurant,
--   get_user_restaurant_id, current_session_is_device, generate_order_number y
--   upsert_customer_from_order (se llaman con el cliente anónimo en /api/orders).
-- Pendientes de un cambio de código previo: anyone_insert_reviews y
-- public_read_active_promotions (rutas públicas las usan con cliente anónimo).

begin;

-- ── 1. Funciones SECURITY DEFINER: solo service_role ──────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.exec_readonly_sql(text)',
    'public.get_order_tracking(text, uuid)',
    'public.adjust_loyalty_points(uuid, uuid, integer, text, text)',
    'public.redeem_loyalty_points(uuid, uuid, uuid, text, integer, numeric)',
    'public.increment_promo_usage(text, uuid)',
    'public.decrement_promo_usage(text, uuid)',
    'public.append_restaurant_tag(uuid, text)',
    'public.cleanup_old_notifications()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- SQL arbitrario: además de los grants, sin search_path mutable.
alter function public.exec_readonly_sql(text) set search_path = public;

-- ── 2. create_restaurant_with_subscription: la llama el usuario logueado ──────
-- Antes confiaba en p_owner_user_id y p_plan_id → se podía crear un restaurante
-- "de" otro usuario (y cambiarle su default_restaurant_id) o un trial de
-- cualquier plan. Ahora un usuario solo crea para sí mismo y siempre en trial Pro.
create or replace function public.create_restaurant_with_subscription(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_timezone text default 'America/Mexico_City',
  p_currency text default 'MXN',
  p_locale text default 'es',
  p_plan_id text default 'starter',
  p_notification_email text default null
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_restaurant_id uuid;
  v_now timestamptz := now();
  v_trial_end timestamptz := now() + interval '14 days';
  v_caller uuid := auth.uid();
  v_plan text := p_plan_id;
begin
  if v_caller is not null then
    -- Llamada de un usuario (no service_role): solo para sí mismo, trial del plan a la venta.
    if p_owner_user_id is distinct from v_caller then
      raise exception 'owner mismatch' using errcode = '42501';
    end if;
    v_plan := 'pro';
  end if;

  insert into public.restaurants (name, slug, owner_user_id, timezone, currency, locale, notification_email, notifications_enabled)
  values (p_name, p_slug, p_owner_user_id, p_timezone, p_currency, p_locale, p_notification_email, p_notification_email is not null)
  returning id into v_restaurant_id;

  insert into public.subscriptions (restaurant_id, plan_id, status, trial_start, trial_end, current_period_end)
  values (v_restaurant_id, v_plan, 'trialing', v_now, v_trial_end, v_trial_end);

  insert into public.profiles (user_id, full_name, role, default_restaurant_id)
  values (p_owner_user_id, '', 'owner', v_restaurant_id)
  on conflict (user_id) do update set default_restaurant_id = v_restaurant_id;

  return jsonb_build_object(
    'id', v_restaurant_id,
    'name', p_name,
    'slug', p_slug,
    'owner_user_id', p_owner_user_id,
    'timezone', p_timezone,
    'currency', p_currency,
    'locale', p_locale,
    'created_at', v_now
  );
end;
$function$;

revoke execute on function public.create_restaurant_with_subscription(text, text, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_restaurant_with_subscription(text, text, uuid, text, text, text, text, text) to authenticated, service_role;

-- ── 3. Policies de escritura abiertas (la app escribe con admin client) ───────
drop policy if exists public_insert_orders on public.orders;
drop policy if exists public_insert_order_items on public.order_items;
drop policy if exists public_insert_order_item_extras on public.order_item_extras;
drop policy if exists public_insert_order_item_modifiers on public.order_item_modifiers;
drop policy if exists owners_update_own_subscription on public.subscriptions;
drop policy if exists service_insert_subscriptions on public.subscriptions;
drop policy if exists "Service role can insert notifications" on public.dashboard_notifications;
drop policy if exists public_create_reservation on public.reservations;
-- handle_new_user (SECURITY DEFINER) y create_restaurant_with_subscription crean los perfiles.
drop policy if exists system_insert_profile on public.profiles;

-- ── 4. Storage ────────────────────────────────────────────────────────────────
-- product-images: cualquier cuenta podía borrar/pisar fotos de otras tiendas.
-- Todas las escrituras de la app van por service_role (tenant/upload, ai/*).
drop policy if exists "Authenticated users delete product images" on storage.objects;
drop policy if exists "Authenticated users update product images" on storage.objects;
-- menius-posts: escritura abierta a anon. Solo el cron (service_role) escribe.
drop policy if exists "Service insert menius-posts" on storage.objects;
drop policy if exists "Service update menius-posts" on storage.objects;
drop policy if exists "Service delete menius-posts" on storage.objects;

update storage.buckets
   set allowed_mime_types = array['image/*'], file_size_limit = 15728640
 where id in ('product-images', 'menius-posts');
-- order-photos queda sin límite de mime: la foto del driver sube con photo.type
-- del navegador, que puede venir vacío en algunos teléfonos.

-- ── 5. Defensa en profundidad ─────────────────────────────────────────────────
revoke truncate on all tables in schema public from anon, authenticated;
-- Funciones nuevas nacen cerradas: hay que dar EXECUTE explícito.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

commit;
