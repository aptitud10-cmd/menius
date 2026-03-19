-- ============================================================
-- MENIUS — Order notification log
-- Records every outbound notification attempt so the counter
-- can show "last notified via WhatsApp · 3 min ago" and staff
-- can quickly see whether a customer was actually reached.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event         TEXT NOT NULL,          -- 'confirmed', 'ready', 'cancelled', etc.
  channel       TEXT NOT NULL,          -- 'whatsapp', 'sms', 'email', 'none'
  success       BOOLEAN NOT NULL,
  error_code    TEXT,                   -- e.g. 'whatsapp_failed_fallback_email'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Efficient lookups: latest notification for a given order
CREATE INDEX IF NOT EXISTS order_notification_log_order_id_idx
  ON order_notification_log (order_id, created_at DESC);

-- RLS: only authenticated users of the same restaurant can read
ALTER TABLE order_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_members_can_read_own_logs"
  ON order_notification_log FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- Service role (used by notifyStatusChange server-side) can insert freely
-- (No insert policy needed — inserts happen via the admin/service-role client)

COMMENT ON TABLE order_notification_log IS
  'Audit log of every outbound notification attempt (WhatsApp, SMS, email) per order';
