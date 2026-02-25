-- Add inventory quantity tracking to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT false;

-- Auto-update in_stock based on quantity
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_inventory = true AND NEW.stock_qty IS NOT NULL THEN
    IF NEW.stock_qty <= 0 THEN
      NEW.in_stock := false;
    ELSIF OLD.stock_qty IS NOT NULL AND OLD.stock_qty <= 0 AND NEW.stock_qty > 0 THEN
      NEW.in_stock := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_status ON products;
CREATE TRIGGER trg_update_stock_status
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_status();

-- Decrement stock on order item insertion
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_qty = GREATEST(stock_qty - NEW.qty, 0)
  WHERE id = NEW.product_id
    AND track_inventory = true
    AND stock_qty IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_stock ON order_items;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock_on_order();

-- Index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (restaurant_id, stock_qty)
  WHERE track_inventory = true AND in_stock = true;
