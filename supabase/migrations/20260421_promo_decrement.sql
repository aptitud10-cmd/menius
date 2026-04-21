-- Companion to increment_promo_usage — used to roll back a promo counter
-- when the order INSERT fails after the increment already fired.
CREATE OR REPLACE FUNCTION decrement_promo_usage(p_code TEXT, p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotions
  SET current_uses = GREATEST(current_uses - 1, 0)
  WHERE code = p_code AND restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
