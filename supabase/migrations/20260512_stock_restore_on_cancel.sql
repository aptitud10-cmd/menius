-- Restore stock_qty for each order_item when an order is cancelled.
-- Only restores items where the product has track_inventory = true.
-- Safe to run multiple times (idempotent guard via status check in trigger).

CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when transitioning INTO 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.products p
    SET stock_qty = p.stock_qty + oi.qty
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id
      AND p.track_inventory = true
      AND p.stock_qty IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;

CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_cancel();
