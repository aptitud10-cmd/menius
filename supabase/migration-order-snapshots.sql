-- ============================================================
-- MENIUS — Order Snapshots Migration
-- Adds product_name and variant_name snapshot columns to order_items
-- so historical orders are not affected by future menu edits.
--
-- Safe to run multiple times (IF NOT EXISTS / IF COLUMN DOESN'T EXIST).
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add snapshot columns to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_name TEXT DEFAULT '';

-- 2. Back-fill existing rows from the products / product_variants tables.
--    Two separate statements because PostgreSQL does not allow referencing the
--    updated table inside a FROM...JOIN clause in the same UPDATE statement.
UPDATE order_items
SET product_name = COALESCE(p.name, '')
FROM products p
WHERE p.id = order_items.product_id
  AND order_items.product_name = '';   -- only touch rows that haven't been filled yet

UPDATE order_items
SET variant_name = COALESCE(pv.name, '')
FROM product_variants pv
WHERE pv.id = order_items.variant_id
  AND order_items.variant_name = '';   -- only touch rows that haven't been filled yet
