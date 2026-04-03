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
--    Uses LEFT JOIN so rows where the product was deleted keep their empty string.
UPDATE order_items oi
SET
  product_name = COALESCE(p.name, ''),
  variant_name = COALESCE(pv.name, '')
FROM products p
LEFT JOIN product_variants pv ON pv.id = oi.variant_id
WHERE p.id = oi.product_id
  AND oi.product_name = '';   -- only touch rows that haven't been filled yet
