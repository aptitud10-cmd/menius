-- Loyalty program: points per peso spent
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_phone  text NOT NULL,
  customer_email  text,
  customer_name   text,
  points          integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE (restaurant_id, customer_phone)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  order_id        uuid REFERENCES orders(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  points          integer NOT NULL,        -- positive = earn, negative = redeem
  description     text,
  created_at      timestamptz DEFAULT now()
);

-- Restaurant-level loyalty config stored in a separate table
CREATE TABLE IF NOT EXISTS loyalty_config (
  restaurant_id      uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  enabled            boolean DEFAULT false,
  points_per_peso    numeric(10,4) DEFAULT 1.0,  -- 1 point per peso spent
  min_redeem_points  integer DEFAULT 100,         -- minimum to redeem
  peso_per_point     numeric(10,4) DEFAULT 0.10,  -- 10 pts = $1 MXN
  welcome_points     integer DEFAULT 0,
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_restaurant ON loyalty_accounts (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_phone ON loyalty_accounts (restaurant_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account ON loyalty_transactions (account_id);

-- RLS
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_owner" ON loyalty_accounts
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));
CREATE POLICY "loyalty_tx_owner" ON loyalty_transactions
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));
CREATE POLICY "loyalty_config_owner" ON loyalty_config
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));
