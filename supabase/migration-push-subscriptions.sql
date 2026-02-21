-- Push notification subscriptions for order tracking
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_order_id ON push_subscriptions(order_id);

-- Auto-delete subscriptions older than 7 days (they expire anyway)
-- Run periodically via cron or pg_cron
-- DELETE FROM push_subscriptions WHERE created_at < now() - INTERVAL '7 days';

-- RLS: allow anonymous inserts (customers subscribing)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service can read subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon can read own subscription" ON push_subscriptions
  FOR SELECT TO anon
  USING (true);
