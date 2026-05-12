-- Link orders to customers table for retention analytics, LTV, and cohort analysis
-- Adds customer_id FK to orders (nullable — populated by trigger on new orders)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_customer ON public.orders (restaurant_id, customer_id);

-- Trigger: auto-upsert customer and set customer_id on every new order
CREATE OR REPLACE FUNCTION public.link_order_to_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only process if we have at least a phone or email
  IF (NEW.customer_phone IS NULL OR NEW.customer_phone = '') AND
     (NEW.customer_email IS NULL OR NEW.customer_email = '') THEN
    RETURN NEW;
  END IF;

  -- Upsert customer and get their id
  v_customer_id := public.upsert_customer_from_order(
    NEW.restaurant_id,
    COALESCE(NEW.customer_name, ''),
    COALESCE(NEW.customer_email, ''),
    COALESCE(NEW.customer_phone, ''),
    COALESCE(NEW.delivery_address, ''),
    COALESCE(NEW.total, 0)
  );

  -- Stamp the FK on the order
  IF v_customer_id IS NOT NULL THEN
    NEW.customer_id := v_customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_order_to_customer ON public.orders;
CREATE TRIGGER trg_link_order_to_customer
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.link_order_to_customer();

-- Backfill existing orders: match by phone (most reliable identifier)
-- Runs as a single UPDATE; safe on large tables via the existing phone index
UPDATE public.orders o
SET customer_id = c.id
FROM public.customers c
WHERE o.customer_id IS NULL
  AND o.restaurant_id = c.restaurant_id
  AND o.customer_phone IS NOT NULL
  AND o.customer_phone <> ''
  AND c.phone = o.customer_phone;

-- Secondary backfill by email for orders without a phone match
UPDATE public.orders o
SET customer_id = c.id
FROM public.customers c
WHERE o.customer_id IS NULL
  AND o.restaurant_id = c.restaurant_id
  AND o.customer_email IS NOT NULL
  AND o.customer_email <> ''
  AND c.email = o.customer_email;
