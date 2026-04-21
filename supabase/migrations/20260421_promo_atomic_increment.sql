-- Replaces increment_promo_usage with an atomic version that:
-- 1. Locks the promo row (FOR UPDATE) to prevent race conditions on concurrent orders
-- 2. Re-checks max_uses inside the transaction so the limit is never exceeded
-- 3. Returns TRUE if usage was incremented, FALSE if the promo is at its limit or inactive
CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT, p_restaurant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo RECORD;
BEGIN
  SELECT id, max_uses, current_uses, is_active, expires_at
  INTO v_promo
  FROM public.promotions
  WHERE code = p_code AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN FALSE;
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN FALSE;
  END IF;

  UPDATE public.promotions
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
