-- Marketing campaigns log table
CREATE TABLE IF NOT EXISTS campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'whatsapp',
  audience        text NOT NULL DEFAULT 'all',
  message_preview text,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON campaigns (restaurant_id, created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_owner" ON campaigns
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));
