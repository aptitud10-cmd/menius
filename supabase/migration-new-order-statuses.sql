-- New order statuses: almost_ready, out_for_delivery, served
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times

-- Drop the old CHECK constraint and replace with updated allowed values.
-- The constraint name in the original migration is inferred from the table DDL.
-- If the name is unknown, we drop by table scan:

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name)
  WHERE tc.table_name = 'orders'
    AND cc.check_clause LIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'preparing',
    'almost_ready',
    'ready',
    'out_for_delivery',
    'served',
    'delivered',
    'completed',
    'cancelled'
  ));
