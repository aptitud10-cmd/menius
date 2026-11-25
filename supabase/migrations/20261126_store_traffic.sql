-- Analítica del dueño: visitas, embudo y vistas por plato (Analítica → Tu tienda online).
--
-- Qué guarda: contadores por día (nada de personas). Una visita = una pestaña
-- abierta en la tienda ese día (la deduplica el navegador con sessionStorage).
-- No guarda IP, ni teléfono, ni cookies.
--
-- Quién escribe: solo el servidor (service role) a través de
-- track_store_event(). El público no puede llamar la función directo.
-- Quién lee: el dueño de la tienda (user_owns_restaurant).

-- 1) Embudo por día y por origen
CREATE TABLE public.store_traffic_daily (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day date NOT NULL,                       -- día local del restaurante
  source text NOT NULL CHECK (source IN ('table_qr', 'google', 'social', 'direct', 'other')),
  visits integer NOT NULL DEFAULT 0,       -- abrieron la tienda
  carts integer NOT NULL DEFAULT 0,        -- agregaron al menos un plato
  checkouts integer NOT NULL DEFAULT 0,    -- llegaron al checkout
  orders integer NOT NULL DEFAULT 0,       -- confirmaron un pedido
  PRIMARY KEY (restaurant_id, day, source)
);

-- 2) Cuántas veces se abrió cada plato
CREATE TABLE public.product_views_daily (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day date NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, day, product_id)
);

ALTER TABLE public.store_traffic_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY owners_read_store_traffic ON public.store_traffic_daily
  FOR SELECT TO authenticated USING (user_owns_restaurant(restaurant_id));
CREATE POLICY owners_read_product_views ON public.product_views_daily
  FOR SELECT TO authenticated USING (user_owns_restaurant(restaurant_id));
-- Sin policies de INSERT/UPDATE: nadie escribe con la anon key.

-- 3) Sumar un evento (una fila por día; si ya existe, +1)
CREATE OR REPLACE FUNCTION public.track_store_event(
  p_restaurant_id uuid,
  p_kind text,              -- 'visit' | 'cart' | 'checkout' | 'order' | 'product_view'
  p_source text DEFAULT 'direct',
  p_product_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_day date;
  v_source text := CASE WHEN p_source IN ('table_qr', 'google', 'social', 'direct', 'other') THEN p_source ELSE 'other' END;
BEGIN
  SELECT timezone INTO v_tz FROM restaurants WHERE id = p_restaurant_id AND is_active;
  IF NOT FOUND THEN RETURN; END IF;

  BEGIN
    v_day := (now() AT TIME ZONE coalesce(v_tz, 'America/New_York'))::date;
  EXCEPTION WHEN others THEN
    v_day := (now() AT TIME ZONE 'America/New_York')::date;   -- zona mal escrita
  END;

  IF p_kind = 'product_view' THEN
    -- El plato tiene que ser de esta tienda.
    IF p_product_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM products WHERE id = p_product_id AND restaurant_id = p_restaurant_id
    ) THEN RETURN; END IF;
    INSERT INTO product_views_daily AS t (restaurant_id, day, product_id, views)
    VALUES (p_restaurant_id, v_day, p_product_id, 1)
    ON CONFLICT (restaurant_id, day, product_id) DO UPDATE SET views = t.views + 1;

  ELSIF p_kind IN ('visit', 'cart', 'checkout', 'order') THEN
    INSERT INTO store_traffic_daily AS t (restaurant_id, day, source, visits, carts, checkouts, orders)
    VALUES (p_restaurant_id, v_day, v_source,
            (p_kind = 'visit')::int, (p_kind = 'cart')::int, (p_kind = 'checkout')::int, (p_kind = 'order')::int)
    ON CONFLICT (restaurant_id, day, source) DO UPDATE SET
      visits = t.visits + excluded.visits,
      carts = t.carts + excluded.carts,
      checkouts = t.checkouts + excluded.checkouts,
      orders = t.orders + excluded.orders;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.track_store_event(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_store_event(uuid, text, text, uuid) TO service_role;
