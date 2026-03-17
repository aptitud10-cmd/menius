-- Proof-of-delivery photo URL stored on the order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;
