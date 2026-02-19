-- ============================================================
-- MIGRATION: Restaurant Settings Columns
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
