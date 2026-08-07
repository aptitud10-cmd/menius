-- Aplicada a prod el 2026-08-07 (via MCP, nombre: get_order_tracking_customer_token)
--
-- get_order_tracking devuelve tambien customer_token para que /api/orders/status
-- pueda autorizar con el token de vista (el route lo quita del payload al cliente).

CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_number text, p_restaurant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',                      o.id,
    'order_number',            o.order_number,
    'status',                  o.status,
    'order_type',              o.order_type,
    'payment_method',          o.payment_method,
    'customer_name',           o.customer_name,
    'customer_phone',          o.customer_phone,
    'customer_email',          o.customer_email,
    'delivery_address',        o.delivery_address,
    'notes',                   o.notes,
    'total',                   o.total,
    'tax_amount',              o.tax_amount,
    'tip_amount',              o.tip_amount,
    'delivery_fee',            o.delivery_fee,
    'discount_amount',         o.discount_amount,
    'estimated_ready_minutes', o.estimated_ready_minutes,
    'created_at',              o.created_at,
    'updated_at',              o.updated_at,
    'scheduled_for',           o.scheduled_for,
    'table_name',              t.name,
    'driver_name',             o.driver_name,
    'driver_phone',            o.driver_phone,
    'driver_lat',              o.driver_lat,
    'driver_lng',              o.driver_lng,
    'driver_updated_at',       o.driver_updated_at,
    'driver_tracking_token',   o.driver_tracking_token,
    'customer_token',          o.customer_token,
    'driver_picked_up_at',     o.driver_picked_up_at,
    'driver_at_door_at',       o.driver_at_door_at,
    'driver_delivered_at',     o.driver_delivered_at,
    'delivery_photo_url',      o.delivery_photo_url,
    'order_items', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',           oi.id,
          'qty',          oi.qty,
          'unit_price',   oi.unit_price,
          'line_total',   oi.line_total,
          'notes',        oi.notes,
          'product_name', p.name,
          'variant_name', pv.name
        ) ORDER BY oi.id
      ), '[]'::jsonb)
      FROM order_items oi
      LEFT JOIN products p  ON p.id  = oi.product_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = o.id
    )
  )
  INTO v_result
  FROM orders o
  LEFT JOIN tables t ON t.id = o.table_id
  WHERE o.order_number  = p_order_number
    AND o.restaurant_id = p_restaurant_id
  LIMIT 1;

  RETURN v_result;
END;
$function$;
