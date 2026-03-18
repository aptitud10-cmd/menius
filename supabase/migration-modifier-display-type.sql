-- Add display_type column to modifier_groups
-- 'list' = vertical stacked list (default, works for all option lengths)
-- 'grid' = 2-column grid (recommended for short names like sizes or cheese types)
ALTER TABLE modifier_groups
  ADD COLUMN IF NOT EXISTS display_type TEXT NOT NULL DEFAULT 'list'
  CHECK (display_type IN ('list', 'grid'));
