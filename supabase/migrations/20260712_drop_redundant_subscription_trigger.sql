-- ============================================================
-- FIX: Onboarding roto — "duplicate key value violates unique
-- constraint subscriptions_restaurant_id_key" al crear tienda.
--
-- Causa: el trigger `on_restaurant_created_subscription` (AFTER INSERT
-- en restaurants) crea una subscripción automáticamente, y el RPC
-- `create_restaurant_with_subscription` también inserta la suya en la
-- misma transacción → colisión en UNIQUE(restaurant_id) → el INSERT del
-- RPC revienta → rollback total → onboarding falla.
--
-- Fuente de verdad = el RPC (atómico, plan_id correcto 'starter',
-- crea subscription + profile juntos). El trigger es redundante y además
-- inserta plan_id='basic' (alias legacy). Se elimina.
-- ============================================================

DROP TRIGGER IF EXISTS on_restaurant_created_subscription ON public.restaurants;
DROP FUNCTION IF EXISTS public.handle_new_restaurant_subscription();
