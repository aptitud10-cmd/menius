-- API Keys for external integrations (Business plan)
CREATE TABLE IF NOT EXISTS api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  key_hash        text NOT NULL UNIQUE,
  prefix          text NOT NULL,           -- First 12 chars shown in UI
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  last_used_at    timestamptz,

  CONSTRAINT api_keys_restaurant_name_key UNIQUE (restaurant_id, name)
);

-- Index for fast lookup by hash during API auth
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = true;

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own keys
CREATE POLICY "api_keys_owner" ON api_keys
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  );
