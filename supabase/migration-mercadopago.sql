-- MercadoPago integration columns on restaurants.
-- mp_access_token is stored encrypted at rest by Supabase/Postgres.
-- It is the restaurant's own MP Access Token (never the platform token).
-- mp_user_id is the MP numeric account ID, used to verify webhook authenticity.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_user_id      TEXT,
  ADD COLUMN IF NOT EXISTS mp_enabled      BOOLEAN NOT NULL DEFAULT false;
