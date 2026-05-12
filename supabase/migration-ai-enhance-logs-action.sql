-- Add 'action' column to ai_enhance_logs for tracking specific AI operations
-- Used to count lifetime free-plan import_menu uses per restaurant

ALTER TABLE public.ai_enhance_logs
  ADD COLUMN IF NOT EXISTS action TEXT;

-- Index for free-plan limit check: count imports per restaurant
CREATE INDEX IF NOT EXISTS idx_ai_enhance_logs_restaurant_action
  ON public.ai_enhance_logs (restaurant_id, action)
  WHERE action IS NOT NULL;
