-- 2026-11-10 — Cierre de la DB, parte 2 (AUDIT_2026_11_08.md).
--
-- ⚠️ APLICAR DESPUÉS de promover el deploy que mueve estas rutas al admin client
-- (reviews POST, orders/validate-promo, /api/orders promo + generate_order_number).
-- Con el código viejo en prod, cerrar esto rompe reseñas y cupones.
--
-- Verificado antes de escribir:
--   - promotions: el dashboard y el chat leen con el cliente del dueño
--     (owners_manage_promotions); las rutas públicas ya usan service_role.
--   - reviews: la lectura pública sigue por anyone_read_visible_reviews.
--   - upsert_customer_from_order lo llama el trigger trg_link_order_to_customer
--     (BEFORE INSERT en orders, SECURITY INVOKER): authenticated lo necesita para
--     los pedidos que crea el dueño. Solo se cierra a anon.

begin;

-- Cualquiera insertaba reseñas directo por PostgREST (sin rate limit, honeypot
-- ni validación de pedido). Ahora solo /api/reviews con service_role.
drop policy if exists anyone_insert_reviews on public.reviews;

-- Con la anon key se listaban todos los cupones activos de todas las tiendas.
-- validate-promo responde solo si el código exacto existe.
drop policy if exists public_read_active_promotions on public.promotions;

do $$
declare f text;
begin
  foreach f in array array[
    'public.generate_order_number(uuid)',
    'public.generate_order_number()',
    'public.upsert_customer_from_order(uuid, text, text, text, text, numeric)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

commit;
