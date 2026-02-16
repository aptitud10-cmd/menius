-- ============================================================
-- MIGRATION: Staff / Team Members
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'kitchen')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_staff" ON staff_members
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

CREATE POLICY "staff_read_own" ON staff_members
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON staff_members(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff_members(user_id);
