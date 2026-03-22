-- Driver delivery status timestamps
-- Adds three timestamp columns to track delivery progress without
-- introducing new order statuses (which would require state-machine changes).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS driver_picked_up_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_at_door_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_delivered_at   TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- Updated get_order_tracking RPC — includes new driver timestamp fields
-- Run this AFTER applying the column additions above.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_order_tracking(text, uuid);

CREATE OR REPLACE FUNCTION public.get_order_tracking(
  p_order_number  TEXT,
  p_restaurant_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',                   o.id,
    'order_number',         o.order_number,
    'status',               o.status,
    'order_type',           o.order_type,
    'payment_method',       o.payment_method,
    'customer_name',        o.customer_name,
    'customer_phone',       o.customer_phone,
    'customer_email',       o.customer_email,
    'delivery_address',     o.delivery_address,
    'notes',                o.notes,
    'total',                o.total,
    'tax_amount',           o.tax_amount,
    'tip_amount',           o.tip_amount,
    'delivery_fee',         o.delivery_fee,
    'discount_amount',      o.discount_amount,
    'estimated_ready_minutes', o.estimated_ready_minutes,
    'created_at',           o.created_at,
    'scheduled_for',        o.scheduled_for,
    'table_name',           t.name,
    -- Driver fields
    'driver_name',          o.driver_name,
    'driver_phone',         o.driver_phone,
    'driver_lat',           o.driver_lat,
    'driver_lng',           o.driver_lng,
    'driver_updated_at',    o.driver_updated_at,
    'driver_tracking_token', o.driver_tracking_token,
    'driver_picked_up_at',  o.driver_picked_up_at,
    'driver_at_door_at',    o.driver_at_door_at,
    'driver_delivered_at',  o.driver_delivered_at,
    -- Proof of delivery
    'delivery_photo_url',   o.delivery_photo_url
  )
  INTO v_result
  FROM orders o
  LEFT JOIN tables t ON t.id = o.table_id
  WHERE o.order_number   = p_order_number
    AND o.restaurant_id  = p_restaurant_id
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated roles so the client-side RPC call works
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text, uuid) TO anon, authenticated;
