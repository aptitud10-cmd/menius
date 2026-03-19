-- Push notification subscriptions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  endpoint     text GENERATED ALWAYS AS (subscription->>'endpoint') STORED,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_order_endpoint
  ON push_subscriptions (order_id, endpoint);

CREATE INDEX IF NOT EXISTS push_subscriptions_order_id_idx
  ON push_subscriptions (order_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only service role (admin client) can read/write subscriptions
CREATE POLICY "admin_all" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
