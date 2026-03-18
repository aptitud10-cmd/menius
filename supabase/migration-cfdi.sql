-- CFDI/SAT México: fiscal invoicing support

-- Store CFDI invoice requests from customers
CREATE TABLE IF NOT EXISTS cfdi_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rfc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  cfdi_use TEXT NOT NULL,
  regimen_fiscal TEXT NOT NULL,
  cp_domicilio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'error')),
  facturama_id TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cfdi_requests_order_id_idx ON cfdi_requests(order_id);
CREATE INDEX IF NOT EXISTS cfdi_requests_restaurant_id_idx ON cfdi_requests(restaurant_id);

-- Add fiscal data columns to restaurants for CFDI emission
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS fiscal_rfc TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_razon_social TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_regimen_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_lugar_expedicion TEXT;

-- RLS: only the restaurant owner can see their CFDI requests
ALTER TABLE cfdi_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "cfdi_requests_owner_read" ON cfdi_requests
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "cfdi_requests_insert_anon" ON cfdi_requests
  FOR INSERT WITH CHECK (true);
