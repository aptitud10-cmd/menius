-- Add expiration timestamp to driver tracking tokens
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_token_expires_at timestamptz;
