ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS owner_response TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_response TEXT;
