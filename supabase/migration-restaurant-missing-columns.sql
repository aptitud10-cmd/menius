-- APLICADA A PROD 2026-08-06 vía MCP (migración inmutable — no editar)
-- Columnas que el código ya usaba pero nunca existieron en prod (42703):
-- tags (email-automations), mp_* (MercadoPago), google_business_url (settings
-- PATCH allowlist), domain_verified (domain/verify).
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mp_access_token text,
  ADD COLUMN IF NOT EXISTS mp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS domain_verified boolean NOT NULL DEFAULT false;

-- RPC que email-automations invoca para la idempotencia de sus tags.
CREATE OR REPLACE FUNCTION public.append_restaurant_tag(p_restaurant_id uuid, p_tag text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE restaurants
  SET tags = tags || to_jsonb(p_tag)
  WHERE id = p_restaurant_id
    AND NOT (tags ? p_tag);
$$;

REVOKE ALL ON FUNCTION public.append_restaurant_tag(uuid, text) FROM anon, authenticated;
