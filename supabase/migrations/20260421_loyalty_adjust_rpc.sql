-- Atomic loyalty point adjustment for the tenant dashboard.
-- Replaces the non-atomic Promise.all([update, insert]) pattern in loyalty/route.ts POST.
-- Uses FOR UPDATE to lock the account row, then updates balance and inserts transaction log
-- in the same transaction — no partial state possible.
CREATE OR REPLACE FUNCTION adjust_loyalty_points(
  p_account_id   UUID,
  p_restaurant_id UUID,
  p_points        INTEGER,
  p_type          TEXT,
  p_description   TEXT DEFAULT NULL
)
RETURNS TABLE(new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_points INTEGER;
  v_lifetime       INTEGER;
  v_new_points     INTEGER;
  v_new_lifetime   INTEGER;
BEGIN
  SELECT points, lifetime_points
  INTO v_current_points, v_lifetime
  FROM public.loyalty_accounts
  WHERE id = p_account_id AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'loyalty_account_not_found';
  END IF;

  v_new_points   := GREATEST(0, v_current_points + p_points);
  v_new_lifetime := v_lifetime + CASE WHEN p_points > 0 THEN p_points ELSE 0 END;

  UPDATE public.loyalty_accounts
  SET points = v_new_points, lifetime_points = v_new_lifetime, updated_at = NOW()
  WHERE id = p_account_id AND restaurant_id = p_restaurant_id;

  INSERT INTO public.loyalty_transactions (restaurant_id, account_id, type, points, description)
  VALUES (p_restaurant_id, p_account_id, p_type, p_points, p_description);

  RETURN QUERY SELECT v_new_points;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_loyalty_points(UUID, UUID, INTEGER, TEXT, TEXT)
  TO service_role;
