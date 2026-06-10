-- Scope read access on order_item_extras / order_item_modifiers to the order's owner.
--
-- Found by the new RLS drift check: both tables had a SELECT policy named
-- "owners_read_*" but with USING(true), so any public/anon client could read every
-- order's extras and modifiers across all restaurants — what each customer ordered
-- ("sin gluten", size, add-ons) plus prices. Same misnamed-open pattern as the
-- order_items leak. No client reads these with anon (writes go through /api/orders
-- with the admin client), so scoping to ownership breaks nothing.
--
-- The join is two hops: order_item_(extras|modifiers).order_item_id -> order_items.id
-- -> orders.restaurant_id, gated by user_owns_restaurant().

DROP POLICY IF EXISTS "owners_read_order_item_extras" ON public.order_item_extras;
CREATE POLICY "owners_read_order_item_extras" ON public.order_item_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_extras.order_item_id
        AND user_owns_restaurant(o.restaurant_id)
    )
  );

DROP POLICY IF EXISTS "owners_read_order_item_modifiers" ON public.order_item_modifiers;
CREATE POLICY "owners_read_order_item_modifiers" ON public.order_item_modifiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_modifiers.order_item_id
        AND user_owns_restaurant(o.restaurant_id)
    )
  );
