-- ============================================================
-- MENIUS — Customers Table (CRM básico)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  address TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique per restaurant: phone OR email identifies a customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_restaurant_phone
  ON public.customers (restaurant_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_restaurant_email
  ON public.customers (restaurant_id, email)
  WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON public.customers (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_order ON public.customers (restaurant_id, last_order_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON public.customers (restaurant_id, total_spent DESC);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_owner_access" ON public.customers;
CREATE POLICY "customers_owner_access" ON public.customers
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT r.id FROM public.restaurants r WHERE r.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT r.id FROM public.restaurants r WHERE r.owner_user_id = (SELECT auth.uid())
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_customers_updated_at();

-- Function to upsert customer from an order (called from app code or trigger)
CREATE OR REPLACE FUNCTION public.upsert_customer_from_order(
  p_restaurant_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_order_total NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find by phone first, then by email
  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE restaurant_id = p_restaurant_id AND phone = p_phone;
  END IF;

  IF v_customer_id IS NULL AND p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE restaurant_id = p_restaurant_id AND email = p_email;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers SET
      name = COALESCE(NULLIF(p_name, ''), name),
      email = COALESCE(NULLIF(p_email, ''), email),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      address = COALESCE(NULLIF(p_address, ''), address),
      total_orders = total_orders + 1,
      total_spent = total_spent + COALESCE(p_order_total, 0),
      last_order_at = now()
    WHERE id = v_customer_id;
    RETURN v_customer_id;
  ELSE
    INSERT INTO public.customers (restaurant_id, name, email, phone, address, total_orders, total_spent, last_order_at)
    VALUES (p_restaurant_id, COALESCE(p_name, ''), NULLIF(p_email, ''), NULLIF(p_phone, ''), NULLIF(p_address, ''), 1, COALESCE(p_order_total, 0), now())
    RETURNING id INTO v_customer_id;
    RETURN v_customer_id;
  END IF;
END;
$$;
