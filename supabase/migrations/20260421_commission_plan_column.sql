ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS commission_plan boolean NOT NULL DEFAULT false;
