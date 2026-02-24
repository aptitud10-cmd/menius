-- ============================================================
-- MIGRATION: Webhook Event Idempotency
-- Run in Supabase SQL Editor after the main migration
-- Prevents duplicate processing of Stripe webhook events
-- ============================================================

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_id ON processed_webhook_events(event_id);

-- Auto-cleanup: delete events older than 30 days (Stripe's retry window is 3 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: only service role can insert/select
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON processed_webhook_events
  FOR ALL USING (false);
