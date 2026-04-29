-- Sprint 1.1: Social proof badges — popularity ranking per restaurant
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS popularity_rank int,
  ADD COLUMN IF NOT EXISTS orders_last_7d int DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(restaurant_id, popularity_rank);
