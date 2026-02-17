-- ============================================================
-- MENIUS — Notification settings columns on restaurants table
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS notification_whatsapp TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN restaurants.notification_whatsapp IS 'WhatsApp phone number for receiving new order alerts';
COMMENT ON COLUMN restaurants.notification_email IS 'Email address for business notifications';
COMMENT ON COLUMN restaurants.notifications_enabled IS 'Master toggle for all notification channels';
