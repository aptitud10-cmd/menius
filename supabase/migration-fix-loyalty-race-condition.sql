-- Migration: Fix loyalty points race condition with atomic RPC
-- Date: 2026-04-14
-- Description: Replaces read-then-write pattern with atomic deduction using FOR UPDATE lock

CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_account_id UUID,
  p_restaurant_id UUID,
  p_order_id UUID,
  p_order_number TEXT,
  p_points_to_redeem INTEGER,
  p_peso_per_point NUMERIC
)
RETURNS TABLE(
  redeemed_points INTEGER,
  discount_amount NUMERIC,
  new_balance INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INTEGER;
  v_actual_redeem INTEGER;
  v_discount NUMERIC;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row to prevent concurrent redemptions (FOR UPDATE)
  SELECT la.points INTO v_current_points
  FROM loyalty_accounts la
  WHERE la.id = p_account_id
    AND la.restaurant_id = p_restaurant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Clamp to available balance
  v_actual_redeem := LEAST(p_points_to_redeem, v_current_points);
  
  IF v_actual_redeem <= 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 0::NUMERIC, v_current_points;
    RETURN;
  END IF;

  -- Calculate discount
  v_discount := FLOOR(v_actual_redeem * p_peso_per_point * 100) / 100;
  v_new_balance := GREATEST(0, v_current_points - v_actual_redeem);

  -- Atomic update
  UPDATE loyalty_accounts
  SET points = v_new_balance,
      updated_at = NOW()
  WHERE id = p_account_id
    AND restaurant_id = p_restaurant_id;

  -- Record transaction log
  INSERT INTO loyalty_transactions (
    restaurant_id, account_id, order_id, type, points, description
  ) VALUES (
    p_restaurant_id,
    p_account_id,
    p_order_id,
    'redeem',
    -v_actual_redeem,
    'Redeemed at checkout — order #' || p_order_number
  );

  RETURN QUERY SELECT v_actual_redeem, v_discount, v_new_balance;
END;
$$;

-- Grant execute to service role (used by adminDb in route handlers)
GRANT EXECUTE ON FUNCTION redeem_loyalty_points(UUID, UUID, UUID, TEXT, INTEGER, NUMERIC)
  TO service_role;
