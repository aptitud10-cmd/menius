-- Migration: Atomic loyalty points redemption via FOR UPDATE lock
-- Prevents double-spend race condition on concurrent order submissions.
-- Apply via: Supabase Dashboard > SQL Editor > Run

CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_account_id    uuid,
  p_restaurant_id uuid,
  p_order_id      uuid,
  p_order_number  text,
  p_points_to_redeem integer,
  p_peso_per_point   numeric
)
RETURNS TABLE (redeemed_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points integer;
  v_new_points     integer;
BEGIN
  -- Lock the row to prevent concurrent redemptions reading stale balance
  SELECT points INTO v_current_points
  FROM loyalty_accounts
  WHERE id = p_account_id
    AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  -- If account not found or insufficient points, return 0 (no-op)
  IF v_current_points IS NULL OR v_current_points < p_points_to_redeem THEN
    RETURN QUERY SELECT 0::integer;
    RETURN;
  END IF;

  v_new_points := GREATEST(0, v_current_points - p_points_to_redeem);

  -- Deduct points atomically
  UPDATE loyalty_accounts
  SET points     = v_new_points,
      updated_at = now()
  WHERE id = p_account_id
    AND restaurant_id = p_restaurant_id;

  -- Record transaction
  INSERT INTO loyalty_transactions (
    restaurant_id,
    account_id,
    order_id,
    type,
    points,
    description
  ) VALUES (
    p_restaurant_id,
    p_account_id,
    p_order_id,
    'redeem',
    -p_points_to_redeem,
    'Redeemed at checkout — order #' || p_order_number
  );

  RETURN QUERY SELECT p_points_to_redeem;
END;
$$;

-- Grant execute to service role (used by adminDb in route handlers)
GRANT EXECUTE ON FUNCTION redeem_loyalty_points(uuid, uuid, uuid, text, integer, numeric)
  TO service_role;
