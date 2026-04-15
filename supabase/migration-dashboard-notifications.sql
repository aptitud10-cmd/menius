-- Migration: Dashboard notifications system
-- Date: 2026-04-14

CREATE TABLE IF NOT EXISTS dashboard_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_order',
    'order_cancelled',
    'low_stock',
    'review_received',
    'payment_received',
    'subscription',
    'system',
    'milestone'
  )),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by restaurant + unread
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_unread 
  ON dashboard_notifications(restaurant_id, is_read, created_at DESC);

-- Auto-cleanup: delete notifications older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM dashboard_notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- RLS: restaurant owners can only see their own notifications
ALTER TABLE dashboard_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant notifications"
  ON dashboard_notifications
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT default_restaurant_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications (mark read)"
  ON dashboard_notifications
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT default_restaurant_id FROM profiles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT default_restaurant_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

-- Service role can insert (from API routes)
CREATE POLICY "Service role can insert notifications"
  ON dashboard_notifications
  FOR INSERT
  WITH CHECK (true);

-- Grant to service_role
GRANT ALL ON dashboard_notifications TO service_role;
